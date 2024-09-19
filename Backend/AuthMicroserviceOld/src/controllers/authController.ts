import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name, surname } = req.body;
      const user = await authService.register(email, password, name, surname);
      res.status(201).json({ message: 'User registered successfully', user });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const { accessToken, refreshToken } = await authService.login(email, password);
      res.status(200).json({ accessToken, refreshToken });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response) {
    // authService.logout();
    res.status(200).json({ message: 'User logged out successfully' });
  }
}