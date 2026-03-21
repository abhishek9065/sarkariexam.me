import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    authState,
    findAllAdminMock,
    countAdminMock,
    getAdminCountsMock,
    getPendingSlaSummaryMock,
    getManagePostsWorkspaceSummaryMock,
    updateAnnouncementMock,
    getCollectionMock,
    hasEffectivePermissionMock,
    invalidateAnnouncementCachesMock,
    invalidateAdminSnapshotNamespacesMock,
} = vi.hoisted(() => ({
    authState: {
        userId: 'admin-user-1',
        email: 'admin@example.com',
        role: 'editor',
        sessionId: 'session-1',
    },
    findAllAdminMock: vi.fn(),
    countAdminMock: vi.fn(),
    getAdminCountsMock: vi.fn(),
    getPendingSlaSummaryMock: vi.fn(),
    getManagePostsWorkspaceSummaryMock: vi.fn(),
    updateAnnouncementMock: vi.fn(),
    getCollectionMock: vi.fn(),
    hasEffectivePermissionMock: vi.fn(),
    invalidateAnnouncementCachesMock: vi.fn().mockResolvedValue(undefined),
    invalidateAdminSnapshotNamespacesMock: vi.fn(),
}));

vi.mock('../middleware/auth.js', () => ({
    authenticateToken: (req: any, _res: any, next: any) => {
        req.user = { ...authState };
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
        getManagePostsWorkspaceSummary: getManagePostsWorkspaceSummaryMock,
        getAdminQaCounts: vi.fn().mockResolvedValue({ totalQaIssues: 0, pendingQaIssues: 0 }),
        findByIdsAdmin: vi.fn().mockResolvedValue([]),
        findById: vi.fn().mockResolvedValue(null),
        batchUpdate: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: updateAnnouncementMock,
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
    invalidateAnnouncementCaches: invalidateAnnouncementCachesMock,
}));

vi.mock('../services/adminSnapshotCache.js', () => ({
    readAdminSnapshotCache: vi.fn().mockReturnValue(null),
    writeAdminSnapshotCache: vi.fn(),
    invalidateAdminSnapshotNamespaces: invalidateAdminSnapshotNamespacesMock,
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

type SavedViewDoc = {
    _id: string;
    name: string;
    module: string;
    scope: 'private' | 'shared';
    filters: Record<string, unknown>;
    columns?: string[];
    sort?: Record<string, unknown>;
    isDefault?: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
};

const savedViewsState: { docs: SavedViewDoc[]; nextId: number } = {
    docs: [],
    nextId: 1,
};

const normalizeId = (value: unknown) => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null && 'toString' in value) {
        return String((value as { toString: () => string }).toString());
    }
    return String(value);
};

const matchesFilter = (doc: Record<string, unknown>, filter: Record<string, unknown>): boolean => {
    for (const [key, value] of Object.entries(filter)) {
        if (key === '$or') {
            const clauses = Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
            if (!clauses.some((clause) => matchesFilter(doc, clause))) return false;
            continue;
        }
        if (key === '$and') {
            const clauses = Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
            if (!clauses.every((clause) => matchesFilter(doc, clause))) return false;
            continue;
        }

        const docValue = key === '_id' ? normalizeId(doc._id) : doc[key];
        if (value && typeof value === 'object' && '$regex' in value) {
            const pattern = String((value as { $regex: unknown }).$regex ?? '');
            const flags = String((value as { $options?: unknown }).$options ?? '');
            const regex = new RegExp(pattern, flags);
            if (!regex.test(String(docValue ?? ''))) return false;
            continue;
        }

        const compareValue = key === '_id' ? normalizeId(value) : value;
        if (docValue !== compareValue) return false;
    }
    return true;
};

const buildSavedViewsCollection = () => ({
    countDocuments: vi.fn(async (filter: Record<string, unknown> = {}) => savedViewsState.docs.filter((doc) => matchesFilter(doc, filter)).length),
    find: (filter: Record<string, unknown> = {}) => {
        let docs = savedViewsState.docs.filter((doc) => matchesFilter(doc, filter));
        let skip = 0;
        let limit = docs.length;

        return {
            sort(sortSpec: Record<string, number>) {
                const [[sortKey, direction]] = Object.entries(sortSpec);
                docs = [...docs].sort((left, right) => {
                    const leftValue = left[sortKey as keyof SavedViewDoc];
                    const rightValue = right[sortKey as keyof SavedViewDoc];
                    if (leftValue instanceof Date && rightValue instanceof Date) {
                        return direction >= 0 ? leftValue.getTime() - rightValue.getTime() : rightValue.getTime() - leftValue.getTime();
                    }
                    return 0;
                });
                return this;
            },
            skip(value: number) {
                skip = value;
                return this;
            },
            limit(value: number) {
                limit = value;
                return this;
            },
            async toArray() {
                return docs.slice(skip, skip + limit);
            },
        };
    },
    insertOne: vi.fn(async (doc: Omit<SavedViewDoc, '_id'>) => {
        const insertedId = `view-${savedViewsState.nextId++}`;
        savedViewsState.docs.push({
            _id: insertedId,
            ...doc,
        });
        return { insertedId };
    }),
    updateMany: vi.fn(async (filter: Record<string, unknown>, update: { $set?: Record<string, unknown> }) => {
        let modifiedCount = 0;
        savedViewsState.docs = savedViewsState.docs.map((doc) => {
            if (!matchesFilter(doc, filter)) return doc;
            modifiedCount += 1;
            return { ...doc, ...(update.$set ?? {}) } as SavedViewDoc;
        });
        return { modifiedCount };
    }),
    findOne: vi.fn(async (filter: Record<string, unknown>) => savedViewsState.docs.find((doc) => matchesFilter(doc, filter)) ?? null),
    findOneAndUpdate: vi.fn(async (filter: Record<string, unknown>, update: { $set?: Record<string, unknown> }) => {
        const index = savedViewsState.docs.findIndex((doc) => matchesFilter(doc, filter));
        if (index < 0) return null;
        savedViewsState.docs[index] = {
            ...savedViewsState.docs[index],
            ...(update.$set ?? {}),
        } as SavedViewDoc;
        return savedViewsState.docs[index];
    }),
    deleteOne: vi.fn(async (filter: Record<string, unknown>) => {
        const before = savedViewsState.docs.length;
        savedViewsState.docs = savedViewsState.docs.filter((doc) => !matchesFilter(doc, filter));
        return { deletedCount: before - savedViewsState.docs.length };
    }),
});

describe('manage posts contracts', () => {
    const app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);

    beforeEach(() => {
        vi.clearAllMocks();
        authState.userId = 'admin-user-1';
        authState.email = 'admin@example.com';
        authState.role = 'editor';
        authState.sessionId = 'session-1';

        savedViewsState.docs = [];
        savedViewsState.nextId = 1;

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
        getManagePostsWorkspaceSummaryMock.mockResolvedValue({
            total: 0,
            byStatus: { draft: 0, pending: 0, scheduled: 0, published: 0, archived: 0 },
            assignedToMe: 0,
            unassignedPending: 0,
            overdueReview: 0,
        });
        updateAnnouncementMock.mockResolvedValue({
            id: 'ann-1',
            title: 'Updated announcement',
            assigneeUserId: 'admin-user-1',
            assigneeEmail: 'admin@example.com',
            updatedAt: new Date().toISOString(),
        });

        getCollectionMock.mockImplementation((name: string) => {
            if (name === 'admin_saved_views') {
                return buildSavedViewsCollection();
            }
            return {
                countDocuments: vi.fn().mockResolvedValue(2),
                find: vi.fn(() => ({
                    sort: vi.fn().mockReturnThis(),
                    skip: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                    toArray: vi.fn().mockResolvedValue([]),
                })),
            };
        });

        hasEffectivePermissionMock.mockImplementation(async (role: string, permission: string) => {
            if (role === 'viewer') {
                return permission === 'announcements:read' || permission === 'admin:read';
            }
            if (role === 'editor') {
                return permission !== 'announcements:approve';
            }
            return true;
        });
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

    it('returns an aggregate-backed workspace snapshot with all-status my queue counts', async () => {
        savedViewsState.docs.push(
            {
                _id: 'view-1',
                name: 'Private queue',
                module: 'manage-posts',
                scope: 'private',
                filters: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'admin-user-1',
                updatedBy: 'admin-user-1',
            },
            {
                _id: 'view-2',
                name: 'Shared queue',
                module: 'manage-posts',
                scope: 'shared',
                filters: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'admin-user-2',
                updatedBy: 'admin-user-2',
            },
        );

        getManagePostsWorkspaceSummaryMock.mockResolvedValue({
            total: 2501,
            byStatus: { draft: 400, pending: 601, scheduled: 300, published: 1100, archived: 100 },
            assignedToMe: 37,
            unassignedPending: 18,
            overdueReview: 9,
        });
        getPendingSlaSummaryMock.mockResolvedValue({
            pendingTotal: 601,
            averageDays: 4.2,
            buckets: { lt1: 0, d1_3: 10, d3_7: 12, gt7: 7 },
            stale: [{ id: 'ann-p-1', title: 'Pending post', type: 'job', ageDays: 8 }],
        });

        const response = await request(app).get('/api/admin/manage-posts/workspace');

        expect(response.status).toBe(200);
        expect(findAllAdminMock).not.toHaveBeenCalled();
        expect(getManagePostsWorkspaceSummaryMock).toHaveBeenCalledWith({
            includeInactive: true,
            assigneeUserId: 'admin-user-1',
            assigneeEmail: 'admin@example.com',
        });
        expect(response.body.data.summary.total).toBe(2501);
        expect(response.body.data.summary.assignedToMe).toBe(37);
        expect(response.body.data.summary.accessibleSavedViews).toBe(2);
        expect(response.body.data.capabilities.canManagePrivateViews).toBe(true);
        expect(response.body.data.lanes.find((lane: any) => lane.id === 'my-queue')?.count).toBe(37);
        expect(response.body.data.lanes.find((lane: any) => lane.id === 'my-queue')?.filters).toEqual({
            status: 'all',
            assignee: 'me',
        });
    });

    it('allows read-only roles to create, update, and delete their own private saved views', async () => {
        authState.role = 'viewer';

        const createResponse = await request(app).post('/api/admin/views').send({
            name: 'My read only view',
            module: 'manage-posts',
            scope: 'private',
            filters: { status: 'pending' },
        });

        expect(createResponse.status).toBe(201);
        expect(createResponse.body.data.scope).toBe('private');
        expect(invalidateAdminSnapshotNamespacesMock).toHaveBeenCalledWith(['manage-posts']);

        const viewId = createResponse.body.data.id;
        const updateResponse = await request(app).patch(`/api/admin/views/${viewId}`).send({
            name: 'My renamed view',
            filters: { status: 'published' },
        });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.data.name).toBe('My renamed view');

        const deleteResponse = await request(app).delete(`/api/admin/views/${viewId}`);
        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.data).toEqual({ success: true, id: viewId });
    });

    it('keeps shared saved views admin-only for non-admin roles', async () => {
        authState.role = 'viewer';
        savedViewsState.docs.push({
            _id: 'view-shared-1',
            name: 'Shared queue',
            module: 'manage-posts',
            scope: 'shared',
            filters: {},
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'admin-user-2',
            updatedBy: 'admin-user-2',
        });

        const createResponse = await request(app).post('/api/admin/views').send({
            name: 'Not allowed',
            module: 'manage-posts',
            scope: 'shared',
            filters: {},
        });
        expect(createResponse.status).toBe(403);

        const patchResponse = await request(app).patch('/api/admin/views/view-shared-1').send({
            name: 'Should fail',
        });
        expect(patchResponse.status).toBe(403);

        const deleteResponse = await request(app).delete('/api/admin/views/view-shared-1');
        expect(deleteResponse.status).toBe(403);
    });

    it('invalidates announcement and snapshot caches after assignment mutations', async () => {
        const response = await request(app).patch('/api/admin/announcements/ann-1/assignment').send({
            assigneeUserId: 'admin-user-1',
            assigneeEmail: 'admin@example.com',
        });

        expect(response.status).toBe(200);
        expect(invalidateAdminSnapshotNamespacesMock).toHaveBeenCalledWith(['dashboard', 'manage-posts']);
        expect(invalidateAnnouncementCachesMock).toHaveBeenCalled();
    });
});
