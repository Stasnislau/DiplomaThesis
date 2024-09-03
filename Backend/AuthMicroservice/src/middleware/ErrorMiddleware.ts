import { Request, Response, NextFunction } from 'express';
import { AppError } from '../error/appError';
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      isOperational: err.isOperational,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  } else {
    console.error('Unexpected Error:', err);

    res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
};
