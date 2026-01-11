import { JwtService } from '@nestjs/jwt';
import config from '../../src/config/configuration';
import { Role } from '@prisma/client';

export const createTestJwtToken = (userId: string, email: string, role: Role = Role.USER): string => {
  const jwtService = new JwtService({
    secret: config().jwt.secret,
  });

  return jwtService.sign(
    {
      email,
      sub: userId,
      role,
    },
    {
      expiresIn: '1h',
    },
  );
};

export const createTestRefreshToken = (userId: string, email: string): string => {
  const jwtService = new JwtService({
    secret: config().refreshToken.secret,
  });

  return jwtService.sign(
    {
      email,
      sub: userId,
    },
    {
      expiresIn: '7d',
    },
  );
};
