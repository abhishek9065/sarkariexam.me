import crypto from 'crypto';
import express from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';

import { config } from '../config.js';
import { ADMIN_AUTH_COOKIE_NAME, AUTH_COOKIE_NAME, blacklistToken, isTokenBlacklisted } from '../middleware/auth.js';
import {
  bruteForceProtection,
  recordFailedLoginWithEmail,
  clearFailedLoginsWithEmail,
  getClientIP
} from '../middleware/security.js';
import { UserModelMongo } from '../models/users.mongo.js';
import { recordAnalyticsEvent } from '../services/analytics.js';
import { createAdminSession, terminateAdminSession } from '../services/adminSessions.js';
import { SecurityLogger } from '../services/securityLogger.js';
import { JwtPayload } from '../types.js';
import { decryptSecret, encryptSecret } from '../utils/crypto.js';
import { generateBackupCodes, hashBackupCode, normalizeBackupCode } from '../utils/backupCodes.js';
import { generateTotpSecret, verifyTotpCode } from '../utils/totp.js';

const router = express.Router();

// Password strength requirements
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
  if (decoded.role !== 'admin') return null;

  const user = await UserModelMongo.findByIdWithSecrets(decoded.userId);
  if (!user || !user.isActive || user.role !== 'admin') return null;

  return { user, decoded };
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

router.post('/register', async (req, res) => {
  try {
    const validated = registerSchema.parse(req.body);

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
        token
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
  password: z.string(),
  twoFactorCode: z.string().trim().min(6).max(20).optional(),
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

const isTotpCode = (value?: string): boolean => {
  if (!value) return false;
  return /^\d{6}$/.test(value.trim());
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

router.post('/login', bruteForceProtection, async (req, res) => {
  const clientIP = getClientIP(req);
  const bruteForceBlocked = (req as any).bruteForceBlocked === true;
  const waitMinutes = (req as any).bruteForceWaitMinutes ?? 15;

  try {
    const validated = loginSchema.parse(req.body);
    const user = await UserModelMongo.verifyPassword(validated.email, validated.password);

    if (!user) {
      if (bruteForceBlocked) {
        return res.status(429).json({
          error: 'Too many failed login attempts',
          message: `Please try again in ${waitMinutes} minutes`,
        });
      }
      await recordFailedLoginWithEmail(clientIP, validated.email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.role === 'admin') {
      if (config.adminEnforceHttps) {
        const forwardedProto = req.headers['x-forwarded-proto'];
        const isSecure = req.secure || forwardedProto === 'https';
        if (!isSecure) {
          SecurityLogger.log({
            ip_address: clientIP,
            event_type: 'auth_failure',
            endpoint: '/api/auth/login',
            metadata: { reason: 'admin_https_required', email: user.email }
          });
          return res.status(403).json({ error: 'HTTPS required for admin access' });
        }
      }
      const allowlist = config.adminIpAllowlist;
      if (allowlist.length > 0 && !allowlist.includes(clientIP)) {
        SecurityLogger.log({
          ip_address: clientIP,
          event_type: 'auth_failure',
          endpoint: '/api/auth/login',
          metadata: { reason: 'admin_ip_block', email: user.email }
        });
        return res.status(403).json({ error: 'Admin access restricted' });
      }
      if (!isAdminEmailAllowed(user.email)) {
        SecurityLogger.log({
          ip_address: clientIP,
          event_type: 'auth_failure',
          endpoint: '/api/auth/login',
          metadata: { reason: 'admin_email_block', email: user.email }
        });
        return res.status(403).json({ error: 'Admin access restricted' });
      }
    }

    let twoFactorVerified = false;
    let twoFactorMethod: 'totp' | 'backup' | null = null;
    if (user.role === 'admin' && config.adminRequire2FA) {
      const authUser = await UserModelMongo.findByIdWithSecrets(user.id);
      const twoFactorEnabled = authUser?.twoFactorEnabled ?? false;

      if (!twoFactorEnabled) {
        const setupToken = createAdminSetupToken(user);
        return res.status(403).json({
          error: 'two_factor_setup_required',
          message: 'Two-factor setup required',
          setupToken,
        });
      }

      if (!validated.twoFactorCode) {
        return res.status(403).json({
          error: 'two_factor_required',
          message: 'Two-factor authentication required',
        });
      }

      const providedCode = validated.twoFactorCode.trim();
      if (isTotpCode(providedCode)) {
        const encryptedSecret = authUser?.twoFactorSecret;
        const secret = encryptedSecret ? decryptSecret(encryptedSecret) : null;
        if (!secret) {
          const setupToken = createAdminSetupToken(user);
          return res.status(403).json({
            error: 'two_factor_setup_required',
            message: 'Two-factor setup required',
            setupToken,
          });
        }

        const isValidTotp = verifyTotpCode(secret, providedCode);
        if (!isValidTotp) {
          if (bruteForceBlocked) {
            return res.status(429).json({
              error: 'Too many failed login attempts',
              message: `Please try again in ${waitMinutes} minutes`,
            });
          }
          await recordFailedLoginWithEmail(clientIP, validated.email);
          return res.status(401).json({ error: 'invalid_totp', message: 'Invalid authentication code' });
        }

        twoFactorVerified = true;
        twoFactorMethod = 'totp';
      } else {
        const backupValid = await consumeBackupCode(authUser, providedCode);
        if (!backupValid) {
          if (bruteForceBlocked) {
            return res.status(429).json({
              error: 'Too many failed login attempts',
              message: `Please try again in ${waitMinutes} minutes`,
            });
          }
          await recordFailedLoginWithEmail(clientIP, validated.email);
          return res.status(401).json({ error: 'invalid_backup_code', message: 'Invalid backup code' });
        }

        twoFactorVerified = true;
        twoFactorMethod = 'backup';
        SecurityLogger.log({
          ip_address: clientIP,
          event_type: 'admin_backup_code_used',
          endpoint: '/api/auth/login',
          metadata: { email: user.email }
        });
      }
    }

    await clearFailedLoginsWithEmail(clientIP, validated.email);

    const expiresIn = (user.role === 'admin'
      ? config.adminJwtExpiry
      : config.jwtExpiry) as SignOptions['expiresIn'];
    const sessionId = user.role === 'admin' ? crypto.randomUUID() : undefined;
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
    if (user.role === 'admin') {
      setAuthCookie(res, token, expiresIn, { name: ADMIN_AUTH_COOKIE_NAME, sameSite: 'strict' });
      const expiresAtMs = expiryToMs(expiresIn);
      createAdminSession({
        sessionId: sessionId ?? undefined,
        userId: user.id,
        email: user.email,
        ip: clientIP,
        userAgent: req.headers['user-agent']?.toString() || 'Unknown',
        expiresAt: expiresAtMs ? new Date(Date.now() + expiresAtMs) : null,
      });
      SecurityLogger.log({
        ip_address: clientIP,
        event_type: 'admin_login_success',
        endpoint: '/api/auth/login',
        metadata: { email: user.email, method: twoFactorMethod ?? 'password' }
      });
    } else {
      setAuthCookie(res, token, expiresIn);
    }

    console.log(`[Auth] Login success: ${user.email} from ${clientIP}`);

    const responseData: { user: { id: string; email: string; name: string; role: string }; token?: string } = {
      user: { id: user.id, email: user.email, name: user.username, role: user.role },
    };
    if (user.role !== 'admin') {
      responseData.token = token;
    }
    return res.json({ data: responseData });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
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
    tokens.forEach((token) => {
      const decoded = jwt.decode(token) as { sessionId?: string } | null;
      if (decoded?.sessionId) {
        terminateAdminSession(decoded.sessionId);
      }
    });
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
    const user = await UserModelMongo.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User account deactivated' });
    }

    // For admin users, verify they still have admin privileges
    if (decoded.role === 'admin' && user.role !== 'admin') {
      console.warn(`[Auth] Admin privilege removed: ${user.email}`);
      await blacklistToken(token);
      return res.status(401).json({ 
        error: 'Admin privileges revoked',
        code: 'PRIVILEGES_REVOKED'
      });
    }

    if (user.role === 'admin' && config.adminRequire2FA && !decoded.twoFactorVerified) {
      return res.status(403).json({
        error: 'two_factor_required',
        code: 'TWO_FACTOR_REQUIRED',
        message: 'Two-factor authentication required',
      });
    }

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

export default router;
