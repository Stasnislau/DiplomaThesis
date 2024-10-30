import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prismaService";
import * as bcrypt from "bcrypt";
import { User, RefreshToken } from "@prisma/client";
import config from "../config/configuration";
import { UserDto } from "src/dtos/userDto";
import { v4 as uuidv4 } from "uuid";
import { Injectable, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { LoginDto } from "src/dtos/loginDto";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    console.log(email, password, 'HUI 1');
    const user = await this.prisma.user.findUnique({ where: { email } });
    console.log(user, 'HUI 2');
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
      throw new UnauthorizedException("Invalid credentials");
    }
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user);
    return {
      accessToken,
      refreshToken,
    };
  }

  async register(userDto: UserDto) {
    const hashedPassword = await bcrypt.hash(userDto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: userDto.email,
        name: userDto.name,
        surname: userDto.surname,
        role: "USER",
        credentials: {
          create: {
            password: hashedPassword,
          },
        },
      },
    });
    const refreshToken = await this.createRefreshToken(user);

    const accessToken = this.generateAccessToken(user);

    return {
      accessToken,
      refreshToken,
    };
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
      throw new BadRequestException("Refresh token is required");
    }
    const refreshTokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!refreshTokenRecord) {
      throw new BadRequestException("Invalid refresh token");
    }

    const payload = this.jwtService.verify(refreshToken, {
      secret: config().refreshToken.secret,
    });
    if (payload.exp < Date.now() / 1000) {
      throw new BadRequestException("Refresh token expired");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException();
    }

    const accessToken = this.jwtService.sign({
      email: user.email,
      sub: user.id,
      role: user.role,
    });

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

  async resetPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException();
    }
    const newPassword = uuidv4();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.credentials.update({
      where: { userId: user.id },
      data: { password: hashedPassword },
    });
    return newPassword;
  }

  private async shouldRefreshToken(refreshToken: string): Promise<boolean> {
    const payload = this.jwtService.verify(refreshToken, {
      secret: config().refreshToken.secret,
    });
    return payload.exp < Date.now() / 1000;
  }
}
