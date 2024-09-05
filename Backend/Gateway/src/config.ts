import dotenv from 'dotenv';

dotenv.config();

export const config = {
  authService: {
    baseUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:5000',
  },
  port: process.env.GATEWAY_PORT || 3001,
};
