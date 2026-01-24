import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { JwtPayload } from '../types.js';
import RedisCache from '../services/redis.js';
import { hasPermission, type Permission } from '../services/rbac.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Token Blacklist TTL (24 hours in seconds)
const BLACKLIST_TTL = 24 * 60 * 60;

export async function blacklistToken(token: string): Promise<void> {
  // Use the token as the key with a 'bl:' prefix
  await RedisCache.set(`bl:${token}`, '1', BLACKLIST_TTL);
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const result = await RedisCache.get(`bl:${token}`);
  return !!result;
}

/**
 * Token authentication middleware
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  // Check if token is blacklisted (user logged out)
  if (await isTokenBlacklisted(token)) {
    res.status(401).json({ error: 'Token has been revoked' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!hasPermission(req.user?.role, permission)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  if (await isTokenBlacklisted(token)) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = decoded;
  } catch (error) {
    // Invalid token is ignored for optional auth
  }

  next();
}
