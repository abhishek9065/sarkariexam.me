import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockAdminUser,
  sessionStore,
  batchUpdateMock,
  listAdminApprovalRequestsMock,
  approveAdminApprovalRequestMock,
  rejectAdminApprovalRequestMock,
  terminateAdminSessionMock,
  terminateOtherSessionsMock,
  recordAdminAuditMock,
  mapSessionForClientMock,
} = vi.hoisted(() => {
  const mockAdminUser = {
    userId: 'admin-1',
    email: 'admin@example.com',
    role: 'admin',
    sessionId: 'session-current',
  };

  const sessionStore = new Map<string, any>();
  const batchUpdateMock = vi.fn();
  const listAdminApprovalRequestsMock = vi.fn();
  const approveAdminApprovalRequestMock = vi.fn();
  const rejectAdminApprovalRequestMock = vi.fn();
  const terminateAdminSessionMock = vi.fn((sessionId: string) => sessionStore.delete(sessionId));
  const terminateOtherSessionsMock = vi.fn((userId: string, currentSessionId?: string | null) => {
    let removed = 0;
    for (const [id, record] of sessionStore.entries()) {
      if (record.userId !== userId) continue;
      if (currentSessionId && id === currentSessionId) continue;
      sessionStore.delete(id);
      removed += 1;
    }
    return removed;
  });
  const recordAdminAuditMock = vi.fn().mockResolvedValue(undefined);
  const mapSessionForClientMock = (record: any, currentSessionId?: string | null) => {
    return {
      id: record.id,
      userId: record.userId,
      email: record.email,
      ip: record.ip,
      userAgent: record.userAgent,
      device: record.device,
      browser: record.browser,
      os: record.os,
      loginTime: record.createdAt.toISOString(),
      lastActivity: record.lastSeen.toISOString(),
      expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
      isActive: true,
      isCurrentSession: record.id === currentSessionId,
      riskScore: 'low',
      actions: record.actions,
    };
  };

  return {
    mockAdminUser,
    sessionStore,
    batchUpdateMock,
    listAdminApprovalRequestsMock,
    approveAdminApprovalRequestMock,
    rejectAdminApprovalRequestMock,
    terminateAdminSessionMock,
    terminateOtherSessionsMock,
    recordAdminAuditMock,
    mapSessionForClientMock,
  };
});

vi.mock('../middleware/auth.js', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { ...mockAdminUser };
    next();
  },
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
  requireAdminStepUp: (req: any, res: any, next: any) => {
    if (!req.get('x-admin-step-up-token')) {
      return res.status(403).json({ error: 'step_up_required' });
    }
    return next();
  },
}));

vi.mock('../middleware/idempotency.js', () => ({
  idempotency: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../models/announcements.mongo.js', () => ({
  AnnouncementModelMongo: {
    batchUpdate: batchUpdateMock,
  },
}));

vi.mock('../services/adminApprovals.js', () => ({
  listAdminApprovalRequests: listAdminApprovalRequestsMock,
  approveAdminApprovalRequest: approveAdminApprovalRequestMock,
  rejectAdminApprovalRequest: rejectAdminApprovalRequestMock,
  createAdminApprovalRequest: vi.fn(),
  validateApprovalForExecution: vi.fn().mockResolvedValue({ ok: true }),
  markAdminApprovalExecuted: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/adminApprovalPolicy.js', () => ({
  evaluateAdminApprovalRequirement: vi.fn().mockReturnValue({
    required: false,
    risk: 'low',
    reason: 'policy_disabled',
    rule: {
      enabled: false,
      risk: 'low',
      bypassRoles: [],
      minTargets: 1,
    },
  }),
}));

vi.mock('../services/adminAudit.js', () => ({
  getAdminAuditLogsPaged: vi.fn(),
  recordAdminAudit: recordAdminAuditMock,
}));

vi.mock('../services/securityLogger.js', () => ({
  SecurityLogger: {
    log: vi.fn(),
  },
}));

vi.mock('../services/adminSessions.js', () => ({
  listAdminSessions: () => Array.from(sessionStore.values()),
  getAdminSession: (sessionId?: string | null) => (sessionId ? sessionStore.get(sessionId) ?? null : null),
  mapSessionForClient: mapSessionForClientMock,
  terminateAdminSession: terminateAdminSessionMock,
  terminateOtherSessions: terminateOtherSessionsMock,
}));

vi.mock('../services/activeUsers.js', () => ({
  getActiveUsersStats: vi.fn(),
}));

vi.mock('../services/analytics.js', () => ({
  getDailyRollups: vi.fn(),
}));

vi.mock('../services/cosmosdb.js', () => ({
  getCollection: vi.fn(),
}));

import adminRouter from '../routes/admin.js';

const app = express();
app.use(express.json());
app.use('/api/admin', adminRouter);

describe('Admin post-login contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStore.clear();
    const now = new Date('2026-02-08T10:00:00.000Z');
    sessionStore.set('session-current', {
      id: 'session-current',
      userId: 'admin-1',
      email: 'admin@example.com',
      ip: '127.0.0.1',
      userAgent: 'Chrome',
      device: 'Desktop',
      browser: 'Chrome',
      os: 'Windows',
      createdAt: now,
      lastSeen: now,
      expiresAt: null,
      actions: ['/api/admin/dashboard'],
    });
    sessionStore.set('session-secondary', {
      id: 'session-secondary',
      userId: 'admin-1',
      email: 'admin@example.com',
      ip: '127.0.0.2',
      userAgent: 'Chrome',
      device: 'Desktop',
      browser: 'Chrome',
      os: 'Windows',
      createdAt: now,
      lastSeen: now,
      expiresAt: null,
      actions: ['/api/admin/announcements'],
    });
  });

  it('validates bulk schedule payloads and reports publishAt errors', async () => {
    const response = await request(app)
      .post('/api/admin/announcements/bulk')
      .set('x-admin-step-up-token', 'stepup-token')
      .send({
        ids: ['announcement-1'],
        data: { status: 'scheduled' },
      });

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).toContain('publishAt is required for scheduled announcements');
    expect(batchUpdateMock).not.toHaveBeenCalled();
  });

  it('accepts bulk scheduling with publishAt and returns updated data', async () => {
    batchUpdateMock.mockResolvedValue([
      { id: 'announcement-1', status: 'scheduled', publishAt: '2026-03-01T09:00:00.000Z' },
    ]);

    const response = await request(app)
      .post('/api/admin/announcements/bulk')
      .set('x-admin-step-up-token', 'stepup-token')
      .send({
        ids: ['announcement-1'],
        data: {
          status: 'scheduled',
          publishAt: '2026-03-01T09:00:00.000Z',
        },
      });

    expect(response.status).toBe(200);
    expect(batchUpdateMock).toHaveBeenCalledWith(
      [
        {
          id: 'announcement-1',
          data: {
            status: 'scheduled',
            publishAt: '2026-03-01T09:00:00.000Z',
          },
        },
      ],
      'admin-1'
    );
    expect(response.body.data?.[0]?.status).toBe('scheduled');
  });

  it('returns approvals list with stable pagination metadata', async () => {
    listAdminApprovalRequestsMock.mockResolvedValue({
      data: [
        {
          id: 'approval-1',
          actionType: 'announcement_bulk_publish',
          targetIds: ['announcement-1'],
          status: 'pending',
          requestedByEmail: 'editor@example.com',
          requestedAt: '2026-02-08T09:00:00.000Z',
          expiresAt: '2026-02-08T09:30:00.000Z',
        },
      ],
      total: 1,
    });

    const response = await request(app).get('/api/admin/approvals?status=all&limit=25&offset=5');

    expect(response.status).toBe(200);
    expect(response.body.meta).toEqual({ total: 1, limit: 25, offset: 5 });
    expect(response.body.data).toHaveLength(1);
    expect(listAdminApprovalRequestsMock).toHaveBeenCalledWith({ status: 'all', limit: 25, offset: 5 });
  });

  it('maps approval resolve failures to precise status codes', async () => {
    approveAdminApprovalRequestMock.mockResolvedValueOnce({ ok: false, reason: 'not_found' });
    let response = await request(app)
      .post('/api/admin/approvals/approval-404/approve')
      .set('x-admin-step-up-token', 'stepup-token')
      .send({});

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('approval_failed');
    expect(response.body.code).toBe('approval_not_found');

    approveAdminApprovalRequestMock.mockResolvedValueOnce({ ok: false, reason: 'invalid_status:executed' });
    response = await request(app)
      .post('/api/admin/approvals/approval-409/approve')
      .set('x-admin-step-up-token', 'stepup-token')
      .send({});

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('approval_failed');
    expect(response.body.code).toBe('approval_invalid_status');
  });

  it('maps rejection failures to precise status codes', async () => {
    rejectAdminApprovalRequestMock.mockResolvedValueOnce({ ok: false, reason: 'not_found' });

    const response = await request(app)
      .post('/api/admin/approvals/approval-404/reject')
      .set('x-admin-step-up-token', 'stepup-token')
      .send({ reason: 'Not allowed' });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('approval_reject_failed');
    expect(response.body.code).toBe('approval_not_found');
  });

  it('blocks terminating the current session and supports terminate-others', async () => {
    let response = await request(app)
      .post('/api/admin/sessions/terminate')
      .set('x-admin-step-up-token', 'stepup-token')
      .send({ sessionId: 'session-current' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('cannot_terminate_current_session');
    expect(terminateAdminSessionMock).not.toHaveBeenCalled();

    response = await request(app)
      .post('/api/admin/sessions/terminate-others')
      .set('x-admin-step-up-token', 'stepup-token')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.removed).toBe(1);
    expect(sessionStore.has('session-current')).toBe(true);
    expect(sessionStore.has('session-secondary')).toBe(false);
  });
});
