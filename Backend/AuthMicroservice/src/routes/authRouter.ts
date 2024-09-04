import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { passportService } from '../services/passwordService';
import { ParamsMiddleware } from '../middleware/ParamsMiddleware';
import { loginSchema } from '../models/requests/loginRequest';
import { registerSchema } from '../models/requests/registerRequest';

const router = Router();
const authController = new AuthController();

router.post(
  '/login',
  passportService.initialize(),
  passportService.session(),
  ParamsMiddleware.validateParams(loginSchema),
  (req, res, next) => authController.login(req, res, next)
);
router.post(
  '/register',
  ParamsMiddleware.validateParams(registerSchema),
  (req, res, next) => authController.register(req, res, next)
);
router.post('/logout', (req, res) => authController.logout(req, res));

export default router;
