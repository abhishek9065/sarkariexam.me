import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    findByIdsAdminMock,
    recordAnalyticsEventMock,
} = vi.hoisted(() => ({
    findByIdsAdminMock: vi.fn(),
    recordAnalyticsEventMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../middleware/auth.js', () => ({
    authenticateToken: (req: any, _res: any, next: any) => {
        req.user = {
            userId: 'admin-user-1',
            email: 'admin@example.com',
            role: 'admin',
            sessionId: 'session-1',
        };
        next();
    },
    requirePermission: () => (_req: any, _res: any, next: any) => next(),
    requireAdminStepUp: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../middleware/idempotency.js', () => ({
    idempotency: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../models/announcements.mongo.js', () => ({
    AnnouncementModelMongo: {
        findByIdsAdmin: findByIdsAdminMock,
        findAllAdmin: vi.fn().mockResolvedValue([]),
        countAdmin: vi.fn().mockResolvedValue(0),
        getPendingSlaSummary: vi.fn().mockResolvedValue({
            pendingTotal: 0,
            averageDays: 0,
            buckets: { lt1: 0, d1_3: 0, d3_7: 0, gt7: 0 },
            stale: [],
        }),
        getAdminCounts: vi.fn().mockResolvedValue({
            total: 0,
            byStatus: { draft: 0, pending: 0, scheduled: 0, published: 0, archived: 0 },
            byType: { job: 0, result: 0, 'admit-card': 0, syllabus: 0, 'answer-key': 0, admission: 0 },
        }),
        getAdminQaCounts: vi.fn().mockResolvedValue({ totalQaIssues: 0, pendingQaIssues: 0 }),
        batchUpdate: vi.fn().mockResolvedValue({ updated: 0, errors: [] }),
        findByIds: vi.fn().mockResolvedValue([]),
    },
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

vi.mock('../services/adminApprovals.js', () => ({
    approveAdminApprovalRequest: vi.fn(),
    createAdminApprovalRequest: vi.fn(),
    getAdminApprovalWorkflowSummary: vi.fn().mockResolvedValue({ pending: 0 }),
    listAdminApprovalRequests: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    markAdminApprovalExecuted: vi.fn().mockResolvedValue(undefined),
    rejectAdminApprovalRequest: vi.fn(),
    validateApprovalForExecution: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('../services/adminAudit.js', () => ({
    getAdminAuditLogsPaged: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    recordAdminAudit: vi.fn().mockResolvedValue(undefined),
    verifyAdminAuditLedger: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('../services/subscriberDispatch.js', () => ({
    dispatchAnnouncementToSubscribers: vi.fn().mockResolvedValue({
        matched: 0,
        sent: 0,
        skipped: 0,
        frequency: 'instant',
    }),
}));

vi.mock('../services/securityLogger.js', () => ({
    SecurityLogger: {
        log: vi.fn(),
    },
}));

vi.mock('../services/activeUsers.js', () => ({
    getActiveUsersStats: vi.fn().mockResolvedValue({
        windowMinutes: 15,
        since: new Date().toISOString(),
        total: 0,
        authenticated: 0,
        anonymous: 0,
        admins: 0,
    }),
}));

vi.mock('../services/analytics.js', () => ({
    getDailyRollups: vi.fn().mockResolvedValue([]),
    recordAnalyticsEvent: recordAnalyticsEventMock,
}));

vi.mock('../services/cosmosdb.js', () => ({
    getCollection: vi.fn(() => ({
        countDocuments: vi.fn().mockResolvedValue(0),
    })),
    healthCheck: vi.fn().mockResolvedValue(true),
}));

vi.mock('../services/rbac.js', () => ({
    hasPermission: vi.fn(() => true),
}));

vi.mock('../services/adminSessions.js', () => ({
    getAdminSession: vi.fn(),
    listAdminSessions: vi.fn().mockResolvedValue([]),
    mapSessionForClient: vi.fn((record: any) => record),
    terminateAdminSession: vi.fn().mockResolvedValue(true),
    terminateOtherSessions: vi.fn().mockResolvedValue(0),
}));

vi.mock('../services/cacheInvalidation.js', () => ({
    invalidateAnnouncementCaches: vi.fn().mockResolvedValue(undefined),
}));

import adminRouter from '../routes/admin.js';

describe('admin vNext preview and telemetry endpoints', () => {
    const app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);

    beforeEach(() => {
        vi.clearAllMocks();
        findByIdsAdminMock.mockResolvedValue([
            {
                _id: { toString: () => 'a1' },
                status: 'published',
                title: 'SSC CGL Notification',
                category: 'SSC',
                organization: 'SSC',
                viewCount: 6500,
                updatedAt: new Date().toISOString(),
                postedAt: new Date().toISOString(),
                deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                type: 'job',
            },
            {
                _id: { toString: () => 'a2' },
                status: 'pending',
                title: 'Railway Apprentice 2026',
                category: 'Railway',
                organization: 'RRB',
                viewCount: 250,
                updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                postedAt: new Date().toISOString(),
                type: 'job',
            },
        ]);
    });

    it('returns bulk preview impact summary', async () => {
        const response = await request(app).post('/api/admin/announcements/bulk/preview').send({
            ids: ['a1', 'a2', 'missing'],
            data: { status: 'archived' },
        });

        expect(response.status).toBe(200);
        expect(response.body.data.totalTargets).toBe(2);
        expect(response.body.data.affectedByStatus.published).toBe(1);
        expect(response.body.data.warnings.length).toBeGreaterThan(0);
    });

    it('returns review preview with eligible and blocked ids', async () => {
        const response = await request(app).post('/api/admin/review/preview').send({
            ids: ['a1', 'a2'],
            action: 'schedule',
            scheduleAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

        expect(response.status).toBe(200);
        expect(response.body.data.eligibleIds).toContain('a2');
        expect(response.body.data.blockedIds.length).toBeGreaterThan(0);
    });

    it('accepts telemetry events', async () => {
        const response = await request(app).post('/api/admin/telemetry/events').send({
            type: 'admin_list_loaded',
            metadata: { total: 12 },
        });

        expect(response.status).toBe(202);
        expect(recordAnalyticsEventMock).toHaveBeenCalledTimes(1);
        expect(recordAnalyticsEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'admin_list_loaded',
            })
        );
    });
});

