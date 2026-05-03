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
  AUTH_REFRESH_TOKEN_EXPIRED,
  AUTH_REFRESH_TOKEN_INVALID,
  AUTH_REFRESH_TOKEN_REQUIRED,
  AUTH_USER_NOT_FOUND,
  throwWithCode,
} from "../utils/errorCodes";

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

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throwWithCode(
        AUTH_INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
        "Invalid email or password",
      );
    }
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user);
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
    await lastValueFrom(
      this.eventService.emit("user.created", {
        id: user.id,
        email: user.email,
        name: userDto.name,
        surname: userDto.surname,
        role: user.role,
        createdAt: user.createdAt,
      })
    );

    return true;
  }

  async createRefreshToken(user: User): Promise<string> {
    const token = this.jwtService.sign(
      { email: user.email, sub: user.id },
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

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throwWithCode(
        AUTH_REFRESH_TOKEN_REQUIRED,
        HttpStatus.BAD_REQUEST,
        "Refresh token is required",
      );
    }
    const refreshTokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!refreshTokenRecord) {
      throwWithCode(
        AUTH_REFRESH_TOKEN_INVALID,
        HttpStatus.BAD_REQUEST,
        "Invalid refresh token",
      );
    }

    const payload = this.jwtService.verify(refreshToken, {
      secret: config().refreshToken.secret,
    });
    if (payload.exp < Date.now() / 1000) {
      throwWithCode(
        AUTH_REFRESH_TOKEN_EXPIRED,
        HttpStatus.BAD_REQUEST,
        "Refresh token expired",
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

    const shouldRefreshToken = await this.shouldRefreshToken(refreshToken);
    const newRefreshToken = shouldRefreshToken
      ? await this.createRefreshToken(user)
      : undefined;

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
