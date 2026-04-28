import type { NextFunction, Request, Response } from 'express';
import jwt, { type VerifyOptions } from 'jsonwebtoken';

import { config } from '../config.js';
import { UserModelPostgres } from '../models/users.postgres.js';
import RedisCache from '../services/redis.js';
import type { JwtPayload } from '../types.js';

export const AUTH_COOKIE_NAME = 'auth_token';
export const EDITORIAL_ROLES = ['editor', 'reviewer', 'admin', 'superadmin'] as const;

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
    requestId?: string;
  }
}

const BLACKLIST_TTL = 24 * 60 * 60;

const getTokenTtlSeconds = (token: string): number => {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (!decoded?.exp) return BLACKLIST_TTL;
    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp - now;
    return ttl > 0 ? ttl : 0;
  } catch {
    return BLACKLIST_TTL;
  }
};

const readBearerToken = (req: Request): string | undefined => {
  const authHeader = req.headers.authorization;
  return authHeader ? authHeader.split(' ')[1] : undefined;
};

const readAuthToken = (req: Request): string | undefined =>
  readBearerToken(req) || (req as any).cookies?.[AUTH_COOKIE_NAME];

const verifyToken = (token: string): JwtPayload => {
  const verifyOptions: VerifyOptions = {};
  if (config.jwtIssuer) verifyOptions.issuer = config.jwtIssuer;
  if (config.jwtAudience) verifyOptions.audience = config.jwtAudience;
  return jwt.verify(token, config.jwtSecret, verifyOptions) as JwtPayload;
};

export async function blacklistToken(token: string): Promise<void> {
  const ttl = getTokenTtlSeconds(token);
  await RedisCache.set(`bl:${token}`, '1', ttl || BLACKLIST_TTL);
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const result = await RedisCache.get(`bl:${token}`);
  return !!result;
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = readAuthToken(req);
  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  if (await isTokenBlacklisted(token)) {
    res.status(401).json({ error: 'Token has been revoked' });
    return;
  }

  try {
    const decoded = verifyToken(token);
    const user = await UserModelPostgres.findById(decoded.userId);
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'User account deactivated' });
      return;
    }

    decoded.role = user.role;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token', code: 'TOKEN_INVALID' });
      return;
    }
    console.error('[Auth] Token verification error:', error);
    res.status(403).json({ error: 'Token verification failed' });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = readAuthToken(req);
  if (!token) {
    next();
    return;
  }

  if (await isTokenBlacklisted(token)) {
    next();
    return;
  }

  try {
    const decoded = verifyToken(token);
    const user = await UserModelPostgres.findById(decoded.userId);
    if (user?.isActive) {
      decoded.role = user.role;
      req.user = decoded;
    }
  } catch {
    // Invalid token is ignored for optional auth.
  }

  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

export function requireEditorialAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !EDITORIAL_ROLES.includes(req.user.role as (typeof EDITORIAL_ROLES)[number])) {
    res.status(403).json({ error: 'Editorial access required' });
    return;
  }
  next();
}

export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function requirePermission(_permission: string) {
  return (_req: Request, res: Response, _next: NextFunction): void => {
    res.status(410).json({ error: 'Administrative functionality has been removed' });
  };
}

export function requireAdminStepUp(_req: Request, res: Response, _next: NextFunction): void {
  res.status(410).json({ error: 'Administrative functionality has been removed' });
}
