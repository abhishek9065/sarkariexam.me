import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authState,
  adminAuthLoginHandlerMock,
  terminateAdminSessionMock,
  terminateOtherSessionsMock,
  delegatePayloadForPath,
} = vi.hoisted(() => {
  const authState = {
    includeUserContext: true,
  };

  const adminAuthLoginHandlerMock = vi.fn((req: any, res: any) => {
    if (req.body?.email === 'forbidden@sarkariexams.me') {
      return res.status(403).json({
        error: 'admin_account_required',
        code: 'ADMIN_ACCOUNT_REQUIRED',
      });
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: 'admin-user-1',
          email: 'admin@sarkariexams.me',
          role: 'admin',
        },
      },
    });
  });
  const terminateAdminSessionMock = vi.fn(async () => true);
  const terminateOtherSessionsMock = vi.fn(async () => 2);

  const delegatePayloadForPath = (targetPath: string) => {
    if (targetPath === '/login') {
      return {
        user: {
          id: 'admin-user-1',
          email: 'admin@sarkariexams.me',
          role: 'admin',
        },
      };
    }

    if (targetPath === '/me') {
      return {
        user: {
          id: 'admin-user-1',
          email: 'admin@sarkariexams.me',
          role: 'admin',
        },
      };
    }

    if (targetPath === '/admin/permissions') {
      return {
        role: 'admin',
        permissions: ['*'],
      };
    }

    if (targetPath === '/admin/step-up') {
      return {
        token: 'step-up-token',
        expiresAt: '2099-12-31T23:59:59.000Z',
      };
    }

    return { success: true };
  };

  return {
    authState,
    adminAuthLoginHandlerMock,
    terminateAdminSessionMock,
    terminateOtherSessionsMock,
    delegatePayloadForPath,
  };
});

vi.mock('../middleware/auth.js', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = authState.includeUserContext
      ? {
          userId: 'admin-user-1',
          email: 'admin@sarkariexams.me',
          role: 'admin',
          sessionId: 'session-current',
        }
      : {
          email: 'admin@sarkariexams.me',
          role: 'admin',
          sessionId: 'session-current',
        };
    next();
  },
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
  requireAdminStepUp: (req: any, res: any, next: any) => {
    if (!req.get('x-admin-step-up-token')) {
      return res.status(403).json({
        error: 'step_up_required',
        code: 'STEP_UP_REQUIRED',
      });
    }
    return next();
  },
}));

vi.mock('../services/adminAuth/delegate.js', () => ({
  delegateToAuthRouter: (targetPath: string) => (req: any, res: any) => {
    return res.json({
      success: true,
      data: delegatePayloadForPath(targetPath),
    });
  },
}));

vi.mock('../routes/auth.js', () => ({
  adminAuthLoginHandler: adminAuthLoginHandlerMock,
}));

vi.mock('../services/adminSessions.js', () => ({
  terminateAdminSession: terminateAdminSessionMock,
  terminateOtherSessions: terminateOtherSessionsMock,
}));

import adminAuthRouter from '../routes/admin-auth.js';

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  const requestId = req.get('x-request-id') || 'req-admin-auth-default';
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});
app.use('/api/admin-auth', adminAuthRouter);

describe('admin-auth contract', () => {
  beforeEach(() => {
    authState.includeUserContext = true;
    vi.clearAllMocks();
    adminAuthLoginHandlerMock.mockClear();
    terminateAdminSessionMock.mockResolvedValue(true);
    terminateOtherSessionsMock.mockResolvedValue(2);
  });

  it('uses the dedicated admin login handler under /api/admin-auth/login', async () => {
    const response = await request(app).post('/api/admin-auth/login').send({
      email: 'admin@sarkariexams.me',
      password: 'Password#123',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data?.user?.email).toBe('admin@sarkariexams.me');
    expect(adminAuthLoginHandlerMock).toHaveBeenCalledTimes(1);
  });

  it('rejects non-admin accounts at the admin login boundary', async () => {
    const response = await request(app).post('/api/admin-auth/login').send({
      email: 'forbidden@sarkariexams.me',
      password: 'Password#123',
    });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      error: 'admin_account_required',
      code: 'ADMIN_ACCOUNT_REQUIRED',
    });
  });

  it('delegates me and permissions under /api/admin-auth namespace', async () => {
    const meResponse = await request(app).get('/api/admin-auth/me');
    const permissionsResponse = await request(app).get('/api/admin-auth/permissions');

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.data?.user?.id).toBe('admin-user-1');

    expect(permissionsResponse.status).toBe(200);
    expect(permissionsResponse.body.data?.role).toBe('admin');
  });

  it('delegates step-up and preserves auth contract fields', async () => {
    const response = await request(app)
      .post('/api/admin-auth/step-up')
      .send({ email: 'admin@sarkariexams.me', password: 'Password#123' });

    expect(response.status).toBe(200);
    expect(response.body.data?.token).toBe('step-up-token');
    expect(response.body.data?.expiresAt).toBe('2099-12-31T23:59:59.000Z');
  });

  it('terminates a targeted session under admin-auth boundary', async () => {
    const response = await request(app)
      .post('/api/admin-auth/sessions/terminate')
      .set('x-admin-step-up-token', 'step-up-token')
      .send({ sessionId: 'session-other-1' });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ success: true });
    expect(terminateAdminSessionMock).toHaveBeenCalledWith('session-other-1');
  });

  it('returns additive terminate-others response fields', async () => {
    const response = await request(app)
      .post('/api/admin-auth/sessions/terminate-others')
      .set('x-admin-step-up-token', 'step-up-token');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      success: true,
      removed: 2,
      terminatedCount: 2,
    });
    expect(terminateOtherSessionsMock).toHaveBeenCalledWith('admin-user-1', 'session-current');
  });

  it('returns standardized envelope for validation failures', async () => {
    const response = await request(app)
      .post('/api/admin-auth/sessions/terminate')
      .set('x-request-id', 'req-admin-auth-validation')
      .set('x-admin-step-up-token', 'step-up-token')
      .send({ sessionId: 'bad' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: 'validation_error',
      code: 'VALIDATION_ERROR',
      requestId: 'req-admin-auth-validation',
    });
    expect(typeof response.body.message).toBe('string');
  });

  it('returns standardized envelope when user context is missing', async () => {
    authState.includeUserContext = false;

    const response = await request(app)
      .post('/api/admin-auth/sessions/terminate-others')
      .set('x-request-id', 'req-admin-auth-auth')
      .set('x-admin-step-up-token', 'step-up-token');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      error: 'authentication_required',
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication required.',
      requestId: 'req-admin-auth-auth',
    });
  });

  it('returns standardized envelope for terminate-others failures', async () => {
    terminateOtherSessionsMock.mockRejectedValueOnce(new Error('mongo unavailable'));

    const response = await request(app)
      .post('/api/admin-auth/sessions/terminate-others')
      .set('x-request-id', 'req-admin-auth-server')
      .set('x-admin-step-up-token', 'step-up-token');

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      error: 'session_terminate_others_failed',
      code: 'ADMIN_AUTH_TERMINATE_OTHERS_FAILED',
      message: 'Failed to terminate other sessions.',
      requestId: 'req-admin-auth-server',
    });
  });
});
