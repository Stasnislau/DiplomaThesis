import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prismaService";
import * as bcrypt from "bcrypt";
import { Role, User } from "@prisma/client";
import config from "../config/configuration";
import { UserDto } from "src/dtos/userDto";
import { v4 as uuidv4 } from "uuid";
import {
  Injectable,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { LoginDto } from "src/dtos/loginDto";
import { Inject } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { lastValueFrom } from "rxjs";
import {
  AUTH_EMAIL_TAKEN,
  AUTH_INVALID_CREDENTIALS,
  AUTH_INVALID_OLD_PASSWORD,
  AUTH_RATE_LIMITED,
  AUTH_REFRESH_TOKEN_EXPIRED,
  AUTH_REFRESH_TOKEN_INVALID,
  AUTH_REFRESH_TOKEN_REQUIRED,
  AUTH_USER_NOT_FOUND,
  throwWithCode,
} from "../utils/errorCodes";

/**
 * In-memory failed-login tracker. Keyed by lowercased email so the
 * limit applies per account, not per IP — a botnet pivoting across
 * IPs against the same email still trips it. Counter resets on a
 * successful login OR after WINDOW_MS of inactivity.
 *
 * This is process-local (single Auth replica is the deploy
 * assumption); a multi-replica deploy needs Redis here.
 */
const FAILED_LOGIN_LIMIT = 8;
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;
interface FailedAttempt {
  count: number;
  // Wall-clock time of the most recent failed attempt. Used to tell
  // whether the user is still inside the rolling 15-minute window —
  // gap of >WINDOW_MS resets the counter.
  lastAttemptAt: number;
  // 0 when not locked. Otherwise: timestamp the lock expires.
  lockedUntil: number;
}
const failedLogins = new Map<string, FailedAttempt>();
function failedKey(email: string): string {
  return email.trim().toLowerCase();
}

/* Per-email password-reset throttle. Without this, any anonymous
 * caller can spam /resetPassword for a victim's email and blast their
 * inbox while silently rotating their password (since reset really
 * does mutate the credentials row). One request per 5 minutes per
 * email is more than enough for a real "I forgot" flow. */
const RESET_WINDOW_MS = 5 * 60 * 1000;
const resetAttempts = new Map<string, number>();

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    @Inject("EVENT_SERVICE") private readonly eventService: ClientProxy
  ) {}

  async onModuleInit() {
    await this.eventService.connect();
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      const credentials = await this.prisma.credentials.findUnique({
        where: { userId: user.id },
      });
      if (credentials) {
        const passwordMatch = await bcrypt.compare(
          password,
          credentials.password
        );
        if (passwordMatch) {
          return user;
        }
      }
    }
    return null;
  }

  async login(loginDto: LoginDto, fingerprint?: string) {
    const key = failedKey(loginDto.email);
    const now = Date.now();
    const tracked = failedLogins.get(key);
    if (tracked && tracked.lockedUntil > now) {
      throwWithCode(
        AUTH_RATE_LIMITED,
        HttpStatus.TOO_MANY_REQUESTS,
        "Too many failed attempts; try again later.",
      );
    }

    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      // Roll forward the per-email failure counter. If the previous
      // failure was within the last WINDOW_MS, increment; otherwise
      // start a fresh window. The counter only triggers a lock when
      // it crosses LIMIT — every failure before that is just a wrong
      // password (UNAUTHORIZED), not a rate-limit (TOO_MANY).
      //
      // Previous bug: both branches of the lock-vs-no-lock ternary
      // wrote `now + WINDOW_MS` to lockedUntil, so a single typo
      // locked the user out for 15 minutes. Now `lockedUntil` only
      // gets a non-zero value when count >= LIMIT.
      const insideWindow =
        !!tracked && now - tracked.lastAttemptAt < FAILED_LOGIN_WINDOW_MS;
      const attempt: FailedAttempt = insideWindow
        ? { ...tracked!, lastAttemptAt: now }
        : { count: 0, lastAttemptAt: now, lockedUntil: 0 };
      attempt.count += 1;
      if (attempt.count >= FAILED_LOGIN_LIMIT) {
        attempt.lockedUntil = now + FAILED_LOGIN_WINDOW_MS;
      }
      failedLogins.set(key, attempt);
      throwWithCode(
        AUTH_INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
        "Invalid email or password",
      );
    }
    failedLogins.delete(key);
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user, fingerprint);
    return {
      accessToken,
      refreshToken,
    };
  }

  async register(userDto: UserDto): Promise<boolean> {
    const hashedPassword = await bcrypt.hash(userDto.password, 10);
    const emailExists = await this.prisma.user.findUnique({
      where: { email: userDto.email },
    });
    if (emailExists) {
      throwWithCode(
        AUTH_EMAIL_TAKEN,
        HttpStatus.CONFLICT,
        "User with this email already exists",
      );
    }
    const user = await this.prisma.user.create({
      data: {
        email: userDto.email,
        role: "USER",
        credentials: {
          create: {
            password: hashedPassword,
          },
        },
      },
    });

    // Fire-and-forget the event. Awaiting `lastValueFrom(emit(...))`
    // here would block the HTTP response on a RabbitMQ ACK — when the
    // broker is restarting, register hangs for ~200s and the second
    // retry then sees AUTH_EMAIL_TAKEN. The User microservice does
    // a lazy upsert on /me when the profile row is missing, so a
    // dropped event is not catastrophic — the row appears on first
    // load instead.
    this.eventService
      .emit("user.created", {
        id: user.id,
        email: user.email,
        name: userDto.name,
        surname: userDto.surname,
        role: user.role,
        createdAt: user.createdAt,
      })
      .subscribe({
        error: (err) =>
          this.logger.warn(
            `user.created event emit failed for ${user.id}: ${err?.message ?? err}`,
          ),
      });

    return true;
  }

  /**
   * SHA-256 of (User-Agent ‖ first-IP-from-XFF). Bound into the
   * refresh token as the `dvc` claim, then re-checked on /refresh —
   * a token stolen from one machine can't be replayed from another
   * because the fingerprint won't match.
   *
   * It's a heuristic, not a hard guarantee (UA can be spoofed, IP
   * can change behind NAT) — but it raises the bar from "any
   * exfiltrated cookie wins" to "you also need to puppet the
   * victim's exact client headers".
   */
  static deviceFingerprint(userAgent: string, ip: string): string {
    const crypto = require("crypto") as typeof import("crypto");
    return crypto
      .createHash("sha256")
      .update(`${userAgent}${ip}`)
      .digest("hex");
  }

  async createRefreshToken(user: User, fingerprint?: string): Promise<string> {
    const token = this.jwtService.sign(
      { email: user.email, sub: user.id, dvc: fingerprint ?? "" },
      {
        secret: config().refreshToken.secret,
        expiresIn: config().refreshToken.expiresIn,
      }
    );

    await this.prisma.refreshToken.create({
      data: {
        token: token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return token;
  }

  generateAccessToken(user: User) {
    return this.jwtService.sign(
      {
        email: user.email,
        sub: user.id,
        role: user.role,
      },
      {
        secret: config().jwt.secret,
        expiresIn: config().jwt.expiresIn,
      }
    );
  }

  async refreshToken(refreshToken: string, fingerprint?: string) {
    if (!refreshToken) {
      throwWithCode(
        AUTH_REFRESH_TOKEN_REQUIRED,
        HttpStatus.BAD_REQUEST,
        "Refresh token is required",
      );
    }

    // Verify the JWT signature/exp BEFORE the DB lookup so we never
    // reveal which tokens exist in our store via timing.
    let payload: { sub: string; email: string; exp: number; dvc?: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: config().refreshToken.secret,
      });
    } catch {
      throwWithCode(
        AUTH_REFRESH_TOKEN_INVALID,
        HttpStatus.BAD_REQUEST,
        "Invalid refresh token",
      );
    }
    if (payload.exp < Date.now() / 1000) {
      throwWithCode(
        AUTH_REFRESH_TOKEN_EXPIRED,
        HttpStatus.BAD_REQUEST,
        "Refresh token expired",
      );
    }

    const refreshTokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!refreshTokenRecord) {
      // The JWT verifies but no row exists for it in our store.
      // That's a re-use of a token that was already rotated away —
      // either the legitimate user is replaying an old request OR
      // someone stole the token after rotation. We can't tell, so we
      // fail safe: revoke the entire token family for this user and
      // force a fresh login.
      await this.prisma.refreshToken.deleteMany({
        where: { userId: payload.sub },
      });
      this.logger.warn(
        `Refresh-token reuse detected for user=${payload.sub}; revoked all sessions`,
      );
      throwWithCode(
        AUTH_REFRESH_TOKEN_INVALID,
        HttpStatus.BAD_REQUEST,
        "Invalid refresh token",
      );
    }

    // Device-binding check: if the token was minted with a `dvc`
    // claim and the current request's fingerprint disagrees, treat
    // it like a stolen-cookie replay. Empty/legacy claim is
    // tolerated so existing sessions don't break.
    if (
      payload.dvc &&
      fingerprint &&
      payload.dvc !== fingerprint
    ) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: payload.sub },
      });
      this.logger.warn(
        `Refresh-token device mismatch for user=${payload.sub}; revoked all sessions`,
      );
      throwWithCode(
        AUTH_REFRESH_TOKEN_INVALID,
        HttpStatus.BAD_REQUEST,
        "Invalid refresh token",
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throwWithCode(
        AUTH_USER_NOT_FOUND,
        HttpStatus.UNAUTHORIZED,
        "User not found for this token",
      );
    }

    const accessToken = this.generateAccessToken(user);
    const shouldRotate = await this.shouldRefreshToken(refreshToken);

    let newRefreshToken: string | undefined;
    if (shouldRotate) {
      // Atomically delete the old token and create the new one. If
      // anything in this transaction throws, the old token survives
      // and the user can retry; what we never want is "old gone, new
      // also failed to persist" — that bricks the session.
      newRefreshToken = await this.prisma.$transaction(async (tx) => {
        await tx.refreshToken.delete({
          where: { token: refreshToken },
        });
        const next = this.jwtService.sign(
          { email: user.email, sub: user.id, dvc: fingerprint ?? payload.dvc ?? "" },
          {
            secret: config().refreshToken.secret,
            expiresIn: config().refreshToken.expiresIn,
          },
        );
        await tx.refreshToken.create({
          data: {
            token: next,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
        return next;
      });
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async removeRefreshToken(token: string) {
    await this.prisma.refreshToken.delete({ where: { token } });
  }

  async updateUserRole(userData: { id: string; role: Role }) {
    await this.prisma.user.update({
      where: { id: userData.id },
      data: { role: userData.role },
    });

    await lastValueFrom(
      this.eventService.emit("user.updatedRole", {
        id: userData.id,
        role: userData.role,
      })
    );
  }

  async resetPassword(email: string) {
    const key = failedKey(email);

    // Per-email throttle: one reset every RESET_WINDOW_MS. Without it,
    // anyone can spam a victim's inbox AND silently rotate their
    // password every few seconds. Check this BEFORE the user lookup so
    // existence-vs-non-existence enumeration is also slowed down.
    const lastAt = resetAttempts.get(key);
    const now = Date.now();
    if (lastAt && now - lastAt < RESET_WINDOW_MS) {
      const retryAfter = Math.ceil((RESET_WINDOW_MS - (now - lastAt)) / 1000);
      throwWithCode(
        AUTH_RATE_LIMITED,
        HttpStatus.TOO_MANY_REQUESTS,
        `Reset already requested. Try again in ${retryAfter}s.`,
      );
    }
    resetAttempts.set(key, now);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throwWithCode(
        AUTH_USER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        "No account found for that email",
      );
    }
    const newPassword = uuidv4();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.credentials.update({
      where: { userId: user.id },
      data: { password: hashedPassword },
    });

    await lastValueFrom(
      this.eventService.emit("password.reset", {
        id: user.id,
        email: user.email,
        newPassword: newPassword,
      })
    );

    return newPassword;
  }

  private async shouldRefreshToken(refreshToken: string): Promise<boolean> {
    const payload = this.jwtService.verify(refreshToken, {
      secret: config().refreshToken.secret,
    });
    // Rotate when less than half the lifetime remains (< 3.5 days of 7)
    const halfLife = 7 * 24 * 60 * 60 * 0.5;
    const remaining = payload.exp - Date.now() / 1000;
    return remaining < halfLife;
  }

  async deleteUser(userData: { id: string }) {
    await this.prisma.user.delete({ where: { id: userData.id } });

    await lastValueFrom(
      this.eventService.emit("user.deleted", {
        id: userData.id,
      })
    );
  }

  async getAllUsers() {
    return await this.prisma.user.findMany();
  }

  async updatePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throwWithCode(
        AUTH_USER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        "User not found",
      );
    }
    // Authorization: JWT guard ensures userId === requesting user's id.
    // Old-password check below prevents unauthorized changes.
    const credentials = await this.prisma.credentials.findUnique({
      where: { userId: userId },
    });
    if (
      !credentials ||
      !(await bcrypt.compare(oldPassword, credentials.password))
    ) {
      throwWithCode(
        AUTH_INVALID_OLD_PASSWORD,
        HttpStatus.BAD_REQUEST,
        "Invalid old password",
      );
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.credentials.update({
      where: { userId: userId },
      data: { password: hashedNewPassword },
    });
  }
}
