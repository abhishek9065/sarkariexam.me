import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import logger from '../utils/logger.js';
import { ErrorTracking } from '../services/errorTracking.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.headersSent) {
    return next(err);
  }

  // Zod Validation Errors
  if (err instanceof ZodError) {
    logger.warn({ err: err.message, path: req.path }, 'Validation Error');
    return res.status(400).json({
      status: 'fail',
      error: 'Validation Error',
      details: err.flatten(),
    });
  }

  // App Operational Errors
  if (err instanceof AppError) {
    if (err.isOperational) {
      logger.warn({ err: err.message, statusCode: err.statusCode }, `Operational Error: ${err.message}`);
      return res.status(err.statusCode).json({
        status: 'fail',
        error: err.message,
      });
    }
  }

  // Fallback for unknown/programming errors
  logger.error({ err }, 'Unhandled Exception');
  
  // Track in Sentry
  ErrorTracking.captureException(err, {
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  return res.status(500).json({
    status: 'error',
    error: 'Internal Server Error',
  });
};
