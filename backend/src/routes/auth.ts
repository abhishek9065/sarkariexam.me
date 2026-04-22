import express from 'express';
import { rateLimit as expressRateLimit } from 'express-rate-limit';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';

import { config } from '../config.js';
import { AUTH_COOKIE_NAME, authenticateToken, blacklistToken } from '../middleware/auth.js';
import { clearCsrfCookie, ensureCsrfCookie, setCsrfCookie } from '../middleware/csrf.js';
import { rateLimit } from '../middleware/rateLimit.js';
import {
  bruteForceProtection,
  clearFailedLoginsWithEmail,
  getClientIP,
  recordFailedLoginWithEmail,
} from '../middleware/security.js';
import AuditLogModelPostgres from '../models/auditLogs.postgres.js';
import { UserModelMongo } from '../models/users.mongo.js';
import { recordAnalyticsEvent } from '../services/analytics.js';
import { sendPasswordRecoveryEmail } from '../services/email.js';
import { checkPasswordSecurity } from '../services/passwordSecurity.js';
import {
  consumePasswordRecoveryToken,
  getPasswordRecoveryToken,
  issuePasswordRecoveryToken,
  revokePasswordRecoveryTokenForUser,
} from '../services/passwordRecovery.js';
import { incrementAuthLoginFailure, incrementBruteForceBlockedResponse } from '../services/securityMetrics.js';

const router = express.Router();

router.use(expressRateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
}));

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

const passwordRecoveryRequestSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

const passwordRecoveryTokenSchema = z.object({
  token: z.string().trim().min(20).max(300),
});

const passwordRecoveryResetSchema = passwordRecoveryTokenSchema.extend({
  password: passwordSchema,
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

const getRequestCsrfToken = (req: express.Request): string | null => {
  const tokenFactory = (req as express.Request & { csrfToken?: () => string }).csrfToken;
  if (typeof tokenFactory !== 'function') {
    return null;
  }

  try {
    return tokenFactory();
  } catch {
    return null;
  }
};

const maskEmail = (value: string): string => {
  const email = value.trim().toLowerCase();
  const [localPart = '', domain = ''] = email.split('@');
  if (!localPart || !domain) return 'unknown';
  const visibleLocal = localPart.length <= 2
    ? `${localPart[0] || '*'}*`
    : `${localPart.slice(0, 2)}***`;
  return `${visibleLocal}@${domain}`;
};

router.get('/csrf', rateLimit({ windowMs: 60000, maxRequests: 30, keyPrefix: 'auth-csrf' }), (req, res) => {
  const csrfToken = getRequestCsrfToken(req) ?? ensureCsrfCookie(req, res);
  setCsrfCookie(res, csrfToken);
  res.set('Cache-Control', 'no-store');
  return res.json({ data: { csrfToken } });
});

router.post('/register', rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 10, keyPrefix: 'auth-register' }), async (req, res) => {
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

router.post('/login', rateLimit({ windowMs: 60 * 1000, maxRequests: 20, keyPrefix: 'auth-login' }), bruteForceProtection, async (req, res) => {
  const clientIP = getClientIP(req);

  try {
    const validated = loginSchema.parse(req.body);
    const user = await UserModelMongo.verifyPassword(validated.email, validated.password);

    if (!user) {
      incrementAuthLoginFailure();
      await recordFailedLoginWithEmail(clientIP, validated.email);
      if ((req as any).bruteForceBlocked) {
        const waitMinutes = Number((req as any).bruteForceWaitMinutes || 30);
        incrementBruteForceBlockedResponse();
        return res.status(429).json({
          error: 'Too many failed attempts',
          retryAfterMinutes: waitMinutes,
        });
      }
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

router.post('/password-recovery/request', rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10, keyPrefix: 'auth-password-recovery-request' }), async (req, res) => {
  try {
    const validated = passwordRecoveryRequestSchema.parse(req.body);
    const user = await UserModelMongo.findByEmail(validated.email);

    let testToken: string | undefined;

    if (user && user.isActive) {
      const token = await issuePasswordRecoveryToken({
        userId: user.id,
        email: user.email,
        requestIp: getClientIP(req),
      });

      if (config.nodeEnv === 'test') {
        testToken = token;
      }

      await sendPasswordRecoveryEmail(user.email, token);

      await AuditLogModelPostgres.create({
        entityType: 'auth',
        entityId: user.id,
        action: 'password_recovery_requested',
        actorId: user.id,
        actorRole: user.role,
        summary: `Password recovery requested for ${maskEmail(user.email)}`,
        metadata: {
          requestIp: getClientIP(req),
        },
      });
    }

    return res.json({
      message: 'If an account exists for this email, recovery instructions have been sent.',
      ...(testToken ? { data: { testToken } } : {}),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    console.error('[Auth] Password recovery request error:', error);
    return res.status(500).json({ error: 'Failed to process recovery request' });
  }
});

router.post('/password-recovery/verify', rateLimit({ windowMs: 10 * 60 * 1000, maxRequests: 30, keyPrefix: 'auth-password-recovery-verify' }), async (req, res) => {
  try {
    const validated = passwordRecoveryTokenSchema.parse(req.body);
    const payload = await getPasswordRecoveryToken(validated.token);

    if (!payload) {
      return res.status(400).json({
        error: 'invalid_or_expired_token',
        message: 'Recovery token is invalid or has expired.',
      });
    }

    return res.json({
      data: {
        valid: true,
        email: maskEmail(payload.email),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    console.error('[Auth] Password recovery verify error:', error);
    return res.status(500).json({ error: 'Failed to verify recovery token' });
  }
});

router.post('/password-recovery/reset', rateLimit({ windowMs: 10 * 60 * 1000, maxRequests: 20, keyPrefix: 'auth-password-recovery-reset' }), async (req, res) => {
  try {
    const validated = passwordRecoveryResetSchema.parse(req.body);

    const tokenPayload = await getPasswordRecoveryToken(validated.token);
    if (!tokenPayload) {
      return res.status(400).json({
        error: 'invalid_or_expired_token',
        message: 'Recovery token is invalid or has expired.',
      });
    }

    const passwordSecurity = await checkPasswordSecurity(validated.password);
    if (passwordSecurity.breached) {
      return res.status(400).json({
        error: 'weak_password',
        message: 'Choose a stronger password that has not appeared in known breach datasets.',
      });
    }

    const isReused = await UserModelMongo.isPasswordReused(
      tokenPayload.userId,
      validated.password,
      config.passwordHistoryLimit,
    );
    if (isReused) {
      return res.status(400).json({
        error: 'password_reused',
        message: 'Choose a password that has not been used recently.',
      });
    }

    const consumed = await consumePasswordRecoveryToken(validated.token);
    if (!consumed) {
      return res.status(400).json({
        error: 'invalid_or_expired_token',
        message: 'Recovery token is invalid or has expired.',
      });
    }

    const updatedUser = await UserModelMongo.update(consumed.userId, {
      password: validated.password,
    });

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await revokePasswordRecoveryTokenForUser(consumed.userId);

    await AuditLogModelPostgres.create({
      entityType: 'auth',
      entityId: consumed.userId,
      action: 'password_recovery_completed',
      actorId: consumed.userId,
      actorRole: updatedUser.role,
      summary: `Password reset completed for ${maskEmail(consumed.email)}`,
      metadata: {
        requestIp: getClientIP(req),
      },
    });

    return res.json({ message: 'Password reset successful. Please sign in with your new password.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    console.error('[Auth] Password recovery reset error:', error);
    return res.status(500).json({ error: 'Failed to reset password' });
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
  res.clearCookie('_csrf', {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/',
  });
  clearCsrfCookie(res);

  return res.json({ message: 'Logged out successfully' });
});

router.get('/me', rateLimit({ windowMs: 60 * 1000, maxRequests: 60, keyPrefix: 'auth-me' }), authenticateToken, async (req, res) => {
  try {
    const user = await UserModelMongo.findById(req.user!.userId);
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
    console.error('[Auth] Current user error:', error);
    return res.status(500).json({ error: 'Failed to load user' });
  }
});

export default router;
