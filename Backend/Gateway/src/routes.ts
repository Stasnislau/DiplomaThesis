import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from './config';

const router = Router();

router.use('/auth', createProxyMiddleware({
  target: config.authService.baseUrl,
  changeOrigin: true,
  pathRewrite: {
    '^/auth': '/api/auth',
  },
}));

export default router;
