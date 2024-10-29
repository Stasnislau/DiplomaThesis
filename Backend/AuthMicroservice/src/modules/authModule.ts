import { Module } from '@nestjs/common';
import { AuthService } from '../services/authService';
import { AuthController } from '../controllers/authController';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prismaService';
import { LocalStrategy } from '../strategies/localStrategy';
import { JwtStrategy } from '../strategies/jwtStrategy';
import config from '../config/configuration';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: config().jwt.secret,
      signOptions: { expiresIn: config().jwt.expiresIn },
    }),
  ],
  providers: [AuthService, PrismaService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
