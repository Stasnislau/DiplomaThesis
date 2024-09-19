import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
  },
  jwtSecret: process.env.JWT_SECRET || 'MYSECRET',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'MYSUPERSECRET',
};
