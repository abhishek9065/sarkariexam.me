import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    findAllAdminMock,
    countAdminMock,
    getAdminCountsMock,
    getPendingSlaSummaryMock,
    getCollectionMock,
    hasEffectivePermissionMock,
} = vi.hoisted(() => ({
    findAllAdminMock: vi.fn(),
    countAdminMock: vi.fn(),
    getAdminCountsMock: vi.fn(),
    getPendingSlaSummaryMock: vi.fn(),
    getCollectionMock: vi.fn(),
    hasEffectivePermissionMock: vi.fn(),
}));

vi.mock('../middleware/auth.js', () => ({
    authenticateToken: (req: any, _res: any, next: any) => {
        req.user = {
            userId: 'admin-user-1',
            email: 'admin@example.com',
            role: 'editor',
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
        findAllAdmin: findAllAdminMock,
        countAdmin: countAdminMock,
        getAdminCounts: getAdminCountsMock,
        getPendingSlaSummary: getPendingSlaSummaryMock,
        getAdminQaCounts: vi.fn().mockResolvedValue({ totalQaIssues: 0, pendingQaIssues: 0 }),
        findByIdsAdmin: vi.fn().mockResolvedValue([]),
        batchUpdate: vi.fn().mockResolvedValue([]),
        findById: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        update: vi.fn(),
    },
}));

vi.mock('../services/rbac.js', () => ({
    hasEffectivePermission: hasEffectivePermissionMock,
}));

vi.mock('../services/cosmosdb.js', () => ({
    getCollection: getCollectionMock,
    healthCheck: vi.fn().mockResolvedValue(true),
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
    rebuildAdminAuditLedger: vi.fn().mockResolvedValue({ rebuilt: 0, integrity: { valid: true } }),
    recordAdminAudit: vi.fn().mockResolvedValue(undefined),
    verifyAdminAuditLedger: vi.fn().mockResolvedValue({ ok: true }),
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

vi.mock('../services/adminAccess.js', () => ({
    inviteAdminUser: vi.fn(),
    issueAdminPasswordReset: vi.fn(),
    listAdminAccessUsers: vi.fn().mockResolvedValue([]),
    syncAdminAccessMetadata: vi.fn(),
}));

vi.mock('../services/adminPermissions.js', () => ({
    ADMIN_PERMISSION_LIST: [],
    ADMIN_PORTAL_ROLES: ['admin', 'editor', 'contributor', 'reviewer', 'viewer'],
    getAdminPermissionsSnapshot: vi.fn().mockResolvedValue({ role: 'editor', permissions: [] }),
}));

vi.mock('../services/adminRoleOverrides.js', () => ({
    upsertAdminRoleOverride: vi.fn(),
}));

vi.mock('../services/adminSessions.js', () => ({
    getAdminSession: vi.fn(),
    listAdminSessions: vi.fn().mockResolvedValue([]),
    mapSessionForClient: vi.fn((record: any) => record),
    terminateAdminSession: vi.fn().mockResolvedValue(true),
    terminateOtherSessions: vi.fn().mockResolvedValue(0),
}));

vi.mock('../services/adminStepUp.js', () => ({
    revokeAdminStepUpGrantsForUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/analytics.js', () => ({
    getAnnouncementViewTrafficSources: vi.fn().mockResolvedValue([]),
    getDailyRollups: vi.fn().mockResolvedValue([]),
    getTopAnnouncementViews: vi.fn().mockResolvedValue([]),
    recordAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/cacheInvalidation.js', () => ({
    invalidateAnnouncementCaches: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/securityLogger.js', () => ({
    SecurityLogger: {
        log: vi.fn(),
    },
}));

vi.mock('../services/subscriberDispatch.js', () => ({
    dispatchAnnouncementToSubscribers: vi.fn().mockResolvedValue({ matched: 0, sent: 0, skipped: 0 }),
}));

import adminRouter from '../routes/admin.js';

describe('manage posts contracts', () => {
    const app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);

    beforeEach(() => {
        vi.clearAllMocks();
        countAdminMock.mockResolvedValue(0);
        findAllAdminMock.mockResolvedValue([]);
        getAdminCountsMock.mockResolvedValue({
            total: 0,
            byStatus: { draft: 0, pending: 0, scheduled: 0, published: 0, archived: 0 },
            byType: { job: 0, result: 0, 'admit-card': 0, syllabus: 0, 'answer-key': 0, admission: 0 },
        });
        getPendingSlaSummaryMock.mockResolvedValue({
            pendingTotal: 0,
            averageDays: 0,
            buckets: { lt1: 0, d1_3: 0, d3_7: 0, gt7: 0 },
            stale: [],
        });
        getCollectionMock.mockImplementation(() => ({
            countDocuments: vi.fn().mockResolvedValue(2),
        }));
        hasEffectivePermissionMock.mockImplementation(async (_role: string, permission: string) => permission !== 'announcements:approve');
    });

    it('forwards date, author, and assignee filters to the admin list model', async () => {
        const response = await request(app).get('/api/admin/announcements').query({
            status: 'pending',
            dateStart: '2026-03-01',
            dateEnd: '2026-03-07',
            author: 'admin@example.com',
            assignee: 'me',
        });

        expect(response.status).toBe(200);
        expect(findAllAdminMock).toHaveBeenCalledWith(expect.objectContaining({
            status: 'pending',
            author: 'admin@example.com',
            assigneeUserId: 'admin-user-1',
            assigneeEmail: 'admin@example.com',
        }));

        const listFilters = findAllAdminMock.mock.calls[0]?.[0];
        expect(listFilters.dateStart).toBeInstanceOf(Date);
        expect(listFilters.dateEnd).toBeInstanceOf(Date);
        expect(listFilters.dateStart.getFullYear()).toBe(2026);
        expect(listFilters.dateStart.getMonth()).toBe(2);
        expect(listFilters.dateStart.getDate()).toBe(1);
        expect(listFilters.dateStart.getHours()).toBe(0);
        expect(listFilters.dateStart.getMinutes()).toBe(0);
        expect(listFilters.dateEnd.getFullYear()).toBe(2026);
        expect(listFilters.dateEnd.getMonth()).toBe(2);
        expect(listFilters.dateEnd.getDate()).toBe(7);
        expect(listFilters.dateEnd.getHours()).toBe(23);
        expect(listFilters.dateEnd.getMinutes()).toBe(59);
    });

    it('returns a permission-aware manage posts workspace snapshot', async () => {
        findAllAdminMock.mockResolvedValue([
            {
                id: 'ann-p-1',
                title: 'Pending post',
                status: 'pending',
                assigneeEmail: 'admin@example.com',
                reviewDueAt: '2026-03-01T00:00:00.000Z',
            },
            {
                id: 'ann-s-1',
                title: 'Scheduled post',
                status: 'scheduled',
            },
            {
                id: 'ann-live-1',
                title: 'Published post',
                status: 'published',
            },
        ]);
        getAdminCountsMock.mockResolvedValue({
            total: 3,
            byStatus: { draft: 0, pending: 1, scheduled: 1, published: 1, archived: 0 },
            byType: { job: 3, result: 0, 'admit-card': 0, syllabus: 0, 'answer-key': 0, admission: 0 },
        });
        getPendingSlaSummaryMock.mockResolvedValue({
            pendingTotal: 1,
            averageDays: 2.4,
            buckets: { lt1: 0, d1_3: 1, d3_7: 0, gt7: 0 },
            stale: [{ id: 'ann-p-1', title: 'Pending post', type: 'job', ageDays: 3 }],
        });

        const response = await request(app).get('/api/admin/manage-posts/workspace');

        expect(response.status).toBe(200);
        expect(response.body.data.capabilities.announcementsWrite).toBe(true);
        expect(response.body.data.capabilities.announcementsApprove).toBe(false);
        expect(response.body.data.summary.assignedToMe).toBe(1);
        expect(response.body.data.summary.stalePending).toBe(1);
        expect(response.body.data.summary.accessibleSavedViews).toBe(2);
        expect(response.body.data.lanes.find((lane: any) => lane.id === 'my-queue')?.count).toBe(1);
        expect(response.body.data.lanes.find((lane: any) => lane.id === 'published')?.count).toBe(1);
    });
});
