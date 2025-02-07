import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "src/types/AuthenticatedRequest";
@Injectable()
export class UserDataMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    req.user = {
      id: req.headers["x-user-id"] as string,
      email: req.headers["x-user-email"] as string,
      role: req.headers["x-user-role"] as string,

    };
    next();
  }
}
