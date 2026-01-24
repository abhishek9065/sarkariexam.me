import express from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';

import { config } from '../config.js';
import { UserModelMongo } from '../models/users.mongo.js';
import {
  bruteForceProtection,
  recordFailedLogin,
  clearFailedLogins,
  getClientIP
} from '../middleware/security.js';
import { blacklistToken } from '../middleware/auth.js';
import { recordAnalyticsEvent } from '../services/analytics.js';
import { SecurityLogger } from '../services/securityLogger.js';

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
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      buildJwtOptions(config.jwtExpiry as SignOptions['expiresIn'])
    );

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
});

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
      await recordFailedLogin(clientIP);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await clearFailedLogins(clientIP);

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

    const expiresIn = (user.role === 'admin'
      ? config.adminJwtExpiry
      : config.jwtExpiry) as SignOptions['expiresIn'];
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      buildJwtOptions(expiresIn)
    );

    console.log(`[Auth] Login success: ${user.email} from ${clientIP}`);

    return res.json({
      data: {
        user: { id: user.id, email: user.email, name: user.username, role: user.role },
        token
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    await blacklistToken(token);
    console.log(`[Auth] Logout from ${getClientIP(req)}`);
  }

  return res.json({ message: 'Logged out successfully' });
});

export default router;
