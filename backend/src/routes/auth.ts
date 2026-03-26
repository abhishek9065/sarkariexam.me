import express from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';

import { config } from '../config.js';
import { AUTH_COOKIE_NAME, blacklistToken, isTokenBlacklisted } from '../middleware/auth.js';
import { clearCsrfCookie, ensureCsrfCookie, setCsrfCookie } from '../middleware/csrf.js';
import {
  bruteForceProtection,
  clearFailedLoginsWithEmail,
  getClientIP,
} from '../middleware/security.js';
import { UserModelMongo } from '../models/users.mongo.js';
import { recordAnalyticsEvent } from '../services/analytics.js';
import { checkPasswordSecurity } from '../services/passwordSecurity.js';
import type { JwtPayload } from '../types.js';

const router = express.Router();

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const registerSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: passwordSchema,
  name: z.string().min(2).max(100).trim(),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

const buildJwtOptions = (expiresIn: SignOptions['expiresIn']): SignOptions => {
  const options: SignOptions = { expiresIn };
  if (config.jwtIssuer) options.issuer = config.jwtIssuer;
  if (config.jwtAudience) options.audience = config.jwtAudience;
  return options;
};

const expiryToMs = (expiresIn: SignOptions['expiresIn']): number | undefined => {
  if (typeof expiresIn === 'number') return expiresIn * 1000;
  if (typeof expiresIn !== 'string') return undefined;
  const match = expiresIn.trim().match(/^(\d+)\s*([smhd])$/i);
  if (!match) return undefined;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = unit === 's'
    ? 1000
    : unit === 'm'
      ? 60 * 1000
      : unit === 'h'
        ? 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;
  return amount * multiplier;
};

const setAuthCookie = (
  res: express.Response,
  token: string,
  expiresIn: SignOptions['expiresIn']
) => {
  const maxAge = expiryToMs(expiresIn);
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
    ...(maxAge ? { maxAge } : {}),
  });
  setCsrfCookie(res);
};

const getBearerToken = (req: express.Request): string | undefined => {
  const authHeader = req.headers.authorization;
  return authHeader ? authHeader.split(' ')[1] : undefined;
};

const getAuthToken = (req: express.Request): string | undefined =>
  getBearerToken(req) || (req as any).cookies?.[AUTH_COOKIE_NAME];

const verifyJwtToken = (token: string): JwtPayload => {
  const verifyOptions: jwt.VerifyOptions = {};
  if (config.jwtIssuer) verifyOptions.issuer = config.jwtIssuer;
  if (config.jwtAudience) verifyOptions.audience = config.jwtAudience;
  return jwt.verify(token, config.jwtSecret, verifyOptions) as JwtPayload;
};

router.get('/csrf', (req, res) => {
  const csrfToken = ensureCsrfCookie(req, res);
  res.set('Cache-Control', 'no-store');
  return res.json({ data: { csrfToken } });
});

router.post('/register', async (req, res) => {
  try {
    const validated = registerSchema.parse(req.body);
    const passwordSecurity = await checkPasswordSecurity(validated.password);
    if (passwordSecurity.breached) {
      return res.status(400).json({
        error: 'weak_password',
        message: 'Choose a stronger password that has not appeared in known breach datasets.',
      });
    }

    const existingUser = await UserModelMongo.findByEmail(validated.email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered. Please log in.' });
    }

    const user = await UserModelMongo.create({
      email: validated.email,
      username: validated.name,
      password: validated.password,
      role: 'user',
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      buildJwtOptions(config.jwtExpiry as SignOptions['expiresIn'])
    );

    setAuthCookie(res, token, config.jwtExpiry as SignOptions['expiresIn']);

    recordAnalyticsEvent({
      type: 'auth_register',
      userId: user.id,
    }).catch(console.error);

    return res.status(201).json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.username,
          role: user.role,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', bruteForceProtection, async (req, res) => {
  const clientIP = getClientIP(req);

  try {
    const validated = loginSchema.parse(req.body);
    const user = await UserModelMongo.verifyPassword(validated.email, validated.password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await clearFailedLoginsWithEmail(clientIP, validated.email);

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      buildJwtOptions(config.jwtExpiry as SignOptions['expiresIn'])
    );

    setAuthCookie(res, token, config.jwtExpiry as SignOptions['expiresIn']);

    return res.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.username,
          role: user.role,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    console.error('[Auth] Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', async (req, res) => {
  const token = getAuthToken(req);
  if (token) {
    await blacklistToken(token);
  }

  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  });
  clearCsrfCookie(res);

  return res.json({ message: 'Logged out successfully' });
});

router.get('/me', async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const decoded = verifyJwtToken(token);
    const user = await UserModelMongo.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User account deactivated' });
    }

    ensureCsrfCookie(req, res);

    return res.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.username,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },
      },
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Session expired', code: 'TOKEN_EXPIRED' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid session', code: 'TOKEN_INVALID' });
    }
    console.error('[Auth] Current user error:', error);
    return res.status(500).json({ error: 'Failed to load user' });
  }
});

export default router;
