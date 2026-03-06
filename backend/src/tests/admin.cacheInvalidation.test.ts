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
    findAllAdminMock,
    invalidateAnnouncementCachesMock,
    getDailyRollupsMock,
    getAnnouncementViewTrafficSourcesMock,
    getTopAnnouncementViewsMock,
} = vi.hoisted(() => ({
    createMock: vi.fn(),
    updateMock: vi.fn(),
    deleteMock: vi.fn(),
    batchUpdateMock: vi.fn(),
    findByIdMock: vi.fn(),
    findByIdsAdminMock: vi.fn(),
    findByIdsMock: vi.fn(),
    findAllAdminMock: vi.fn(),
    invalidateAnnouncementCachesMock: vi.fn().mockResolvedValue(undefined),
    getDailyRollupsMock: vi.fn(),
    getAnnouncementViewTrafficSourcesMock: vi.fn(),
    getTopAnnouncementViewsMock: vi.fn(),
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
        findAllAdmin: findAllAdminMock,
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
    getAnnouncementViewTrafficSources: getAnnouncementViewTrafficSourcesMock,
    getDailyRollups: getDailyRollupsMock,
    getTopAnnouncementViews: getTopAnnouncementViewsMock,
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
        findAllAdminMock.mockResolvedValue([
            {
                id: 'a1',
                title: 'UPSC Recruitment 2026',
                type: 'job',
                organization: 'UPSC',
                status: 'draft',
                deadline: '2026-04-01T00:00:00.000Z',
                viewCount: 9999,
            },
            {
                id: 'a2',
                title: 'SSC Result 2026',
                type: 'result',
                organization: 'SSC',
                status: 'published',
                deadline: '2026-04-02T00:00:00.000Z',
                viewCount: 8888,
            },
        ]);
        findByIdsAdminMock.mockResolvedValue([
            { _id: { toString: () => 'a1' }, status: 'draft' },
        ]);
        findByIdsMock.mockResolvedValue([]);
        getDailyRollupsMock.mockResolvedValue([
            { date: '2026-03-01', count: 0, views: 10, listingViews: 0, cardClicks: 0, categoryClicks: 0, filterApplies: 0, searches: 0, bookmarkAdds: 0, registrations: 0 },
            { date: '2026-03-02', count: 0, views: 20, listingViews: 0, cardClicks: 0, categoryClicks: 0, filterApplies: 0, searches: 0, bookmarkAdds: 0, registrations: 0 },
            { date: '2026-03-03', count: 0, views: 30, listingViews: 0, cardClicks: 0, categoryClicks: 0, filterApplies: 0, searches: 0, bookmarkAdds: 0, registrations: 0 },
            { date: '2026-03-04', count: 0, views: 40, listingViews: 0, cardClicks: 0, categoryClicks: 0, filterApplies: 0, searches: 0, bookmarkAdds: 0, registrations: 0 },
            { date: '2026-03-05', count: 0, views: 50, listingViews: 0, cardClicks: 0, categoryClicks: 0, filterApplies: 0, searches: 0, bookmarkAdds: 0, registrations: 0 },
            { date: '2026-03-06', count: 0, views: 60, listingViews: 0, cardClicks: 0, categoryClicks: 0, filterApplies: 0, searches: 0, bookmarkAdds: 0, registrations: 0 },
            { date: '2026-03-07', count: 0, views: 70, listingViews: 0, cardClicks: 0, categoryClicks: 0, filterApplies: 0, searches: 0, bookmarkAdds: 0, registrations: 0 },
        ]);
        getAnnouncementViewTrafficSourcesMock.mockResolvedValue([
            { source: 'seo', label: 'Organic', views: 60 },
            { source: 'direct', label: 'Direct', views: 40 },
        ]);
        getTopAnnouncementViewsMock.mockResolvedValue([
            { announcementId: 'a2', views: 7 },
            { announcementId: 'a1', views: 3 },
        ]);
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

    it('returns reports with truthful traffic series, source split, and 24h top-view counts', async () => {
        const response = await request(app).get('/api/admin/reports');

        expect(response.status).toBe(200);
        expect(getDailyRollupsMock).toHaveBeenCalledWith(7);
        expect(getAnnouncementViewTrafficSourcesMock).toHaveBeenCalledWith(7);
        expect(getTopAnnouncementViewsMock).toHaveBeenCalledWith(24, 10);
        expect(response.body.data.trafficSeries).toEqual([
            { date: '2026-03-01', views: 10 },
            { date: '2026-03-02', views: 20 },
            { date: '2026-03-03', views: 30 },
            { date: '2026-03-04', views: 40 },
            { date: '2026-03-05', views: 50 },
            { date: '2026-03-06', views: 60 },
            { date: '2026-03-07', views: 70 },
        ]);
        expect(response.body.data.trafficSources).toEqual([
            { source: 'seo', label: 'Organic', views: 60, percentage: 60 },
            { source: 'direct', label: 'Direct', views: 40, percentage: 40 },
        ]);
        expect(response.body.data.mostViewed24h).toEqual([
            {
                id: 'a2',
                title: 'SSC Result 2026',
                type: 'result',
                views: 7,
                organization: 'SSC',
            },
            {
                id: 'a1',
                title: 'UPSC Recruitment 2026',
                type: 'job',
                views: 3,
                organization: 'UPSC',
            },
        ]);
    });
});
