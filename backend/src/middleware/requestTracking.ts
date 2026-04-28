import { randomUUID } from 'crypto';

import { Request, Response, NextFunction } from 'express';

import logger from '../utils/logger.js';

export interface RequestWithTracking extends Request {
  correlationId?: string;
  startTime?: number;
}

export function correlationIdMiddleware(
  req: RequestWithTracking,
  res: Response,
  next: NextFunction,
) {
  const correlationId = req.headers['x-correlation-id'] || randomUUID();
  req.correlationId = String(correlationId);
  res.setHeader('x-correlation-id', req.correlationId);
  next();
}

export function requestMetricsMiddleware(
  req: RequestWithTracking,
  res: Response,
  next: NextFunction,
) {
  req.startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || Date.now());
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
      correlationId: req.correlationId,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      query: req.query,
    });
  });

  next();
}
