import crypto from 'crypto';

import { NextFunction, Request, Response } from 'express';

const REQUEST_ID_HEADER = 'x-request-id';

const normalizeHeaderValue = (value: string | string[] | undefined): string | null => {
  if (!value) return null;
  const selected = Array.isArray(value) ? value[0] : value;
  const trimmed = selected?.trim();
  return trimmed ? trimmed.slice(0, 128) : null;
};

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const incomingId = normalizeHeaderValue(req.headers[REQUEST_ID_HEADER] as string | string[] | undefined);
  const requestId = incomingId ?? crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};
