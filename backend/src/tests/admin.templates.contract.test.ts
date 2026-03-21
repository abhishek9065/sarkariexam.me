import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    authState,
    getCollectionMock,
    createAnnouncementMock,
    findAnnouncementByIdMock,
    invalidateAnnouncementCachesMock,
    invalidateAdminSnapshotNamespacesMock,
    hasEffectivePermissionMock,
} = vi.hoisted(() => ({
    authState: {
        userId: 'editor-user-1',
        email: 'editor@example.com',
        role: 'editor',
        sessionId: 'session-1',
    },
    getCollectionMock: vi.fn(),
    createAnnouncementMock: vi.fn(),
    findAnnouncementByIdMock: vi.fn(),
    invalidateAnnouncementCachesMock: vi.fn().mockResolvedValue(undefined),
    invalidateAdminSnapshotNamespacesMock: vi.fn(),
    hasEffectivePermissionMock: vi.fn(),
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
        getManagePostsWorkspaceSummary: vi.fn().mockResolvedValue({
            total: 0,
            byStatus: { draft: 0, pending: 0, scheduled: 0, published: 0, archived: 0 },
            assignedToMe: 0,
            unassignedPending: 0,
            overdueReview: 0,
        }),
        findByIdsAdmin: vi.fn().mockResolvedValue([]),
        findByIds: vi.fn().mockResolvedValue([]),
        findById: findAnnouncementByIdMock,
        batchUpdate: vi.fn().mockResolvedValue([]),
        create: createAnnouncementMock,
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

type TemplateDoc = {
    _id: string;
    type: 'job' | 'result' | 'admit-card' | 'answer-key' | 'syllabus' | 'admission';
    name: string;
    description?: string;
    shared: boolean;
    sections: string[];
    payload: Record<string, unknown>;
    usageCount: number;
    lastUsedAt?: Date;
    lastUsedBy?: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
};

type AutosaveDoc = {
    announcementId: string;
    userId: string;
    editorSessionId?: string;
    clientUpdatedAt?: Date;
    cursor?: Record<string, unknown>;
    title: string;
    status: string;
    version: number;
    updatedAt: Date;
};

const templatesState: { docs: TemplateDoc[]; nextId: number } = {
    docs: [],
    nextId: 1,
};

const autosavesState: { docs: AutosaveDoc[] } = {
    docs: [],
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
            const regexValue = (value as { $regex: unknown }).$regex;
            const regex = regexValue instanceof RegExp
                ? regexValue
                : new RegExp(String(regexValue ?? ''), String((value as { $options?: unknown }).$options ?? ''));
            if (!regex.test(String(docValue ?? ''))) return false;
            continue;
        }

        const compareValue = key === '_id' ? normalizeId(value) : value;
        if (docValue !== compareValue) return false;
    }
    return true;
};

const buildTemplateCollection = () => ({
    countDocuments: vi.fn(async (filter: Record<string, unknown> = {}) => templatesState.docs.filter((doc) => matchesFilter(doc, filter)).length),
    find: (filter: Record<string, unknown> = {}) => {
        let docs = templatesState.docs.filter((doc) => matchesFilter(doc, filter));
        let skip = 0;
        let limit = docs.length;

        return {
            sort(sortSpec: Record<string, number>) {
                const [[sortKey, direction]] = Object.entries(sortSpec);
                docs = [...docs].sort((left, right) => {
                    const leftValue = left[sortKey as keyof TemplateDoc];
                    const rightValue = right[sortKey as keyof TemplateDoc];
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
    insertOne: vi.fn(async (doc: Omit<TemplateDoc, '_id'>) => {
        const insertedId = `tpl-${templatesState.nextId++}`;
        templatesState.docs.push({ _id: insertedId, ...doc });
        return { insertedId };
    }),
    findOne: vi.fn(async (filter: Record<string, unknown>) => templatesState.docs.find((doc) => matchesFilter(doc, filter)) ?? null),
    findOneAndUpdate: vi.fn(async (filter: Record<string, unknown>, update: { $set?: Record<string, unknown> }) => {
        const index = templatesState.docs.findIndex((doc) => matchesFilter(doc, filter));
        if (index < 0) return null;
        templatesState.docs[index] = {
            ...templatesState.docs[index],
            ...(update.$set ?? {}),
        } as TemplateDoc;
        return templatesState.docs[index];
    }),
    updateOne: vi.fn(async (filter: Record<string, unknown>, update: { $set?: Record<string, unknown>; $inc?: Record<string, number> }) => {
        const index = templatesState.docs.findIndex((doc) => matchesFilter(doc, filter));
        if (index < 0) return { modifiedCount: 0 };
        const current = templatesState.docs[index];
        const nextUsageCount = (current.usageCount ?? 0) + Number(update.$inc?.usageCount ?? 0);
        templatesState.docs[index] = {
            ...current,
            ...(update.$set ?? {}),
            usageCount: nextUsageCount,
        };
        return { modifiedCount: 1 };
    }),
    deleteOne: vi.fn(async (filter: Record<string, unknown>) => {
        const before = templatesState.docs.length;
        templatesState.docs = templatesState.docs.filter((doc) => !matchesFilter(doc, filter));
        return { deletedCount: before - templatesState.docs.length };
    }),
});

const buildAutosaveCollection = () => ({
    find: (filter: Record<string, unknown> = {}) => {
        let docs = autosavesState.docs.filter((doc) => matchesFilter(doc as unknown as Record<string, unknown>, filter));
        let limit = docs.length;

        return {
            sort(sortSpec: Record<string, number>) {
                const [[sortKey, direction]] = Object.entries(sortSpec);
                docs = [...docs].sort((left, right) => {
                    const leftValue = left[sortKey as keyof AutosaveDoc];
                    const rightValue = right[sortKey as keyof AutosaveDoc];
                    if (leftValue instanceof Date && rightValue instanceof Date) {
                        return direction >= 0 ? leftValue.getTime() - rightValue.getTime() : rightValue.getTime() - leftValue.getTime();
                    }
                    return 0;
                });
                return this;
            },
            limit(value: number) {
                limit = value;
                return this;
            },
            async toArray() {
                return docs.slice(0, limit);
            },
        };
    },
    updateOne: vi.fn(async (filter: Record<string, unknown>, update: { $set?: Record<string, unknown> }) => {
        const index = autosavesState.docs.findIndex((doc) => matchesFilter(doc as unknown as Record<string, unknown>, filter));
        if (index >= 0) {
            autosavesState.docs[index] = {
                ...autosavesState.docs[index],
                ...(update.$set ?? {}),
            } as AutosaveDoc;
            return { modifiedCount: 1, upsertedCount: 0 };
        }
        autosavesState.docs.push({
            announcementId: String(update.$set?.announcementId ?? filter.announcementId ?? ''),
            userId: String(update.$set?.userId ?? filter.userId ?? ''),
            title: String(update.$set?.title ?? ''),
            status: String(update.$set?.status ?? 'draft'),
            version: Number(update.$set?.version ?? 1),
            updatedAt: (update.$set?.updatedAt as Date) ?? new Date(),
            editorSessionId: update.$set?.editorSessionId as string | undefined,
            clientUpdatedAt: update.$set?.clientUpdatedAt as Date | undefined,
            cursor: update.$set?.cursor as Record<string, unknown> | undefined,
        });
        return { modifiedCount: 0, upsertedCount: 1 };
    }),
});

describe('admin template contracts', () => {
    const app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);

    beforeEach(() => {
        vi.clearAllMocks();
        authState.userId = 'editor-user-1';
        authState.email = 'editor@example.com';
        authState.role = 'editor';
        authState.sessionId = 'session-1';

        templatesState.docs = [
            {
                _id: 'tpl-shared-1',
                type: 'job',
                name: 'Shared job template',
                description: 'Shared for all editors',
                shared: true,
                sections: ['Important Dates'],
                payload: { category: 'Latest Jobs' },
                usageCount: 2,
                createdAt: new Date('2026-03-01T00:00:00.000Z'),
                updatedAt: new Date('2026-03-02T00:00:00.000Z'),
                createdBy: 'admin-user-1',
                updatedBy: 'admin-user-1',
            },
            {
                _id: 'tpl-private-own',
                type: 'job',
                name: 'My draft template',
                description: 'Private copy',
                shared: false,
                sections: ['Eligibility'],
                payload: { tags: ['desk'] },
                usageCount: 0,
                createdAt: new Date('2026-03-03T00:00:00.000Z'),
                updatedAt: new Date('2026-03-04T00:00:00.000Z'),
                createdBy: 'editor-user-1',
                updatedBy: 'editor-user-1',
            },
            {
                _id: 'tpl-private-other',
                type: 'job',
                name: 'Someone else private template',
                description: 'Should stay hidden',
                shared: false,
                sections: ['Application Fee'],
                payload: {},
                usageCount: 1,
                createdAt: new Date('2026-03-05T00:00:00.000Z'),
                updatedAt: new Date('2026-03-05T00:00:00.000Z'),
                createdBy: 'editor-user-2',
                updatedBy: 'editor-user-2',
            },
        ];
        templatesState.nextId = 4;
        autosavesState.docs = [];

        createAnnouncementMock.mockResolvedValue({
            id: 'ann-1',
            title: 'SSC CGL Recruitment 2026',
            type: 'job',
            status: 'draft',
        });
        findAnnouncementByIdMock.mockResolvedValue(null);

        getCollectionMock.mockImplementation((name: string) => {
            if (name === 'admin_templates') {
                return buildTemplateCollection();
            }
            if (name === 'admin_autosaves') {
                return buildAutosaveCollection();
            }
            return {
                countDocuments: vi.fn().mockResolvedValue(0),
                find: vi.fn(() => ({
                    sort: vi.fn().mockReturnThis(),
                    skip: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                    toArray: vi.fn().mockResolvedValue([]),
                })),
            };
        });

        hasEffectivePermissionMock.mockImplementation(async (role: string, permission: string) => {
            if (role === 'editor') {
                return permission === 'announcements:write' || permission === 'announcements:read' || permission === 'admin:read';
            }
            return true;
        });
    });

    it('returns shared templates and the actor private templates, but hides other private templates', async () => {
        const response = await request(app).get('/api/admin/templates').query({ type: 'job', search: 'template' });

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data.map((item: any) => item.id)).toEqual(['tpl-private-own', 'tpl-shared-1']);
    });

    it('allows editors to create private templates but blocks shared template creation', async () => {
        const privateResponse = await request(app).post('/api/admin/templates').send({
            type: 'job',
            name: 'Desk private starter',
            description: 'Private starter',
            shared: false,
            sections: ['Important Dates'],
            payload: { category: 'Latest Jobs' },
        });

        expect(privateResponse.status).toBe(201);
        expect(privateResponse.body.data.shared).toBe(false);

        const sharedResponse = await request(app).post('/api/admin/templates').send({
            type: 'job',
            name: 'Desk shared starter',
            description: 'Shared starter',
            shared: true,
            sections: ['Important Dates'],
            payload: { category: 'Latest Jobs' },
        });

        expect(sharedResponse.status).toBe(403);
    });

    it('lets the owner mutate and delete private templates while rejecting non-owner edits', async () => {
        const patchOwnResponse = await request(app).patch('/api/admin/templates/tpl-private-own').send({
            name: 'My renamed template',
        });
        expect(patchOwnResponse.status).toBe(200);
        expect(patchOwnResponse.body.data.name).toBe('My renamed template');

        const patchOtherResponse = await request(app).patch('/api/admin/templates/tpl-private-other').send({
            name: 'Should fail',
        });
        expect(patchOtherResponse.status).toBe(403);

        const deleteOwnResponse = await request(app).delete('/api/admin/templates/tpl-private-own');
        expect(deleteOwnResponse.status).toBe(200);
        expect(deleteOwnResponse.body.data).toEqual({ success: true, id: 'tpl-private-own' });
    });

    it('records template usage and persists templateId when an announcement is created from a template', async () => {
        const response = await request(app).post('/api/admin/announcements').send({
            title: 'SSC CGL Recruitment 2026',
            type: 'job',
            category: 'Latest Jobs',
            organization: 'SSC',
            status: 'draft',
            content: 'Draft summary',
            templateId: 'tpl-private-own',
        });

        expect(response.status).toBe(201);
        expect(createAnnouncementMock).toHaveBeenCalledWith(
            expect.objectContaining({
                templateId: 'tpl-private-own',
                typeDetails: expect.objectContaining({
                    templateId: 'tpl-private-own',
                }),
            }),
            'editor-user-1'
        );
        expect(templatesState.docs.find((item) => item._id === 'tpl-private-own')?.usageCount).toBe(1);
        expect(templatesState.docs.find((item) => item._id === 'tpl-private-own')?.lastUsedBy).toBe('editor-user-1');
    });

    it('seeds a recent editor draft entry when a draft shell is created', async () => {
        createAnnouncementMock.mockResolvedValueOnce({
            id: 'draft-1',
            title: 'UP Police Recruitment 2026',
            type: 'job',
            status: 'draft',
            version: 1,
            category: 'Latest Jobs',
            organization: 'UP Police',
        });

        const response = await request(app).post('/api/admin/announcements/draft').send({
            type: 'job',
            title: 'UP Police Recruitment 2026',
            category: 'Latest Jobs',
            organization: 'UP Police',
        });

        expect(response.status).toBe(201);
        expect(autosavesState.docs).toHaveLength(1);
        expect(autosavesState.docs[0]).toMatchObject({
            announcementId: 'draft-1',
            userId: 'editor-user-1',
            title: 'UP Police Recruitment 2026',
            status: 'draft',
        });
    });

    it('returns recent editor drafts for the actor with deep-editor routes', async () => {
        autosavesState.docs = [
            {
                announcementId: 'draft-1',
                userId: 'editor-user-1',
                title: 'UP Police Recruitment 2026',
                status: 'draft',
                version: 2,
                updatedAt: new Date('2026-03-08T10:00:00.000Z'),
            },
            {
                announcementId: 'draft-2',
                userId: 'editor-user-1',
                title: 'Railway Result Draft',
                status: 'draft',
                version: 1,
                updatedAt: new Date('2026-03-07T10:00:00.000Z'),
            },
        ];

        findAnnouncementByIdMock.mockImplementation(async (id: string) => {
            if (id === 'draft-1') {
                return {
                    id: 'draft-1',
                    title: 'UP Police Recruitment 2026',
                    type: 'job',
                    status: 'draft',
                    category: 'Latest Jobs',
                    organization: 'UP Police',
                };
            }
            if (id === 'draft-2') {
                return {
                    id: 'draft-2',
                    title: 'Railway Result Draft',
                    type: 'result',
                    status: 'draft',
                    category: 'Results',
                    organization: 'Railway Board',
                };
            }
            return null;
        });

        const response = await request(app).get('/api/admin/editor-drafts/recent').query({ type: 'job', limit: 5 });

        expect(response.status).toBe(200);
        expect(response.body.data).toEqual([
            expect.objectContaining({
                id: 'draft-1',
                title: 'UP Police Recruitment 2026',
                type: 'job',
                route: '/detailed-post?focus=draft-1',
            }),
        ]);
    });
});
