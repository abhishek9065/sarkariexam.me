import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    createMock,
    updateMock,
    deleteMock,
    batchUpdateMock,
    findByIdMock,
    findByIdsAdminMock,
    findByIdsMock,
    invalidateAnnouncementCachesMock,
} = vi.hoisted(() => ({
    createMock: vi.fn(),
    updateMock: vi.fn(),
    deleteMock: vi.fn(),
    batchUpdateMock: vi.fn(),
    findByIdMock: vi.fn(),
    findByIdsAdminMock: vi.fn(),
    findByIdsMock: vi.fn(),
    invalidateAnnouncementCachesMock: vi.fn().mockResolvedValue(undefined),
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
        create: createMock,
        update: updateMock,
        delete: deleteMock,
        batchUpdate: batchUpdateMock,
        findById: findByIdMock,
        findByIdsAdmin: findByIdsAdminMock,
        findByIds: findByIdsMock,
    },
}));

vi.mock('../services/cacheInvalidation.js', () => ({
    invalidateAnnouncementCaches: invalidateAnnouncementCachesMock,
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
    getAdminApprovalWorkflowSummary: vi.fn(),
    listAdminApprovalRequests: vi.fn(),
    markAdminApprovalExecuted: vi.fn().mockResolvedValue(undefined),
    rejectAdminApprovalRequest: vi.fn(),
    validateApprovalForExecution: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('../services/adminAudit.js', () => ({
    getAdminAuditLogsPaged: vi.fn(),
    recordAdminAudit: vi.fn().mockResolvedValue(undefined),
    verifyAdminAuditLedger: vi.fn(),
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
    getActiveUsersStats: vi.fn(),
}));

vi.mock('../services/analytics.js', () => ({
    getDailyRollups: vi.fn(),
    recordAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
}));

const fakeCollection = () => ({
    find: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]), sort: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis() })),
    findOne: vi.fn().mockResolvedValue(null),
    insertOne: vi.fn().mockResolvedValue({ insertedId: 'fake' }),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    countDocuments: vi.fn().mockResolvedValue(0),
    aggregate: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
});

vi.mock('../services/cosmosdb.js', () => ({
    getCollection: vi.fn(() => fakeCollection()),
    getCollectionAsync: vi.fn(async () => fakeCollection()),
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

import adminRouter from '../routes/admin.js';

describe('admin mutation cache invalidation', () => {
    const app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);

    beforeEach(() => {
        vi.clearAllMocks();
        invalidateAnnouncementCachesMock.mockResolvedValue(undefined);

        createMock.mockResolvedValue({
            id: 'a1',
            title: 'UPSC Recruitment 2026',
            type: 'job',
            category: 'Central Government',
            organization: 'UPSC',
            status: 'draft',
            isActive: true,
        });
        updateMock.mockResolvedValue({
            id: 'a1',
            title: 'UPSC Recruitment 2026',
            type: 'job',
            category: 'Central Government',
            organization: 'UPSC',
            status: 'draft',
            isActive: true,
        });
        deleteMock.mockResolvedValue(true);
        batchUpdateMock.mockResolvedValue({ updated: 1, errors: [] });
        findByIdMock.mockResolvedValue({
            id: 'a1',
            title: 'UPSC Recruitment 2026',
            status: 'draft',
            versions: [],
        });
        findByIdsAdminMock.mockResolvedValue([
            { _id: { toString: () => 'a1' }, status: 'draft' },
        ]);
        findByIdsMock.mockResolvedValue([]);
    });

    it('invalidates caches on create', async () => {
        const response = await request(app).post('/api/admin/announcements').send({
            title: 'UPSC Recruitment 2026 Notice',
            type: 'job',
            category: 'Central Government',
            organization: 'UPSC',
            content: 'Details',
            status: 'draft',
        });

        expect(response.status).toBe(201);
        expect(invalidateAnnouncementCachesMock).toHaveBeenCalledTimes(1);
    });

    it('invalidates caches on update', async () => {
        const response = await request(app).put('/api/admin/announcements/a1').send({
            title: 'Updated title for UPSC 2026',
        });

        expect(response.status).toBe(200);
        expect(invalidateAnnouncementCachesMock).toHaveBeenCalledTimes(1);
    });

    it('invalidates caches on approve', async () => {
        updateMock.mockResolvedValue({
            id: 'a1',
            title: 'UPSC Recruitment 2026',
            type: 'job',
            category: 'Central Government',
            organization: 'UPSC',
            status: 'published',
            isActive: true,
        });

        const response = await request(app).post('/api/admin/announcements/a1/approve').send({});
        expect(response.status).toBe(200);
        expect(invalidateAnnouncementCachesMock).toHaveBeenCalledTimes(1);
    });

    it('invalidates caches on reject', async () => {
        const response = await request(app).post('/api/admin/announcements/a1/reject').send({});
        expect(response.status).toBe(200);
        expect(invalidateAnnouncementCachesMock).toHaveBeenCalledTimes(1);
    });

    it('invalidates caches on delete', async () => {
        const response = await request(app).delete('/api/admin/announcements/a1');
        expect(response.status).toBe(200);
        expect(invalidateAnnouncementCachesMock).toHaveBeenCalledTimes(1);
    });

    it('invalidates caches on bulk update', async () => {
        const response = await request(app).post('/api/admin/announcements/bulk').send({
            ids: ['a1'],
            data: { status: 'draft' },
        });

        expect(response.status).toBe(200);
        expect(invalidateAnnouncementCachesMock).toHaveBeenCalledTimes(1);
    });

    it('invalidates caches on bulk approve', async () => {
        const response = await request(app).post('/api/admin/announcements/bulk-approve').send({
            ids: ['a1'],
            note: 'approved',
        });

        expect(response.status).toBe(200);
        expect(invalidateAnnouncementCachesMock).toHaveBeenCalledTimes(1);
    });

    it('invalidates caches on bulk reject', async () => {
        const response = await request(app).post('/api/admin/announcements/bulk-reject').send({
            ids: ['a1'],
            note: 'rejected',
        });

        expect(response.status).toBe(200);
        expect(invalidateAnnouncementCachesMock).toHaveBeenCalledTimes(1);
    });
});
