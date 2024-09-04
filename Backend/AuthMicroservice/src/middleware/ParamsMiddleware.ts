import { Request, Response, NextFunction } from 'express';
import { AppError } from '../error/appError';
import { AnySchema } from 'yup'; 
export class ParamsMiddleware {
  static validateParams(schema: AnySchema) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        await schema.validate({...req.body,...req.query, ...req.params}, { abortEarly: false });

        next();
      } catch (err: any) {
        next(new AppError(`${err.message}`, 400));
      }
    };
  }
}
