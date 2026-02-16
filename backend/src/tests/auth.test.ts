import crypto from 'crypto';

import cookieParser from 'cookie-parser';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserModelMongo } from '../models/users.mongo.js';
import authRouter from '../routes/auth.js';
import RedisCache from '../services/redis.js';

// Mock dependencies
vi.mock('../models/users.mongo.js');
vi.mock('../middleware/security.js', () => ({
  bruteForceProtection: (req: any, res: any, next: any) => next(),
  getClientIP: () => '127.0.0.1',
  recordFailedLoginWithEmail: vi.fn(),
  clearFailedLoginsWithEmail: vi.fn(),
  validateContentType: (req: any, res: any, next: any) => next(),
  sanitizeRequestBody: (req: any, res: any, next: any) => next(),
}));
vi.mock('../services/analytics.js', () => ({
  recordAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../middleware/auth.js', async () => {
  const actual = await vi.importActual('../middleware/auth.js');
  return {
    ...actual,
    blacklistToken: vi.fn(),
  };
});
vi.mock('../config.js', () => ({
  config: {
    jwtSecret: 'test-secret',
    jwtExpiry: '1h',
    adminJwtExpiry: '6h',
    isProduction: false,
    adminIpAllowlist: [],
    adminEmailAllowlist: [],
    adminDomainAllowlist: [],
    adminEnforceHttps: false,
    adminRequire2FA: false,
    adminSetupTokenExpiry: '15m',
    adminStepUpTtlSeconds: 600,
    adminAuthCookieName: 'admin_auth_token',
    adminSetupKey: 'setup-admin-123',
    totpIssuer: 'SarkariExams Admin',
    totpEncryptionKey: 'test-totp-key',
    adminBackupCodeSalt: 'backup-salt',
    passwordHistoryLimit: 5,
    passwordBreachCheckEnabled: false,
    passwordBreachCheckTimeoutMs: 500,
    adminSessionIdleTimeoutMinutes: 30,
    adminSessionAbsoluteTimeoutHours: 12,
    adminDualApprovalRequired: false,
    adminApprovalExpiryMinutes: 30,
    adminApprovalRetentionDays: 30,
    adminApprovalCleanupIntervalMinutes: 60,
    adminApprovalPolicyMatrix: {},
    adminSecurityAlertEmail: '',
    securityLogRetentionHours: 24,
    securityLogPersistenceEnabled: false,
    securityLogDbRetentionDays: 30,
    securityLogCleanupIntervalMinutes: 60,
    frontendUrl: 'http://localhost:5173',
    emailPass: '',
    emailFrom: 'SarkariExams <noreply@sarkariexams.me>',
    jwtIssuer: '',
    jwtAudience: '',
    corsOrigins: ['http://localhost:3000'],
  },
}));

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/auth', authRouter);

describe('Auth Routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await RedisCache.invalidatePattern('auth:');
  });

  describe('GET /auth/csrf', () => {
    it('returns csrf token and sets csrf cookie', async () => {
      const res = await request(app).get('/auth/csrf');

      expect(res.status).toBe(200);
      expect(typeof res.body.data?.csrfToken).toBe('string');
      expect(res.body.data.csrfToken.length).toBeGreaterThan(20);
      expect(res.headers['set-cookie']?.some((cookie: string) => cookie.startsWith('csrf_token='))).toBe(true);
    });
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        username: 'Test User',
        role: 'user',
      };

      vi.mocked(UserModelMongo.findByEmail).mockResolvedValue(null);
      vi.mocked(UserModelMongo.create).mockResolvedValue(mockUser as any);

      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User',
        });

      expect(res.body.data.user).toEqual({
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      });
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should fail if email already exists', async () => {
      vi.mocked(UserModelMongo.findByEmail).mockResolvedValue({ id: 'existing' } as any);

      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'Password123!',
          name: 'Existing User',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already registered');
    });

    it('should fail with invalid password', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          name: 'Test User',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        username: 'Test User',
        role: 'user',
      };

      vi.mocked(UserModelMongo.verifyPassword).mockResolvedValue(mockUser as any);

      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user).toEqual({
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      });
      expect(res.body.data.token).toBeDefined();
    });

    it('should fail with invalid credentials', async () => {
      vi.mocked(UserModelMongo.verifyPassword).mockResolvedValue(null);

      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('throttles repeated invalid login attempts', async () => {
      vi.mocked(UserModelMongo.verifyPassword).mockResolvedValue(null);

      for (let index = 0; index < 3; index += 1) {
        const attempt = await request(app)
          .post('/auth/login')
          .send({
            email: 'throttle@example.com',
            password: 'WrongPassword',
          });

        expect(attempt.status).toBe(401);
      }

      const throttled = await request(app)
        .post('/auth/login')
        .send({
          email: 'throttle@example.com',
          password: 'WrongPassword',
        });

      expect(throttled.status).toBe(429);
      expect(throttled.body.error).toBe('too_many_attempts');
      expect(throttled.body.code).toBe('AUTH_THROTTLED');
      expect(throttled.body.retryAfter).toBeGreaterThan(0);
      expect(Number(throttled.headers['retry-after'])).toBe(throttled.body.retryAfter);
    });
  });

  describe('POST /auth/admin/forgot-password', () => {
    it('should return a generic response for unknown accounts', async () => {
      vi.mocked(UserModelMongo.findByEmail).mockResolvedValue(null);

      const res = await request(app)
        .post('/auth/admin/forgot-password')
        .send({ email: 'unknown@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('If an admin account exists');
    });

    it('throttles repeated forgot-password abuse attempts', async () => {
      vi.mocked(UserModelMongo.findByEmail).mockResolvedValue(null);

      for (let index = 0; index < 4; index += 1) {
        const response = await request(app)
          .post('/auth/admin/forgot-password')
          .send({ email: 'unknown@example.com' });

        expect(response.status).toBe(200);
      }

      const throttled = await request(app)
        .post('/auth/admin/forgot-password')
        .send({ email: 'unknown@example.com' });

      expect(throttled.status).toBe(429);
      expect(throttled.body.code).toBe('AUTH_THROTTLED');
      expect(throttled.body.retryAfter).toBeGreaterThan(0);
      expect(Number(throttled.headers['retry-after'])).toBe(throttled.body.retryAfter);
    });
  });

  describe('POST /auth/admin/reset-password', () => {
    it('should reset password with a valid reset token', async () => {
      const mockAdmin = {
        id: 'admin-1',
        email: 'admin@example.com',
        username: 'Admin',
        role: 'admin',
        isActive: true,
      };
      const token = 'token-reset-1234567890';
      const tokenHash = crypto
        .createHmac('sha256', 'backup-salt')
        .update(token)
        .digest('hex');
      await RedisCache.set(`auth:admin_password_reset:${mockAdmin.id}`, { tokenHash }, 60);
      vi.mocked(UserModelMongo.findByEmail).mockResolvedValue(mockAdmin as any);
      vi.mocked(UserModelMongo.update).mockResolvedValue(mockAdmin as any);

      const res = await request(app)
        .post('/auth/admin/reset-password')
        .send({
          email: 'admin@example.com',
          token,
          password: 'NewPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password reset successful');
      expect(UserModelMongo.update).toHaveBeenCalledWith(mockAdmin.id, { password: 'NewPassword123!' });
    });

    it('should reject password reset when password is reused', async () => {
      const mockAdmin = {
        id: 'admin-2',
        email: 'admin2@example.com',
        username: 'Admin',
        role: 'admin',
        isActive: true,
      };
      const token = 'token-reset-0987654321';
      const tokenHash = crypto
        .createHmac('sha256', 'backup-salt')
        .update(token)
        .digest('hex');
      await RedisCache.set(`auth:admin_password_reset:${mockAdmin.id}`, { tokenHash }, 60);
      vi.mocked(UserModelMongo.findByEmail).mockResolvedValue(mockAdmin as any);
      vi.mocked(UserModelMongo.isPasswordReused).mockResolvedValue(true);

      const res = await request(app)
        .post('/auth/admin/reset-password')
        .send({
          email: 'admin2@example.com',
          token,
          password: 'OldPassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('password_reuse_forbidden');
    });

    it('throttles repeated reset-password failures', async () => {
      const mockAdmin = {
        id: 'admin-3',
        email: 'admin3@example.com',
        username: 'Admin',
        role: 'admin',
        isActive: true,
      };
      vi.mocked(UserModelMongo.findByEmail).mockResolvedValue(mockAdmin as any);

      for (let index = 0; index < 4; index += 1) {
        const response = await request(app)
          .post('/auth/admin/reset-password')
          .send({
            email: mockAdmin.email,
            token: `bad-token-${index}-01234567890123456789`,
            password: 'NewPassword123!',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('invalid_or_expired_reset_token');
      }

      const throttled = await request(app)
        .post('/auth/admin/reset-password')
        .send({
          email: mockAdmin.email,
          token: 'bad-token-final-01234567890123456789',
          password: 'NewPassword123!',
        });

      expect(throttled.status).toBe(429);
      expect(throttled.body.error).toBe('too_many_attempts');
      expect(throttled.body.code).toBe('AUTH_THROTTLED');
      expect(throttled.body.retryAfter).toBeGreaterThan(0);
      expect(Number(throttled.headers['retry-after'])).toBe(throttled.body.retryAfter);
    });
  });

  describe('POST /auth/admin/step-up', () => {
    it('issues step-up token for valid admin credentials', async () => {
      const adminUser = {
        id: 'admin-stepup-1',
        email: 'admin-step@example.com',
        username: 'Admin',
        role: 'admin',
        isActive: true,
        twoFactorEnabled: false,
      };
      const authToken = jwt.sign(
        {
          userId: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
        },
        'test-secret',
        { expiresIn: '1h' }
      );
      vi.mocked(UserModelMongo.findByIdWithSecrets).mockResolvedValue(adminUser as any);
      vi.mocked(UserModelMongo.verifyPasswordById).mockResolvedValue(true);

      const res = await request(app)
        .post('/auth/admin/step-up')
        .set('Cookie', [`admin_auth_token=${authToken}`])
        .send({
          email: adminUser.email,
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeTypeOf('string');
      expect(res.body.data.expiresAt).toBeTypeOf('string');
    });

    it('throttles repeated invalid step-up attempts', async () => {
      const adminUser = {
        id: 'admin-stepup-2',
        email: 'admin-throttle@example.com',
        username: 'Admin',
        role: 'admin',
        isActive: true,
        twoFactorEnabled: false,
      };
      const authToken = jwt.sign(
        {
          userId: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
        },
        'test-secret',
        { expiresIn: '1h' }
      );

      vi.mocked(UserModelMongo.findByIdWithSecrets).mockResolvedValue(adminUser as any);
      vi.mocked(UserModelMongo.verifyPasswordById).mockResolvedValue(false);

      for (let index = 0; index < 3; index += 1) {
        const response = await request(app)
          .post('/auth/admin/step-up')
          .set('Cookie', [`admin_auth_token=${authToken}`])
          .send({
            email: adminUser.email,
            password: 'WrongPassword123!',
          });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Invalid credentials');
      }

      const throttled = await request(app)
        .post('/auth/admin/step-up')
        .set('Cookie', [`admin_auth_token=${authToken}`])
        .send({
          email: adminUser.email,
          password: 'WrongPassword123!',
        });

      expect(throttled.status).toBe(429);
      expect(throttled.body.error).toBe('too_many_attempts');
      expect(throttled.body.code).toBe('AUTH_THROTTLED');
      expect(throttled.body.retryAfter).toBeGreaterThan(0);
      expect(Number(throttled.headers['retry-after'])).toBe(throttled.body.retryAfter);
    });
  });
});
