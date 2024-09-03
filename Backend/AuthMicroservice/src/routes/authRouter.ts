import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { passportService } from '../services/passwordService';

const router = Router();
const authController = new AuthController();

router.post('/login', passportService.initialize(), passportService.session(), (req, res, next) => authController.login(req, res, next));
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/logout', (req, res) => authController.logout(req, res));

export default router;
