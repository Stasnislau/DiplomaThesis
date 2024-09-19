import { Request, Response, NextFunction } from 'express';
import { AppError } from '../error/appError';
import { BaseError } from '../types/baseError';
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      payload: {
        isOperational: err.isOperational,
        status: 'error',
        message: err.message,
      },
    } as BaseError);
  } else {
    console.error('Unexpected Error:', err);

    res.status(500).json({
      success: false,
      payload: {
        status: 'error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        message: 'Something went wrong',
      },
    } as BaseError);
  }
};
