import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockAdminUser,
  sessionStore,
  batchUpdateMock,
  findByIdMock,
  findByIdsAdminMock,
  updateAnnouncementMock,
  getPendingSlaSummaryMock,
  listAdminApprovalRequestsMock,
  getAdminApprovalWorkflowSummaryMock,
  approveAdminApprovalRequestMock,
  rejectAdminApprovalRequestMock,
  terminateAdminSessionMock,
  terminateOtherSessionsMock,
  recordAdminAuditMock,
  verifyAdminAuditLedgerMock,
  getAdminSloSnapshotMock,
  healthCheckMock,
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
  const findByIdMock = vi.fn();
  const findByIdsAdminMock = vi.fn();
  const updateAnnouncementMock = vi.fn();
  const getPendingSlaSummaryMock = vi.fn();
  const listAdminApprovalRequestsMock = vi.fn();
  const getAdminApprovalWorkflowSummaryMock = vi.fn();
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
  const verifyAdminAuditLedgerMock = vi.fn();
  const getAdminSloSnapshotMock = vi.fn();
  const healthCheckMock = vi.fn();
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
    findByIdMock,
    findByIdsAdminMock,
    updateAnnouncementMock,
    getPendingSlaSummaryMock,
    listAdminApprovalRequestsMock,
    getAdminApprovalWorkflowSummaryMock,
    approveAdminApprovalRequestMock,
    rejectAdminApprovalRequestMock,
    terminateAdminSessionMock,
    terminateOtherSessionsMock,
    recordAdminAuditMock,
    verifyAdminAuditLedgerMock,
    getAdminSloSnapshotMock,
    healthCheckMock,
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
    findById: findByIdMock,
    findByIdsAdmin: findByIdsAdminMock,
    update: updateAnnouncementMock,
    getPendingSlaSummary: getPendingSlaSummaryMock,
  },
}));

vi.mock('../services/adminApprovals.js', () => ({
  listAdminApprovalRequests: listAdminApprovalRequestsMock,
  getAdminApprovalWorkflowSummary: getAdminApprovalWorkflowSummaryMock,
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
  verifyAdminAuditLedger: verifyAdminAuditLedgerMock,
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
  healthCheck: healthCheckMock,
}));

vi.mock('../middleware/responseTime.js', () => ({
  getAdminSloSnapshot: getAdminSloSnapshotMock,
}));

import adminRouter from '../routes/admin.js';

const app = express();
app.use(express.json());
app.use('/api/admin', adminRouter);

describe('Admin post-login contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStore.clear();
    batchUpdateMock.mockResolvedValue({ updated: 1, errors: [] });
    findByIdMock.mockResolvedValue(null);
    findByIdsAdminMock.mockResolvedValue([]);
    updateAnnouncementMock.mockResolvedValue(null);
    getPendingSlaSummaryMock.mockResolvedValue({
      pendingTotal: 0,
      averageDays: 0,
      buckets: { lt1: 0, d1_3: 0, d3_7: 0, gt7: 0 },
      stale: [],
    });
    getAdminApprovalWorkflowSummaryMock.mockResolvedValue({
      totals: { pending: 0, approved: 0, rejected: 0, executed: 0, expired: 0 },
      pending: 0,
      approvedPendingExecution: 0,
      overdue: 0,
      dueSoon: 0,
    });
    verifyAdminAuditLedgerMock.mockResolvedValue({
      valid: true,
      checked: 0,
      headHash: null,
      tailHash: null,
    });
    getAdminSloSnapshotMock.mockReturnValue({
      windowMinutes: 15,
      requestCount: 0,
      errorRatePct: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0,
      objectives: { p95TargetMs: 1200, errorRateTargetPct: 1 },
      status: { meetsP95: true, meetsErrorRate: true, healthy: true },
    });
    healthCheckMock.mockResolvedValue(true);

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

  it('supports dry-run previews for bulk updates without mutating data', async () => {
    findByIdsAdminMock.mockResolvedValue([
      {
        _id: { toString: () => 'announcement-1' },
        title: 'Existing title',
        status: 'draft',
        publishAt: null,
        isActive: true,
      },
    ]);

    const response = await request(app)
      .post('/api/admin/announcements/bulk')
      .set('x-admin-step-up-token', 'stepup-token')
      .send({
        ids: ['announcement-1', 'announcement-missing'],
        dryRun: true,
        data: {
          status: 'scheduled',
          publishAt: '2026-03-01T09:00:00.000Z',
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.data?.dryRun).toBe(true);
    expect(response.body.data?.preview?.totalTargets).toBe(1);
    expect(response.body.data?.missingIds).toEqual(['announcement-missing']);
    expect(batchUpdateMock).not.toHaveBeenCalled();
  });

  it('supports dry-run previews for bulk approve and reject actions', async () => {
    findByIdsAdminMock.mockResolvedValue([
      {
        _id: { toString: () => 'announcement-1' },
        title: 'Publish candidate',
        status: 'pending',
        publishAt: null,
        approvedAt: null,
        approvedBy: null,
      },
    ]);

    let response = await request(app)
      .post('/api/admin/announcements/bulk-approve')
      .set('x-admin-step-up-token', 'stepup-token')
      .send({
        ids: ['announcement-1'],
        dryRun: true,
        note: 'Publish after validation',
      });

    expect(response.status).toBe(200);
    expect(response.body.data?.dryRun).toBe(true);
    expect(batchUpdateMock).not.toHaveBeenCalled();

    response = await request(app)
      .post('/api/admin/announcements/bulk-reject')
      .set('x-admin-step-up-token', 'stepup-token')
      .send({
        ids: ['announcement-1'],
        dryRun: true,
        note: 'Needs rewrite',
      });

    expect(response.status).toBe(200);
    expect(response.body.data?.dryRun).toBe(true);
    expect(batchUpdateMock).not.toHaveBeenCalled();
  });

  it('returns admin SLO snapshot and dependency status', async () => {
    getAdminSloSnapshotMock.mockReturnValueOnce({
      windowMinutes: 15,
      requestCount: 42,
      errorRatePct: 0.5,
      p50Ms: 120,
      p95Ms: 300,
      p99Ms: 450,
      objectives: { p95TargetMs: 1200, errorRateTargetPct: 1 },
      status: { meetsP95: true, meetsErrorRate: true, healthy: true },
    });

    const response = await request(app).get('/api/admin/slo');

    expect(response.status).toBe(200);
    expect(response.body.data?.requestCount).toBe(42);
    expect(['ok', 'degraded', 'not_configured']).toContain(response.body.data?.synthetic?.status);
    expect(typeof response.body.data?.synthetic?.dbConfigured).toBe('boolean');
  });

  it('returns workflow overview with queue, approval, and session summaries', async () => {
    getPendingSlaSummaryMock.mockResolvedValueOnce({
      pendingTotal: 6,
      averageDays: 2,
      buckets: { lt1: 2, d1_3: 2, d3_7: 1, gt7: 1 },
      stale: [],
    });
    getAdminApprovalWorkflowSummaryMock.mockResolvedValueOnce({
      totals: { pending: 3, approved: 1, rejected: 0, executed: 0, expired: 0 },
      pending: 3,
      approvedPendingExecution: 1,
      overdue: 1,
      dueSoon: 2,
    });

    const response = await request(app).get('/api/admin/workflow/overview?staleLimit=5&dueSoonMinutes=45');

    expect(response.status).toBe(200);
    expect(response.body.data?.reviewQueue?.pendingTotal).toBe(6);
    expect(response.body.data?.approvals?.dueSoon).toBe(2);
    expect(response.body.data?.sessions?.total).toBe(2);
    expect(getPendingSlaSummaryMock).toHaveBeenCalledWith({
      includeInactive: true,
      staleLimit: 5,
    });
    expect(getAdminApprovalWorkflowSummaryMock).toHaveBeenCalledWith({ dueSoonMinutes: 45 });
  });

  it('returns audit ledger integrity report', async () => {
    verifyAdminAuditLedgerMock.mockResolvedValueOnce({
      valid: true,
      checked: 123,
      headHash: 'hash-1',
      tailHash: 'hash-123',
    });

    const response = await request(app).get('/api/admin/audit-log/integrity?limit=123');

    expect(response.status).toBe(200);
    expect(response.body.data?.valid).toBe(true);
    expect(verifyAdminAuditLedgerMock).toHaveBeenCalledWith(123);
  });

  it('supports rollback dry-run previews and executes rollback updates', async () => {
    findByIdMock.mockResolvedValue({
      id: 'announcement-1',
      title: 'Current title',
      type: 'job',
      category: 'Central Government',
      organization: 'Org',
      status: 'published',
      version: 5,
      versions: [
        {
          version: 4,
          updatedAt: '2026-02-01T10:00:00.000Z',
          snapshot: {
            title: 'Previous title',
            type: 'job',
            category: 'Central Government',
            organization: 'Org',
            content: 'Legacy content',
            externalLink: 'https://example.com/job',
            location: 'Delhi',
            deadline: '2026-03-20T00:00:00.000Z',
            minQualification: 'Graduate',
            ageLimit: '18-30',
            applicationFee: '100',
            salaryMin: 10000,
            salaryMax: 25000,
            difficulty: 'easy',
            cutoffMarks: '72',
            totalPosts: 40,
            status: 'pending',
            publishAt: '',
            approvedAt: '',
            approvedBy: '',
            tags: [{ id: 1, name: 'upsc', slug: 'upsc' }],
            importantDates: [
              { id: 'date-1', announcementId: 'announcement-1', eventName: 'Apply Start', eventDate: '2026-02-10T00:00:00.000Z' },
            ],
            jobDetails: { eligibility: 'Any graduate' },
            isActive: true,
          },
        },
      ],
    });

    let response = await request(app)
      .post('/api/admin/announcements/announcement-1/rollback')
      .set('x-admin-step-up-token', 'stepup-token')
      .send({ version: 4, dryRun: true });

    expect(response.status).toBe(200);
    expect(response.body.data?.dryRun).toBe(true);
    expect(response.body.data?.targetVersion).toBe(4);
    expect(updateAnnouncementMock).not.toHaveBeenCalled();

    updateAnnouncementMock.mockResolvedValueOnce({
      id: 'announcement-1',
      title: 'Previous title',
      status: 'pending',
      version: 6,
    });

    response = await request(app)
      .post('/api/admin/announcements/announcement-1/rollback')
      .set('x-admin-step-up-token', 'stepup-token')
      .send({ version: 4, note: 'Rollback after QA mismatch' });

    expect(response.status).toBe(200);
    expect(response.body.data?.title).toBe('Previous title');
    expect(updateAnnouncementMock).toHaveBeenCalledWith(
      'announcement-1',
      expect.objectContaining({
        title: 'Previous title',
        status: 'pending',
        note: 'Rollback after QA mismatch',
      }),
      'admin-1'
    );
    expect(recordAdminAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'rollback',
        announcementId: 'announcement-1',
      })
    );
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
