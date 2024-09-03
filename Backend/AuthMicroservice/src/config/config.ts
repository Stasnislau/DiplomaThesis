import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
  },
  jwtSecret: process.env.JWT_SECRET || 'MYSECRET',
  sessionSecret: process.env.SESSION_SECRET || 'MYSUPERSECRET',
};
