import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, User } from '@prisma/client';
import { config } from '../config/config';

class AuthService {
  prisma: PrismaClient;
  constructor() {
    this.prisma = new PrismaClient();
  }
  async register(
    email: string,
    password: string,
    name: string,
    surname: string
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        surname,
        role: 'USER',
        credentials: {
          create: {
            password: hashedPassword,
          },
        },
      },
    });

    return user;
  }

  async login(
    email: string,
    password: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { email },
      include: {
        credentials: true,
      },
    });

    if (!user || !user.credentials) {
      throw new Error('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.credentials.password
    );

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });

    return { accessToken, refreshToken };
  }

  logout(userId: string): boolean {
    this.prisma.refreshToken.deleteMany({ where: { userId } });
    return true;
  }

  private generateAccessToken(userId: string): string {
    return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '15m' });
  }

  private generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, config.refreshTokenSecret, { expiresIn: '7d' });
  }
}

export const authService = new AuthService();
