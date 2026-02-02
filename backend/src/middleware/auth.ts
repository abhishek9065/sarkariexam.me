import { Request, Response, NextFunction } from 'express';
import jwt, { VerifyOptions } from 'jsonwebtoken';

import { config } from '../config.js';
import { UserModelMongo } from '../models/users.mongo.js';
import { hasPermission, type Permission } from '../services/rbac.js';
import { touchAdminSession } from '../services/adminSessions.js';
import RedisCache from '../services/redis.js';
import { JwtPayload } from '../types.js';

export const AUTH_COOKIE_NAME = 'auth_token';
export const ADMIN_AUTH_COOKIE_NAME = config.adminAuthCookieName;

// Extend Express Request type to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Token Blacklist TTL fallback (24 hours in seconds)
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

export async function blacklistToken(token: string): Promise<void> {
  // Use the token as the key with a 'bl:' prefix
  const ttl = getTokenTtlSeconds(token);
  await RedisCache.set(`bl:${token}`, '1', ttl || BLACKLIST_TTL);
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
  const headerToken = authHeader && authHeader.split(' ')[1];
  const cookieToken = (req as any).cookies?.[AUTH_COOKIE_NAME];
  const adminCookieToken = (req as any).cookies?.[ADMIN_AUTH_COOKIE_NAME];
  const token = headerToken || adminCookieToken || cookieToken;

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
    const verifyOptions: VerifyOptions = {};
    if (config.jwtIssuer) verifyOptions.issuer = config.jwtIssuer;
    if (config.jwtAudience) verifyOptions.audience = config.jwtAudience;
    const decoded = jwt.verify(token, config.jwtSecret, verifyOptions) as JwtPayload;
    if (decoded.twoFactorSetup) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }
    
    // Validate user still exists and is active
    if (decoded.userId) {
      const user = await UserModelMongo.findById(decoded.userId);
      if (!user || !user.isActive) {
        res.status(401).json({ error: 'User account deactivated' });
        return;
      }
      // Update decoded with latest user data to prevent stale role issues
      decoded.role = user.role;
    }

    if (decoded.role === 'admin' && decoded.sessionId) {
      const exp = (decoded as any).exp;
      const expiresAt = exp ? new Date(exp * 1000) : null;
      touchAdminSession(decoded.sessionId, {
        userId: decoded.userId,
        email: decoded.email,
        ip: req.ip,
        userAgent: req.headers['user-agent']?.toString() || 'Unknown',
        expiresAt,
      }, req.originalUrl);
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token', code: 'TOKEN_INVALID' });
    } else {
      console.error('[Auth] Token verification error:', error);
      res.status(403).json({ error: 'Token verification failed' });
    }
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  if (req.user.role !== 'admin') {
    console.warn(`[Auth] Non-admin access attempt to admin endpoint: ${req.user.email} (${req.user.role}) to ${req.originalUrl}`);
    res.status(403).json({ 
      error: 'Admin access required',
      message: 'Your account does not have administrative privileges'
    });
    return;
  }
  
  next();
}

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.role === 'admin' && config.adminRequire2FA && !req.user?.twoFactorVerified) {
      res.status(403).json({ error: 'two_factor_required', message: 'Two-factor authentication required' });
      return;
    }
    if (!hasPermission(req.user?.role, permission)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  const cookieToken = (req as any).cookies?.[AUTH_COOKIE_NAME];
  const adminCookieToken = (req as any).cookies?.[ADMIN_AUTH_COOKIE_NAME];
  const token = headerToken || adminCookieToken || cookieToken;

  if (!token) {
    next();
    return;
  }

  if (await isTokenBlacklisted(token)) {
    next();
    return;
  }

  try {
    const verifyOptions: VerifyOptions = {};
    if (config.jwtIssuer) verifyOptions.issuer = config.jwtIssuer;
    if (config.jwtAudience) verifyOptions.audience = config.jwtAudience;
    const decoded = jwt.verify(token, config.jwtSecret, verifyOptions) as JwtPayload;
    if (decoded.twoFactorSetup) {
      next();
      return;
    }
    req.user = decoded;
  } catch {
    // Invalid token is ignored for optional auth
  }

  next();
}
