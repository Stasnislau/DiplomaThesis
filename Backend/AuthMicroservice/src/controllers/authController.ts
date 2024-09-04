import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { User } from '@prisma/client';
import { BaseResponse } from '../types/baseResponse';
import { LoginRequest } from '../models/requests/loginRequest';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const user = await this.authService.findUserByEmail(email);

      if (!user || !(await this.authService.validatePassword(user, password))) {
        res.status(401).json({ message: 'Invalid email or password' });
        return;
      }

      req.logIn(user, (err) => {
        if (err) return next(err);
        res.status(200).json({ message: 'Login successful' });
      });
    } catch (err) {
      next(err);
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, surname, email, password } = req.body;
      const user = await this.authService.createUser(email, password, name, surname);
      res.status(201).json({
        success: true,
        payload: user,
      } as BaseResponse<User>);
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: 'Error logging out' });
      res.status(200).json({ message: 'Logout successful' });
    });
  }
}
