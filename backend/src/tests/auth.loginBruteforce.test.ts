import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  verifyPasswordMock,
  clearFailedLoginsWithEmailMock,
  recordFailedLoginWithEmailMock,
  getClientIPMock,
  bruteForceProtectionImpl,
} = vi.hoisted(() => ({
  verifyPasswordMock: vi.fn(),
  clearFailedLoginsWithEmailMock: vi.fn(),
  recordFailedLoginWithEmailMock: vi.fn(),
  getClientIPMock: vi.fn(() => '203.0.113.9'),
  bruteForceProtectionImpl: vi.fn((req: any, _res: any, next: any) => next()),
}));

vi.mock('../models/users.mongo.js', () => ({
  UserModelMongo: {
    verifyPassword: verifyPasswordMock,
  },
}));

vi.mock('../middleware/security.js', () => ({
  bruteForceProtection: (req: any, res: any, next: any) => bruteForceProtectionImpl(req, res, next),
  clearFailedLoginsWithEmail: clearFailedLoginsWithEmailMock,
  getClientIP: getClientIPMock,
  recordFailedLoginWithEmail: recordFailedLoginWithEmailMock,
}));

import authRouter from '../routes/auth.js';

const createAuthApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
};

describe('auth/login brute-force flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClientIPMock.mockReturnValue('203.0.113.9');
    bruteForceProtectionImpl.mockImplementation((req: any, _res: any, next: any) => next());
  });

  it('records failed login attempts and returns 401 for invalid credentials', async () => {
    const app = createAuthApp();
    verifyPasswordMock.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'wrong-pass' });

    expect(response.status).toBe(401);
    expect(recordFailedLoginWithEmailMock).toHaveBeenCalledWith('203.0.113.9', 'user@example.com');
    expect(clearFailedLoginsWithEmailMock).not.toHaveBeenCalled();
  });

  it('returns 429 when brute-force middleware marks request as blocked', async () => {
    const app = createAuthApp();
    verifyPasswordMock.mockResolvedValue(null);
    bruteForceProtectionImpl.mockImplementation((req: any, _res: any, next: any) => {
      req.bruteForceBlocked = true;
      req.bruteForceWaitMinutes = 17;
      next();
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'wrong-pass' });

    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Too many failed attempts');
    expect(response.body.retryAfterMinutes).toBe(17);
    expect(recordFailedLoginWithEmailMock).toHaveBeenCalledWith('203.0.113.9', 'user@example.com');
  });

  it('clears failed login counters on successful login', async () => {
    const app = createAuthApp();
    verifyPasswordMock.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      username: 'User',
      role: 'user',
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'Valid1!Pass' });

    expect(response.status).toBe(200);
    expect(clearFailedLoginsWithEmailMock).toHaveBeenCalledWith('203.0.113.9', 'user@example.com');
    expect(recordFailedLoginWithEmailMock).not.toHaveBeenCalled();
  });
});
