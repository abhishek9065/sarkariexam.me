import crypto from 'crypto';

import express from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';

import { config } from '../config.js';
import { ADMIN_AUTH_COOKIE_NAME, AUTH_COOKIE_NAME, blacklistToken, isTokenBlacklisted } from '../middleware/auth.js';
import { clearCsrfCookie, ensureCsrfCookie, setCsrfCookie } from '../middleware/csrf.js';
import {
  bruteForceProtection,
  clearFailedLoginsWithEmail,
  getClientIP
} from '../middleware/security.js';
import { UserModelMongo } from '../models/users.mongo.js';
import { buildAdminResetUrl, syncAdminAccessMetadata } from '../services/adminAccess.js';
import {
  getAdminPermissionsSnapshot,
  isAdminPortalRole,
} from '../services/adminPermissions.js';
import {
  createAdminSession,
  isNewDeviceForUser,
  terminateAdminSession,
  terminateOtherSessions,
  touchAdminSession,
  validateAdminSession,
} from '../services/adminSessions.js';
import {
  issueAdminStepUpToken,
  revokeAdminStepUpGrantsForSession,
  revokeAdminStepUpGrantsForUser,
} from '../services/adminStepUp.js';
import { recordAnalyticsEvent } from '../services/analytics.js';
import { clearAuthAbuseFailures, getAuthAbuseStatus, recordAuthAbuseFailure } from '../services/authAbuse.js';
import { sendAdminNewDeviceLoginEmail, sendAdminPasswordResetEmail, sendAdminSecurityAlertEmail } from '../services/email.js';
import { checkPasswordSecurity } from '../services/passwordSecurity.js';
import RedisCache from '../services/redis.js';
import { SecurityLogger } from '../services/securityLogger.js';
import { JwtPayload } from '../types.js';
import { generateBackupCodes, hashBackupCode, normalizeBackupCode } from '../utils/backupCodes.js';
import { decryptSecret, encryptSecret } from '../utils/crypto.js';
import { generateTotpSecret, verifyTotpCode } from '../utils/totp.js';

const router = express.Router();

router.get('/csrf', (req, res) => {
  const csrfToken = ensureCsrfCookie(req, res);
  res.set('Cache-Control', 'no-store');
  return res.json({
    data: {
      csrfToken,
    },
  });
});

// Password strength requirements
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const ADMIN_RESET_TOKEN_TTL_SECONDS = 15 * 60;
const ADMIN_RESET_TOKEN_BYTES = 32;
const ADMIN_RESET_REPLAY_TTL_SECONDS = 24 * 60 * 60;
const ADMIN_LOGIN_CHALLENGE_TTL_SECONDS = 5 * 60;
const ADMIN_LOGIN_CHALLENGE_BYTES = 32;

const registerSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: passwordSchema,
  name: z.string().min(2).max(100).trim(),
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
  expiresIn: SignOptions['expiresIn'],
  options?: { name?: string; sameSite?: 'lax' | 'strict' | 'none' }
) => {
  const maxAge = expiryToMs(expiresIn);
  const cookieName = options?.name ?? AUTH_COOKIE_NAME;
  const sameSite = options?.sameSite ?? 'lax';
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite,
    path: '/',
    ...(maxAge ? { maxAge } : {}),
  });
  setCsrfCookie(res);
};

const getBearerToken = (req: express.Request): string | undefined => {
  const authHeader = req.headers['authorization'];
  return authHeader ? authHeader.split(' ')[1] : undefined;
};

const getAuthTokens = (req: express.Request) => {
  const headerToken = getBearerToken(req);
  const cookieToken = (req as any).cookies?.[AUTH_COOKIE_NAME];
  const adminCookieToken = (req as any).cookies?.[ADMIN_AUTH_COOKIE_NAME];
  return { headerToken, cookieToken, adminCookieToken, token: headerToken || adminCookieToken || cookieToken };
};

const verifyJwtToken = (token: string): JwtPayload => {
  const verifyOptions: jwt.VerifyOptions = {};
  if (config.jwtIssuer) verifyOptions.issuer = config.jwtIssuer;
  if (config.jwtAudience) verifyOptions.audience = config.jwtAudience;
  return jwt.verify(token, config.jwtSecret, verifyOptions) as JwtPayload;
};

const createAdminSetupToken = (user: { id: string; email: string; role: string }) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      twoFactorSetup: true,
    },
    config.jwtSecret,
    buildJwtOptions(config.adminSetupTokenExpiry as SignOptions['expiresIn'])
  );
};

const getAdminAuthContext = async (req: express.Request, setupToken?: string) => {
  const headerToken = getBearerToken(req);
  const adminCookieToken = (req as any).cookies?.[ADMIN_AUTH_COOKIE_NAME];
  const token = headerToken || adminCookieToken || setupToken;
  if (!token) return null;

  if (await isTokenBlacklisted(token)) return null;

  let decoded: JwtPayload;
  try {
    decoded = verifyJwtToken(token);
  } catch {
    return null;
  }
  if (!isAdminPortalRole(decoded.role)) return null;
  if (!decoded.twoFactorSetup && decoded.sessionId) {
    const sessionValidation = await validateAdminSession(decoded.sessionId);
    if (!sessionValidation.valid) return null;
  }

  const user = await UserModelMongo.findByIdWithSecrets(decoded.userId);
  if (!user || !user.isActive || !isAdminPortalRole(user.role)) return null;

  return { user, decoded };
};

const ensureActiveAdminSession = async (req: express.Request, decoded: JwtPayload) => {
  if (!isAdminPortalRole(decoded.role) || !decoded.sessionId) {
    return { valid: true as const };
  }

  const sessionValidation = await validateAdminSession(decoded.sessionId);
  if (!sessionValidation.valid) {
    return {
      valid: false as const,
      status: 401,
      body: {
        error: 'session_invalid',
        code: sessionValidation.reason,
        message: 'Admin session expired. Please sign in again.',
      },
    };
  }

  const exp = (decoded as any).exp;
  const expiresAt = exp ? new Date(exp * 1000) : null;
  await touchAdminSession(decoded.sessionId, {
    userId: decoded.userId,
    email: decoded.email,
    ip: getClientIP(req),
    userAgent: req.headers['user-agent']?.toString() || 'Unknown',
    expiresAt,
  }, req.originalUrl);

  return { valid: true as const };
};

const isAdminEmailAllowed = (email: string): boolean => {
  if (config.adminEmailAllowlist.length > 0 && !config.adminEmailAllowlist.includes(email)) {
    return false;
  }
  if (config.adminDomainAllowlist.length > 0) {
    const domainAllowed = config.adminDomainAllowlist.some((domain) => {
      const normalized = domain.startsWith('@') ? domain.slice(1) : domain;
      return email.endsWith(`@${normalized}`);
    });
    if (!domainAllowed) return false;
  }
  return true;
};

const getAdminPasswordResetKey = (userId: string) => `auth:admin_password_reset:${userId}`;
const getAdminPasswordResetReplayKey = (tokenHash: string) => `auth:admin_password_reset_used:${tokenHash}`;
const createAdminResetToken = () => crypto.randomBytes(ADMIN_RESET_TOKEN_BYTES).toString('base64url');
const hashAdminResetToken = (token: string) => crypto
  .createHmac('sha256', config.adminBackupCodeSalt)
  .update(token)
  .digest('hex');
const getAdminLoginChallengeKey = (tokenHash: string) => `auth:admin_login_challenge:${tokenHash}`;
const createAdminLoginChallengeToken = () => crypto.randomBytes(ADMIN_LOGIN_CHALLENGE_BYTES).toString('base64url');
const hashAdminLoginChallengeToken = (token: string) => crypto
  .createHmac('sha256', config.adminBackupCodeSalt)
  .update(token)
  .digest('hex');

const issueAdminLoginChallenge = async (input: {
  userId: string;
  email: string;
  ip: string;
}) => {
  const token = createAdminLoginChallengeToken();
  await RedisCache.set(getAdminLoginChallengeKey(hashAdminLoginChallengeToken(token)), {
    userId: input.userId,
    email: input.email.toLowerCase(),
    ip: input.ip,
    issuedAt: Date.now(),
  }, ADMIN_LOGIN_CHALLENGE_TTL_SECONDS);
  return token;
};

const readAdminLoginChallenge = async (input: {
  token: string;
  email: string;
  ip: string;
}): Promise<{ userId: string; email: string; ip: string } | null> => {
  const record = await RedisCache.get(getAdminLoginChallengeKey(hashAdminLoginChallengeToken(input.token)));
  if (!record || typeof record !== 'object') return null;

  const userId = typeof (record as any).userId === 'string' ? (record as any).userId : '';
  const email = typeof (record as any).email === 'string' ? (record as any).email : '';
  const ip = typeof (record as any).ip === 'string' ? (record as any).ip : '';

  if (!userId || !email || !ip) return null;
  if (email !== input.email.toLowerCase()) return null;
  if (ip !== input.ip) return null;

  return { userId, email, ip };
};

const clearAdminLoginChallenge = async (token?: string | null) => {
  if (!token) return;
  await RedisCache.del(getAdminLoginChallengeKey(hashAdminLoginChallengeToken(token)));
};

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
      role: 'user'
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
        user: { id: user.id, email: user.email, name: user.username, role: user.role },
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1).optional(),
  challengeToken: z.string().trim().min(20).max(512).optional(),
  twoFactorCode: z.string().trim().min(6).max(20).optional(),
}).superRefine((value, ctx) => {
  const hasPassword = Boolean(value.password);
  const hasChallengeToken = Boolean(value.challengeToken);

  if (hasPassword === hasChallengeToken) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide exactly one of password or challengeToken.',
      path: ['password'],
    });
  }
});

const twoFactorSetupSchema = z.object({
  setupToken: z.string().optional(),
});

const twoFactorVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  setupToken: z.string().optional(),
});

const backupCodesSchema = z.object({
  setupToken: z.string().optional(),
});

const adminForgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

const adminResetPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  token: z.string().trim().min(20).max(512),
  password: passwordSchema,
});

const adminStepUpSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
  twoFactorCode: z.string().trim().min(6).max(20).optional(),
});

const isTotpCode = (value?: string): boolean => {
  if (!value) return false;
  return /^\d{6}$/.test(value.trim());
};

const formatRetryMessage = (retryAfterSeconds: number) => {
  if (retryAfterSeconds <= 0) return 'Too many attempts. Please try again.';
  if (retryAfterSeconds < 60) return `Too many attempts. Retry in ${retryAfterSeconds}s.`;
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `Too many attempts. Retry in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
};

const sendAuthThrottleResponse = (
  res: express.Response,
  retryAfterSeconds: number,
  overrides?: Record<string, unknown>
) => {
  const retryAfter = Math.max(1, Math.ceil(retryAfterSeconds));
  res.setHeader('Retry-After', String(retryAfter));
  return res.status(429).json({
    error: 'too_many_attempts',
    code: 'AUTH_THROTTLED',
    message: formatRetryMessage(retryAfter),
    retryAfter,
    ...(overrides ?? {}),
  });
};

const shouldAlertForAbuse = (scope: 'admin_login' | 'admin_forgot_password' | 'admin_reset_password' | 'admin_step_up', count: number) => {
  if (scope === 'admin_login' && count >= 8) return true;
  if (scope === 'admin_step_up' && count >= 6) return true;
  if ((scope === 'admin_forgot_password' || scope === 'admin_reset_password') && count >= 5) return true;
  return false;
};

const maybeSendSecurityAlertEmail = async (input: {
  email?: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}) => {
  const target = config.adminSecurityAlertEmail || input.email;
  if (!target) return;
  await sendAdminSecurityAlertEmail({
    email: target,
    title: input.title,
    message: input.message,
    metadata: input.metadata,
  });
};

const consumeBackupCode = async (user: any, rawCode: string): Promise<boolean> => {
  if (!rawCode) return false;
  const normalized = normalizeBackupCode(rawCode);
  if (normalized.length < 8) return false;
  const codeHash = hashBackupCode(normalized);
  const existing = (user?.twoFactorBackupCodes ?? []).map((item: any) => ({
    codeHash: item.codeHash,
    usedAt: item.usedAt ? new Date(item.usedAt) : null,
  }));
  const matchIndex = existing.findIndex((item: any) => item.codeHash === codeHash && !item.usedAt);
  if (matchIndex === -1) return false;
  const updated = existing.map((item: any, index: number) => {
    if (index !== matchIndex) return item;
    return { ...item, usedAt: new Date() };
  });
  await UserModelMongo.update(user.id, { twoFactorBackupCodes: updated });
  return true;
};

const createLoginHandler = (options?: { adminOnly?: boolean }) => async (req: express.Request, res: express.Response) => {
  const clientIP = getClientIP(req);
  const adminOnly = options?.adminOnly === true;
  const loginEndpoint = adminOnly ? '/api/admin-auth/login' : '/api/auth/login';

  try {
    const validated = loginSchema.parse(req.body);
    const abuseStatus = await getAuthAbuseStatus({
      scope: 'admin_login',
      ip: clientIP,
      email: validated.email,
    });
    if (abuseStatus.blocked) {
      return sendAuthThrottleResponse(res, abuseStatus.retryAfterSeconds);
    }

    let user = null as Awaited<ReturnType<typeof UserModelMongo.verifyPassword>>;
    let loginChallengeTokenToClear: string | null = null;

    if (validated.challengeToken) {
      const loginChallenge = await readAdminLoginChallenge({
        token: validated.challengeToken,
        email: validated.email,
        ip: clientIP,
      });
      if (!loginChallenge) {
        return res.status(401).json({
          error: 'invalid_login_challenge',
          message: 'Login challenge expired. Please sign in again.',
        });
      }

      user = await UserModelMongo.findById(loginChallenge.userId) as Awaited<ReturnType<typeof UserModelMongo.verifyPassword>>;
      if (!user || (user as any).isActive === false || user.email.toLowerCase() !== validated.email.toLowerCase()) {
        await clearAdminLoginChallenge(validated.challengeToken);
        return res.status(401).json({
          error: 'invalid_login_challenge',
          message: 'Login challenge expired. Please sign in again.',
        });
      }

      loginChallengeTokenToClear = validated.challengeToken;
    } else {
      user = await UserModelMongo.verifyPassword(validated.email, validated.password!);
    }

    if (!user) {
      const failure = await recordAuthAbuseFailure({
        scope: 'admin_login',
        ip: clientIP,
        email: validated.email,
      });
      SecurityLogger.log({
        ip_address: clientIP,
        event_type: 'admin_login_failure',
        endpoint: loginEndpoint,
        metadata: { email: validated.email, reason: 'invalid_credentials', count: failure.count },
      });
      if (shouldAlertForAbuse('admin_login', failure.count)) {
        SecurityLogger.log({
          ip_address: clientIP,
          event_type: 'admin_security_alert',
          endpoint: loginEndpoint,
          metadata: { email: validated.email, reason: 'excessive_login_failures', count: failure.count },
        });
        await maybeSendSecurityAlertEmail({
          email: validated.email,
          title: 'Repeated admin login failures detected',
          message: 'Multiple failed admin login attempts were detected. If this was not you, rotate credentials immediately.',
          metadata: { ip: clientIP, attempts: failure.count },
        });
      }
      if (failure.retryAfterSeconds > 0) {
        return sendAuthThrottleResponse(res, failure.retryAfterSeconds);
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isAdminPortalUser = isAdminPortalRole(user.role);
    if (validated.challengeToken && !isAdminPortalUser) {
      await clearAdminLoginChallenge(loginChallengeTokenToClear);
      return res.status(401).json({
        error: 'invalid_login_challenge',
        message: 'Login challenge expired. Please sign in again.',
      });
    }

    if (adminOnly && !isAdminPortalUser) {
      await clearAdminLoginChallenge(loginChallengeTokenToClear);
      SecurityLogger.log({
        ip_address: clientIP,
        event_type: 'admin_login_failure',
        endpoint: loginEndpoint,
        metadata: { email: user.email, reason: 'admin_account_required' },
      });
      return res.status(403).json({
        error: 'admin_account_required',
        code: 'ADMIN_ACCOUNT_REQUIRED',
        message: 'Admin account required.',
      });
    }

    if (isAdminPortalUser) {
      if (config.adminEnforceHttps) {
        const forwardedProto = req.headers['x-forwarded-proto'];
        const isSecure = req.secure || forwardedProto === 'https';
        if (!isSecure) {
          SecurityLogger.log({
            ip_address: clientIP,
            event_type: 'admin_login_failure',
            endpoint: loginEndpoint,
            metadata: { reason: 'admin_https_required', email: user.email }
          });
          return res.status(403).json({ error: 'HTTPS required for admin access' });
        }
      }
      const allowlist = config.adminIpAllowlist;
      if (allowlist.length > 0 && !allowlist.includes(clientIP)) {
        SecurityLogger.log({
          ip_address: clientIP,
          event_type: 'admin_login_failure',
          endpoint: loginEndpoint,
          metadata: { reason: 'admin_ip_block', email: user.email }
        });
        return res.status(403).json({ error: 'Admin access restricted' });
      }
      if (!isAdminEmailAllowed(user.email)) {
        SecurityLogger.log({
          ip_address: clientIP,
          event_type: 'admin_login_failure',
          endpoint: loginEndpoint,
          metadata: { reason: 'admin_email_block', email: user.email }
        });
        return res.status(403).json({ error: 'Admin access restricted' });
      }
    }

    let twoFactorVerified = false;
    let twoFactorMethod: 'totp' | 'backup' | null = null;
    if (isAdminPortalUser && config.adminRequire2FA) {
      const authUser = await UserModelMongo.findByIdWithSecrets(user.id);
      const twoFactorEnabled = authUser?.twoFactorEnabled ?? false;

      if (!twoFactorEnabled) {
        await clearAdminLoginChallenge(loginChallengeTokenToClear);
        const setupToken = createAdminSetupToken(user);
        return res.status(403).json({
          error: 'two_factor_setup_required',
          message: 'Two-factor setup required',
          setupToken,
        });
      }

      if (!validated.twoFactorCode) {
        const challengeToken = loginChallengeTokenToClear ?? await issueAdminLoginChallenge({
          userId: user.id,
          email: user.email,
          ip: clientIP,
        });
        return res.status(403).json({
          error: 'two_factor_required',
          message: 'Two-factor authentication required',
          challengeToken,
        });
      }

      const providedCode = validated.twoFactorCode.trim();
      if (isTotpCode(providedCode)) {
        const encryptedSecret = authUser?.twoFactorSecret;
        const secret = encryptedSecret ? decryptSecret(encryptedSecret) : null;
        if (!secret) {
          await clearAdminLoginChallenge(loginChallengeTokenToClear);
          const setupToken = createAdminSetupToken(user);
          return res.status(403).json({
            error: 'two_factor_setup_required',
            message: 'Two-factor setup required',
            setupToken,
          });
        }

        const isValidTotp = verifyTotpCode(secret, providedCode);
        if (!isValidTotp) {
          const failure = await recordAuthAbuseFailure({
            scope: 'admin_login',
            ip: clientIP,
            email: validated.email,
          });
          if (failure.retryAfterSeconds > 0) {
            return sendAuthThrottleResponse(res, failure.retryAfterSeconds);
          }
          return res.status(401).json({ error: 'invalid_totp', message: 'Invalid authentication code' });
        }

        twoFactorVerified = true;
        twoFactorMethod = 'totp';
      } else {
        const backupValid = await consumeBackupCode(authUser, providedCode);
        if (!backupValid) {
          const failure = await recordAuthAbuseFailure({
            scope: 'admin_login',
            ip: clientIP,
            email: validated.email,
          });
          if (failure.retryAfterSeconds > 0) {
            return sendAuthThrottleResponse(res, failure.retryAfterSeconds);
          }
          return res.status(401).json({ error: 'invalid_backup_code', message: 'Invalid backup code' });
        }

        twoFactorVerified = true;
        twoFactorMethod = 'backup';
        SecurityLogger.log({
          ip_address: clientIP,
          event_type: 'admin_backup_code_used',
          endpoint: loginEndpoint,
          metadata: { email: user.email }
        });
      }
    }

    await clearAuthAbuseFailures({
      scope: 'admin_login',
      ip: clientIP,
      email: validated.email,
    });
    await clearFailedLoginsWithEmail(clientIP, validated.email);
    await clearAdminLoginChallenge(loginChallengeTokenToClear);

    const expiresIn = (isAdminPortalUser
      ? config.adminJwtExpiry
      : config.jwtExpiry) as SignOptions['expiresIn'];
    const sessionId = isAdminPortalUser ? crypto.randomUUID() : undefined;
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      ...(twoFactorVerified ? { twoFactorVerified: true } : {}),
      ...(sessionId ? { sessionId } : {}),
    };
    const token = jwt.sign(
      payload,
      config.jwtSecret,
      buildJwtOptions(expiresIn)
    );
    if (isAdminPortalUser) {
      const userAgent = req.headers['user-agent']?.toString() || 'Unknown';
      const newDeviceLogin = await isNewDeviceForUser({
        userId: user.id,
        ip: clientIP,
        userAgent,
      });
      setAuthCookie(res, token, expiresIn, { name: ADMIN_AUTH_COOKIE_NAME, sameSite: 'strict' });
      const expiresAtMs = expiryToMs(expiresIn);
      const session = await createAdminSession({
        sessionId: sessionId ?? undefined,
        userId: user.id,
        email: user.email,
        ip: clientIP,
        userAgent,
        expiresAt: expiresAtMs ? new Date(Date.now() + expiresAtMs) : null,
      });
      if (newDeviceLogin) {
        SecurityLogger.log({
          ip_address: clientIP,
          event_type: 'admin_login_new_device',
          endpoint: loginEndpoint,
          metadata: { email: user.email, device: session.device, browser: session.browser, os: session.os },
        });
        await sendAdminNewDeviceLoginEmail({
          email: user.email,
          ip: clientIP,
          device: session.device,
          browser: session.browser,
          os: session.os,
          timestamp: new Date().toISOString(),
        });
      }
      SecurityLogger.log({
        ip_address: clientIP,
        event_type: 'admin_login_success',
        endpoint: loginEndpoint,
        metadata: { email: user.email, method: twoFactorMethod ?? 'password' }
      });
      await syncAdminAccessMetadata({
        userId: user.id,
        email: user.email,
        role: user.role as 'admin' | 'editor' | 'reviewer' | 'viewer' | 'contributor',
        isActive: user.isActive,
        twoFactorEnabled: user.twoFactorEnabled,
        lastLoginAt: new Date(),
        patch: {
          invitationState: 'accepted',
          passwordResetRequired: false,
        },
      });
    } else {
      setAuthCookie(res, token, expiresIn);
    }

    console.log(`[Auth] Login success: ${user.email} from ${clientIP}`);

    const responseData: { user: { id: string; email: string; name: string; role: string } } = {
      user: { id: user.id, email: user.email, name: user.username, role: user.role },
    };
    return res.json({ data: responseData });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
};

export const adminAuthLoginHandler = createLoginHandler({ adminOnly: true });

router.post('/login', bruteForceProtection, createLoginHandler());

router.post('/admin/forgot-password', async (req, res) => {
  const genericResponse = {
    message: 'If an admin account exists for this email, reset instructions have been sent.',
  };
  const clientIP = getClientIP(req);

  try {
    const validated = adminForgotPasswordSchema.parse(req.body ?? {});
    const abuseStatus = await getAuthAbuseStatus({
      scope: 'admin_forgot_password',
      ip: clientIP,
      email: validated.email,
    });
    if (abuseStatus.blocked) {
      return sendAuthThrottleResponse(res, abuseStatus.retryAfterSeconds, {
        message: genericResponse.message,
      });
    }

    const user = await UserModelMongo.findByEmail(validated.email);
    if (!user || !user.isActive || !isAdminPortalRole(user.role) || !isAdminEmailAllowed(user.email)) {
      const failure = await recordAuthAbuseFailure({
        scope: 'admin_forgot_password',
        ip: clientIP,
        email: validated.email,
      });
      if (shouldAlertForAbuse('admin_forgot_password', failure.count)) {
        SecurityLogger.log({
          ip_address: clientIP,
          event_type: 'admin_security_alert',
          endpoint: '/api/auth/admin/forgot-password',
          metadata: { email: validated.email, reason: 'excessive_reset_requests', count: failure.count },
        });
      }
      return res.json(genericResponse);
    }

    const token = createAdminResetToken();
    const tokenHash = hashAdminResetToken(token);
    const resetKey = getAdminPasswordResetKey(user.id);
    await RedisCache.set(resetKey, {
      tokenHash,
      issuedAt: new Date().toISOString(),
      email: user.email,
    }, ADMIN_RESET_TOKEN_TTL_SECONDS);

    const resetUrl = buildAdminResetUrl(user.email, token);
    await sendAdminPasswordResetEmail(user.email, resetUrl, Math.ceil(ADMIN_RESET_TOKEN_TTL_SECONDS / 60));
    await clearAuthAbuseFailures({
      scope: 'admin_forgot_password',
      ip: clientIP,
      email: validated.email,
    });

    SecurityLogger.log({
      ip_address: clientIP,
      event_type: 'admin_password_reset_requested',
      endpoint: '/api/auth/admin/forgot-password',
      metadata: { email: user.email },
    });

    return res.json(genericResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    console.error('[Auth] Admin forgot password error:', error);
    return res.status(500).json({ error: 'Failed to process reset request' });
  }
});

router.post('/admin/reset-password', async (req, res) => {
  const clientIP = getClientIP(req);
  try {
    const validated = adminResetPasswordSchema.parse(req.body ?? {});
    const abuseStatus = await getAuthAbuseStatus({
      scope: 'admin_reset_password',
      ip: clientIP,
      email: validated.email,
    });
    if (abuseStatus.blocked) {
      return sendAuthThrottleResponse(res, abuseStatus.retryAfterSeconds);
    }

    const user = await UserModelMongo.findByEmail(validated.email);
    if (!user || !user.isActive || !isAdminPortalRole(user.role) || !isAdminEmailAllowed(user.email)) {
      await recordAuthAbuseFailure({
        scope: 'admin_reset_password',
        ip: clientIP,
        email: validated.email,
      });
      return res.status(400).json({ error: 'invalid_or_expired_reset_token', message: 'Invalid or expired reset link' });
    }

    const resetKey = getAdminPasswordResetKey(user.id);
    const resetRecord = await RedisCache.get(resetKey) as { tokenHash?: string } | null;
    const submittedHash = hashAdminResetToken(validated.token);
    const replayKey = getAdminPasswordResetReplayKey(submittedHash);
    const replayHit = await RedisCache.get(replayKey);
    if (replayHit) {
      await recordAuthAbuseFailure({
        scope: 'admin_reset_password',
        ip: clientIP,
        email: validated.email,
      });
      SecurityLogger.log({
        ip_address: clientIP,
        event_type: 'admin_password_reset_failed',
        endpoint: '/api/auth/admin/reset-password',
        metadata: { email: validated.email, reason: 'token_replay_detected' },
      });
      return res.status(400).json({ error: 'invalid_or_expired_reset_token', message: 'Invalid or expired reset link' });
    }
    if (!resetRecord?.tokenHash || resetRecord.tokenHash !== submittedHash) {
      const failure = await recordAuthAbuseFailure({
        scope: 'admin_reset_password',
        ip: clientIP,
        email: validated.email,
      });
      SecurityLogger.log({
        ip_address: clientIP,
        event_type: 'admin_password_reset_failed',
        endpoint: '/api/auth/admin/reset-password',
        metadata: { email: validated.email, reason: 'token_mismatch', count: failure.count },
      });
      if (shouldAlertForAbuse('admin_reset_password', failure.count)) {
        SecurityLogger.log({
          ip_address: clientIP,
          event_type: 'admin_security_alert',
          endpoint: '/api/auth/admin/reset-password',
          metadata: { email: validated.email, reason: 'excessive_reset_failures', count: failure.count },
        });
      }
      return res.status(400).json({ error: 'invalid_or_expired_reset_token', message: 'Invalid or expired reset link' });
    }

    const passwordSecurity = await checkPasswordSecurity(validated.password);
    if (passwordSecurity.breached) {
      return res.status(400).json({
        error: 'weak_password',
        message: 'Choose a stronger password that has not appeared in known breach datasets.',
      });
    }
    const reusedPassword = await UserModelMongo.isPasswordReused(user.id, validated.password, config.passwordHistoryLimit);
    if (reusedPassword) {
      return res.status(400).json({
        error: 'password_reuse_forbidden',
        message: `New password must be different from your last ${config.passwordHistoryLimit} passwords.`,
      });
    }

    const updated = await UserModelMongo.update(user.id, { password: validated.password });
    if (!updated) {
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    await RedisCache.set(replayKey, {
      userId: user.id,
      email: validated.email,
      consumedAt: new Date().toISOString(),
    }, ADMIN_RESET_REPLAY_TTL_SECONDS);
    await RedisCache.del(resetKey);
    await clearAuthAbuseFailures({
      scope: 'admin_reset_password',
      ip: clientIP,
      email: validated.email,
    });
    await clearFailedLoginsWithEmail(clientIP, validated.email);
    await revokeAdminStepUpGrantsForUser(user.id);
    await terminateOtherSessions(user.id);

    SecurityLogger.log({
      ip_address: clientIP,
      event_type: 'admin_password_reset_completed',
      endpoint: '/api/auth/admin/reset-password',
      metadata: { email: validated.email },
    });

    if (isAdminPortalRole(updated.role)) {
      await syncAdminAccessMetadata({
        userId: updated.id,
        email: updated.email,
        role: updated.role,
        isActive: updated.isActive,
        twoFactorEnabled: updated.twoFactorEnabled,
        lastLoginAt: updated.lastLogin ? new Date(updated.lastLogin) : null,
        patch: {
          invitationState: 'accepted',
          passwordResetRequired: false,
        },
      });
    }

    return res.json({ message: 'Password reset successful' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    console.error('[Auth] Admin reset password error:', error);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.post('/admin/step-up', async (req, res) => {
  const clientIP = getClientIP(req);
  try {
    const validated = adminStepUpSchema.parse(req.body ?? {});
    const abuseStatus = await getAuthAbuseStatus({
      scope: 'admin_step_up',
      ip: clientIP,
      email: validated.email,
    });
    if (abuseStatus.blocked) {
      return sendAuthThrottleResponse(res, abuseStatus.retryAfterSeconds);
    }

    const context = await getAdminAuthContext(req);
    if (!context) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { user, decoded } = context;
    if (!decoded.sessionId) {
      return res.status(401).json({
        error: 'session_invalid',
        code: 'SESSION_ID_MISSING',
        message: 'Admin session expired. Please sign in again.',
      });
    }
    if (validated.email !== user.email) {
      return res.status(403).json({ error: 'step_up_user_mismatch', message: 'Step-up must match the active account.' });
    }

    const passwordValid = await UserModelMongo.verifyPasswordById(user.id, validated.password);
    if (!passwordValid) {
      const failure = await recordAuthAbuseFailure({
        scope: 'admin_step_up',
        ip: clientIP,
        email: validated.email,
      });
      SecurityLogger.log({
        ip_address: clientIP,
        event_type: 'admin_step_up_failed',
        endpoint: '/api/auth/admin/step-up',
        metadata: { email: validated.email, reason: 'invalid_password', count: failure.count },
      });
      if (failure.retryAfterSeconds > 0) {
        return sendAuthThrottleResponse(res, failure.retryAfterSeconds);
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const requiresSecondFactor = config.adminRequire2FA || Boolean(user.twoFactorEnabled);
    if (requiresSecondFactor) {
      const code = validated.twoFactorCode?.trim();
      if (!code) {
        return res.status(400).json({ error: 'step_up_two_factor_required', message: 'Two-factor code is required.' });
      }

      if (isTotpCode(code)) {
        const encryptedSecret = user.twoFactorSecret;
        const secret = encryptedSecret ? decryptSecret(encryptedSecret) : null;
        if (!secret || !verifyTotpCode(secret, code)) {
          const failure = await recordAuthAbuseFailure({
            scope: 'admin_step_up',
            ip: clientIP,
            email: validated.email,
          });
          SecurityLogger.log({
            ip_address: clientIP,
            event_type: 'admin_step_up_failed',
            endpoint: '/api/auth/admin/step-up',
            metadata: { email: validated.email, reason: 'invalid_totp', count: failure.count },
          });
          if (failure.retryAfterSeconds > 0) {
            return sendAuthThrottleResponse(res, failure.retryAfterSeconds);
          }
          return res.status(401).json({ error: 'invalid_totp', message: 'Invalid authentication code' });
        }
      } else {
        const backupValid = await consumeBackupCode(user, code);
        if (!backupValid) {
          const failure = await recordAuthAbuseFailure({
            scope: 'admin_step_up',
            ip: clientIP,
            email: validated.email,
          });
          SecurityLogger.log({
            ip_address: clientIP,
            event_type: 'admin_step_up_failed',
            endpoint: '/api/auth/admin/step-up',
            metadata: { email: validated.email, reason: 'invalid_backup_code', count: failure.count },
          });
          if (failure.retryAfterSeconds > 0) {
            return sendAuthThrottleResponse(res, failure.retryAfterSeconds);
          }
          return res.status(401).json({ error: 'invalid_backup_code', message: 'Invalid backup code' });
        }
      }
    }

    await clearAuthAbuseFailures({
      scope: 'admin_step_up',
      ip: clientIP,
      email: validated.email,
    });
    const grant = await issueAdminStepUpToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: decoded.sessionId,
    });
    SecurityLogger.log({
      ip_address: clientIP,
      event_type: 'admin_step_up_success',
      endpoint: '/api/auth/admin/step-up',
      metadata: { email: validated.email },
    });
    return res.json({
      data: {
        token: grant.token,
        expiresAt: grant.expiresAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    console.error('[Auth] Admin step-up error:', error);
    return res.status(500).json({ error: 'Step-up verification failed' });
  }
});

router.post('/admin/2fa/setup', async (req, res) => {
  try {
    const validated = twoFactorSetupSchema.parse(req.body ?? {});
    const context = await getAdminAuthContext(req, validated.setupToken);
    if (!context) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { user, decoded } = context;
    const isSetupToken = decoded.twoFactorSetup === true;
    const isVerified = decoded.twoFactorVerified === true;

    if (config.adminRequire2FA && !isSetupToken && !isVerified) {
      return res.status(403).json({ error: 'two_factor_required', message: 'Two-factor authentication required' });
    }

    if (config.adminEnforceHttps) {
      const forwardedProto = req.headers['x-forwarded-proto'];
      const isSecure = req.secure || forwardedProto === 'https';
      if (!isSecure) {
        return res.status(403).json({ error: 'HTTPS required for admin access' });
      }
    }

    const clientIP = getClientIP(req);
    if (config.adminIpAllowlist.length > 0 && !config.adminIpAllowlist.includes(clientIP)) {
      return res.status(403).json({ error: 'Admin access restricted' });
    }

    if (!isAdminEmailAllowed(user.email)) {
      return res.status(403).json({ error: 'Admin access restricted' });
    }

    if (user.twoFactorEnabled) {
      return res.status(409).json({ error: 'two_factor_already_enabled', message: 'Two-factor already enabled' });
    }

    const { secret, qrCode } = await generateTotpSecret(user.email);
    await UserModelMongo.update(user.id, {
      twoFactorTempSecret: encryptSecret(secret),
      twoFactorEnabled: false,
    });

    return res.json({ data: { qrCode, secret } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    console.error('[Auth] 2FA setup error:', error);
    return res.status(500).json({ error: 'Two-factor setup failed' });
  }
});

router.post('/admin/2fa/verify', async (req, res) => {
  try {
    const validated = twoFactorVerifySchema.parse(req.body);
    const context = await getAdminAuthContext(req, validated.setupToken);
    if (!context) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { user, decoded } = context;
    const isSetupToken = decoded.twoFactorSetup === true;
    const isVerified = decoded.twoFactorVerified === true;

    if (config.adminRequire2FA && !isSetupToken && !isVerified) {
      return res.status(403).json({ error: 'two_factor_required', message: 'Two-factor authentication required' });
    }

    if (config.adminEnforceHttps) {
      const forwardedProto = req.headers['x-forwarded-proto'];
      const isSecure = req.secure || forwardedProto === 'https';
      if (!isSecure) {
        return res.status(403).json({ error: 'HTTPS required for admin access' });
      }
    }

    const clientIP = getClientIP(req);
    if (config.adminIpAllowlist.length > 0 && !config.adminIpAllowlist.includes(clientIP)) {
      return res.status(403).json({ error: 'Admin access restricted' });
    }

    if (!isAdminEmailAllowed(user.email)) {
      return res.status(403).json({ error: 'Admin access restricted' });
    }

    if (user.twoFactorEnabled && !user.twoFactorTempSecret) {
      return res.status(409).json({ error: 'two_factor_already_enabled', message: 'Two-factor already enabled' });
    }

    if (!user.twoFactorTempSecret) {
      return res.status(400).json({ error: 'two_factor_setup_required', message: 'Two-factor setup required' });
    }

    const tempSecret = decryptSecret(user.twoFactorTempSecret);
    if (!tempSecret) {
      return res.status(400).json({ error: 'two_factor_setup_required', message: 'Two-factor setup required' });
    }

    const isValid = verifyTotpCode(tempSecret, validated.code);
    if (!isValid) {
      return res.status(400).json({ error: 'invalid_totp', message: 'Invalid authentication code' });
    }

    await UserModelMongo.update(user.id, {
      twoFactorEnabled: true,
      twoFactorSecret: encryptSecret(tempSecret),
      twoFactorTempSecret: null,
      twoFactorVerifiedAt: new Date(),
    });

    return res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    console.error('[Auth] 2FA verify error:', error);
    return res.status(500).json({ error: 'Two-factor verification failed' });
  }
});

router.post('/admin/2fa/backup-codes', async (req, res) => {
  try {
    const validated = backupCodesSchema.parse(req.body ?? {});
    const context = await getAdminAuthContext(req, validated.setupToken);
    if (!context) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { user, decoded } = context;
    if (config.adminRequire2FA && !decoded.twoFactorVerified) {
      return res.status(403).json({ error: 'two_factor_required', message: 'Two-factor authentication required' });
    }

    if (config.adminEnforceHttps) {
      const forwardedProto = req.headers['x-forwarded-proto'];
      const isSecure = req.secure || forwardedProto === 'https';
      if (!isSecure) {
        return res.status(403).json({ error: 'HTTPS required for admin access' });
      }
    }

    const clientIP = getClientIP(req);
    if (config.adminIpAllowlist.length > 0 && !config.adminIpAllowlist.includes(clientIP)) {
      return res.status(403).json({ error: 'Admin access restricted' });
    }

    if (!isAdminEmailAllowed(user.email)) {
      return res.status(403).json({ error: 'Admin access restricted' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ error: 'two_factor_required', message: 'Enable two-factor before creating backup codes' });
    }

    const codes = generateBackupCodes();
    const hashed = codes.map((code) => ({ codeHash: hashBackupCode(code), usedAt: null }));
    await UserModelMongo.update(user.id, {
      twoFactorBackupCodes: hashed,
      twoFactorBackupCodesUpdatedAt: new Date(),
    });

    SecurityLogger.log({
      ip_address: clientIP,
      event_type: 'admin_backup_code_generated',
      endpoint: '/api/auth/admin/2fa/backup-codes',
      metadata: { email: user.email, count: codes.length }
    });

    return res.json({
      data: {
        codes,
        generatedAt: new Date().toISOString(),
        total: codes.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    console.error('[Auth] Backup code error:', error);
    return res.status(500).json({ error: 'Failed to generate backup codes' });
  }
});

router.get('/admin/2fa/backup-codes/status', async (req, res) => {
  try {
    const context = await getAdminAuthContext(req);
    if (!context) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { user, decoded } = context;
    if (config.adminRequire2FA && !decoded.twoFactorVerified) {
      return res.status(403).json({ error: 'two_factor_required', message: 'Two-factor authentication required' });
    }

    const clientIP = getClientIP(req);
    if (config.adminIpAllowlist.length > 0 && !config.adminIpAllowlist.includes(clientIP)) {
      return res.status(403).json({ error: 'Admin access restricted' });
    }

    if (!isAdminEmailAllowed(user.email)) {
      return res.status(403).json({ error: 'Admin access restricted' });
    }

    const total = user.twoFactorBackupCodes?.length ?? 0;
    const remaining = user.twoFactorBackupCodes?.filter((code) => !code.usedAt).length ?? 0;

    return res.json({
      data: {
        total,
        remaining,
        updatedAt: user.twoFactorBackupCodesUpdatedAt ?? null,
      },
    });
  } catch (error) {
    console.error('[Auth] Backup code status error:', error);
    return res.status(500).json({ error: 'Failed to load backup code status' });
  }
});

router.post('/logout', async (req, res) => {
  const { headerToken, cookieToken, adminCookieToken } = getAuthTokens(req);
  const tokens = [headerToken, cookieToken, adminCookieToken].filter(Boolean) as string[];

  if (tokens.length > 0) {
    await Promise.all(tokens.map((token) => blacklistToken(token)));
    await Promise.all(tokens.map(async (token) => {
      const decoded = jwt.decode(token) as { sessionId?: string } | null;
      if (decoded?.sessionId) {
        await terminateAdminSession(decoded.sessionId);
        await revokeAdminStepUpGrantsForSession(decoded.sessionId);
      }
    }));
    console.log(`[Auth] Logout from ${getClientIP(req)}`);
  }

  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  });
  res.clearCookie(ADMIN_AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/',
  });
  clearCsrfCookie(res);

  return res.json({ message: 'Logged out successfully' });
});

router.get('/me', async (req, res) => {
  try {
    const { token } = getAuthTokens(req);
    
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const decoded = verifyJwtToken(token);
    if (decoded.twoFactorSetup) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const sessionStatus = await ensureActiveAdminSession(req, decoded);
    if (!sessionStatus.valid) {
      return res.status(sessionStatus.status).json(sessionStatus.body);
    }
    const user = await UserModelMongo.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User account deactivated' });
    }

    // For admin portal users, verify they still have portal privileges
    if (isAdminPortalRole(decoded.role) && !isAdminPortalRole(user.role)) {
      console.warn(`[Auth] Admin portal privilege removed: ${user.email}`);
      await blacklistToken(token);
      return res.status(401).json({ 
        error: 'Admin privileges revoked',
        code: 'PRIVILEGES_REVOKED'
      });
    }

    if (isAdminPortalRole(user.role) && config.adminRequire2FA && !decoded.twoFactorVerified) {
      return res.status(403).json({
        error: 'two_factor_required',
        code: 'TWO_FACTOR_REQUIRED',
        message: 'Two-factor authentication required',
      });
    }

    ensureCsrfCookie(req, res);

    return res.json({
      data: { 
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.username, 
          role: user.role 
        } 
      },
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }
    console.error('[Auth] Me endpoint error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
});

router.get('/admin/permissions', async (req, res) => {
  try {
    const { token } = getAuthTokens(req);
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const decoded = verifyJwtToken(token);
    const sessionStatus = await ensureActiveAdminSession(req, decoded);
    if (!sessionStatus.valid) {
      return res.status(sessionStatus.status).json(sessionStatus.body);
    }
    const user = await UserModelMongo.findById(decoded.userId);
    if (!user || !user.isActive || !isAdminPortalRole(user.role)) {
      return res.status(403).json({ error: 'Admin portal access required' });
    }
    if (isAdminPortalRole(user.role) && config.adminRequire2FA && !decoded.twoFactorVerified) {
      return res.status(403).json({
        error: 'two_factor_required',
        code: 'TWO_FACTOR_REQUIRED',
        message: 'Two-factor authentication required',
      });
    }

    return res.json({
      data: {
        role: user.role,
        ...(await getAdminPermissionsSnapshot()),
      },
    });
  } catch (error) {
    console.error('[Auth] Admin permissions error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
});

export default router;
