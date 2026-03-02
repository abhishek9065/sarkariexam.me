import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    batchUpdateMock,
    findByIdsAdminMock,
    findByIdMock,
    updateMock,
    recordAdminAuditMock,
    getCollectionMock,
} = vi.hoisted(() => ({
    batchUpdateMock: vi.fn(),
    findByIdsAdminMock: vi.fn(),
    findByIdMock: vi.fn(),
    updateMock: vi.fn(),
    recordAdminAuditMock: vi.fn().mockResolvedValue(undefined),
    getCollectionMock: vi.fn(),
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
        batchUpdate: batchUpdateMock,
        findById: findByIdMock,
        update: updateMock,
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
        findByIds: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        delete: vi.fn(),
        listRevisions: vi.fn().mockResolvedValue([]),
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
    recordAdminAudit: recordAdminAuditMock,
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
    SecurityLogger: { log: vi.fn() },
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
    recordAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/cosmosdb.js', () => ({
    getCollection: getCollectionMock,
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

describe('admin critical mutation flows', () => {
    const app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);

    beforeEach(() => {
        vi.clearAllMocks();
        getCollectionMock.mockReturnValue({
            find: vi.fn(() => ({
                toArray: vi.fn().mockResolvedValue([]),
            })),
            countDocuments: vi.fn().mockResolvedValue(0),
        });
    });

    it('bulk approve updates announcements and records request context in audit metadata', async () => {
        findByIdsAdminMock.mockResolvedValue([
            {
                _id: { toString: () => 'a1' },
                title: 'SSC CGL 2026',
                type: 'job',
                category: 'SSC',
                organization: 'SSC',
                status: 'pending',
                externalLink: 'https://example.com/apply',
                content: 'Notification available. Important dates and eligibility details.',
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                importantDates: [{ eventName: 'Apply last date', eventDate: new Date().toISOString() }],
                minQualification: 'Graduate',
                jobDetails: {},
            },
        ]);
        batchUpdateMock.mockResolvedValue({ updated: 1, errors: [] });

        const response = await request(app)
            .post('/api/admin/announcements/bulk-approve')
            .set('x-request-id', 'req-critical-bulk-approve')
            .send({ ids: ['a1'], note: 'Approved in batch' });

        expect(response.status).toBe(200);
        expect(batchUpdateMock).toHaveBeenCalledTimes(1);
        expect(recordAdminAuditMock).toHaveBeenCalledWith(expect.objectContaining({
            action: 'bulk_approve',
            metadata: expect.objectContaining({
                requestId: 'req-critical-bulk-approve',
                endpoint: '/api/admin/announcements/bulk-approve',
                method: 'POST',
            }),
        }));
    });

    it('bulk reject updates announcements and records request context in audit metadata', async () => {
        batchUpdateMock.mockResolvedValue({ updated: 2, errors: [] });

        const response = await request(app)
            .post('/api/admin/announcements/bulk-reject')
            .set('x-request-id', 'req-critical-bulk-reject')
            .send({ ids: ['a1', 'a2'], note: 'Needs edits' });

        expect(response.status).toBe(200);
        expect(batchUpdateMock).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    id: 'a1',
                    data: expect.objectContaining({ status: 'draft' }),
                }),
            ]),
            'admin-user-1',
        );
        expect(recordAdminAuditMock).toHaveBeenCalledWith(expect.objectContaining({
            action: 'bulk_reject',
            metadata: expect.objectContaining({
                requestId: 'req-critical-bulk-reject',
                endpoint: '/api/admin/announcements/bulk-reject',
                method: 'POST',
            }),
        }));
    });

    it('rollback to a draft version succeeds and records request context in audit metadata', async () => {
        findByIdMock.mockResolvedValue({
            id: 'a1',
            title: 'UP Police Constable',
            status: 'published',
            versions: [
                {
                    version: 2,
                    snapshot: {
                        title: 'UP Police Constable (Draft)',
                        type: 'job',
                        category: 'Police',
                        organization: 'UPPRPB',
                        status: 'draft',
                        tags: ['up-police'],
                        importantDates: [],
                    },
                },
            ],
        });
        updateMock.mockResolvedValue({
            id: 'a1',
            title: 'UP Police Constable (Draft)',
            status: 'draft',
        });

        const response = await request(app)
            .post('/api/admin/announcements/a1/rollback')
            .set('x-request-id', 'req-critical-rollback')
            .send({ version: 2, note: 'Rollback for correction' });

        expect(response.status).toBe(200);
        expect(updateMock).toHaveBeenCalledWith(
            'a1',
            expect.objectContaining({
                title: 'UP Police Constable (Draft)',
                status: 'draft',
            }),
            'admin-user-1',
        );
        expect(recordAdminAuditMock).toHaveBeenCalledWith(expect.objectContaining({
            action: 'rollback',
            metadata: expect.objectContaining({
                requestId: 'req-critical-rollback',
                endpoint: '/api/admin/announcements/a1/rollback',
                method: 'POST',
            }),
        }));
    });
});
