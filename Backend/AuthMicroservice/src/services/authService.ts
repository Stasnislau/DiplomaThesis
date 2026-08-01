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
  AUTH_EMAIL_REQUIRED,
  throwWithCode,
} from "../utils/errorCodes";

const FAILED_LOGIN_LIMIT = 8;
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;
interface FailedAttempt {
  count: number;
  lastAttemptAt: number;
  lockedUntil: number;
}
const failedLogins = new Map<string, FailedAttempt>();
function failedKey(email: string): string {
  return email.trim().toLowerCase();
}

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
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
    if (typeof email !== "string" || email.trim() === "") {
      throwWithCode(
        AUTH_EMAIL_REQUIRED,
        HttpStatus.BAD_REQUEST,
        "Email is required",
      );
    }
    const key = failedKey(email);

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
