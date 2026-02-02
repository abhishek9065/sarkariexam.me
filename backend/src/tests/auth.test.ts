import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserModelMongo } from '../models/users.mongo.js';
import authRouter from '../routes/auth.js';

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
    adminAuthCookieName: 'admin_auth_token',
    adminSetupKey: 'setup-admin-123',
    totpIssuer: 'SarkariExams Admin',
    totpEncryptionKey: 'test-totp-key',
    adminBackupCodeSalt: 'backup-salt',
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
  beforeEach(() => {
    vi.clearAllMocks();
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
  });
});
