import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import config from '../config/configuration';

@Injectable()
export class JwtPayloadMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) { }

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = this.jwtService.verify(token, { secret: config().jwt.secret });
      req['user'] = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      }
      if (!payload) {
        throw new UnauthorizedException("Authorization failed");
      }
    }
    next();
  }
} 