import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { config } from '../config.js';
import { authenticateToken, requireAdminStepUp, requirePermission } from '../middleware/auth.js';
import { idempotency } from '../middleware/idempotency.js';
import { getAdminSloSnapshot } from '../middleware/responseTime.js';
import { AnnouncementModelMongo } from '../models/announcements.mongo.js';
import { getActiveUsersStats } from '../services/activeUsers.js';
import { inviteAdminUser, issueAdminPasswordReset, listAdminAccessUsers, syncAdminAccessMetadata } from '../services/adminAccess.js';
import { evaluateAdminApprovalRequirement } from '../services/adminApprovalPolicy.js';
import {
    approveAdminApprovalRequest,
    createAdminApprovalRequest,
    getAdminApprovalWorkflowSummary,
    listAdminApprovalRequests,
    markAdminApprovalExecuted,
    rejectAdminApprovalRequest,
    validateApprovalForExecution,
    type AdminApprovalActionType,
} from '../services/adminApprovals.js';
import { getAdminAuditLogsPaged, rebuildAdminAuditLedger, recordAdminAudit, verifyAdminAuditLedger } from '../services/adminAudit.js';
import { ADMIN_PERMISSION_LIST, ADMIN_PORTAL_ROLES, getAdminPermissionsSnapshot } from '../services/adminPermissions.js';
import { upsertAdminRoleOverride } from '../services/adminRoleOverrides.js';
import { getAdminSession, listAdminSessions, mapSessionForClient, terminateAdminSession, terminateOtherSessions } from '../services/adminSessions.js';
import { revokeAdminStepUpGrantsForUser } from '../services/adminStepUp.js';
import {
    getAnnouncementViewTrafficSources,
    getDailyRollups,
    getTopAnnouncementViews,
    recordAnalyticsEvent,
} from '../services/analytics.js';
import { invalidateAnnouncementCaches } from '../services/cacheInvalidation.js';
import { getCollection, healthCheck } from '../services/cosmosdb.js';
import { hasEffectivePermission, type Permission } from '../services/rbac.js';
import { SecurityLogger } from '../services/securityLogger.js';
import { dispatchAnnouncementToSubscribers } from '../services/subscriberDispatch.js';
import { Announcement, ContentType, CreateAnnouncementDto } from '../types.js';
import { getPathParam } from '../utils/routeParams.js';

const router = Router();
const telemetryRouter = Router();
const contentRouter = Router();
const operationsRouter = Router();
const governanceRouter = Router();
const announcementsRouter = Router();
const ADMIN_APPROVAL_ID_HEADER = 'x-admin-approval-id';
const ADMIN_BREAK_GLASS_REASON_HEADER = 'x-admin-break-glass-reason';

interface ApprovalGateResult {
    allowed: boolean;
    approvalId?: string;
    breakGlassUsed?: boolean;
    breakGlassReason?: string;
    breakGlassEndpoint?: string;
    breakGlassActionType?: AdminApprovalActionType;
    breakGlassActor?: string;
}

interface UserDoc {
    createdAt: Date;
    isActive: boolean;
}

interface SubscriptionDoc {
    createdAt: Date;
    isActive: boolean;
    verified: boolean;
}

interface HomeSectionDoc {
    key: string;
    title: string;
    itemType: 'job' | 'result' | 'admit-card' | 'answer-key' | 'syllabus' | 'admission' | 'important';
    sortRule: 'newest' | 'sticky' | 'trending';
    pinnedIds: string[];
    highlightIds: string[];
    updatedAt: Date;
    updatedBy?: string;
}

interface LinkRecordDoc {
    label: string;
    url: string;
    type: 'official' | 'pdf' | 'external';
    status: 'active' | 'expired' | 'broken';
    announcementId?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    updatedBy?: string;
}

interface LinkHealthEventDoc {
    url: string;
    status: 'ok' | 'redirect' | 'broken' | 'error';
    statusCode?: number;
    redirectTarget?: string;
    responseTimeMs?: number;
    checkedAt: Date;
    checkedBy?: string;
}

interface MediaAssetDoc {
    label: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    category: 'notification' | 'result' | 'admit-card' | 'answer-key' | 'syllabus' | 'other';
    keepStableUrl: boolean;
    fileSizeBytes?: number;
    status: 'active' | 'archived';
    createdAt: Date;
    updatedAt: Date;
    updatedBy?: string;
}

interface AdminTemplateDoc {
    type: ContentType;
    name: string;
    description?: string;
    shared: boolean;
    sections: string[];
    payload: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
}

interface AdminAlertDoc {
    source: 'deadline' | 'schedule' | 'link' | 'traffic' | 'manual';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    status: 'open' | 'acknowledged' | 'resolved';
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
}

interface AdminSettingsDoc {
    key: 'states' | 'boards' | 'tags' | 'workflow-defaults' | 'homepage-defaults' | 'alert-thresholds' | 'security-policy' | 'notification-routing';
    values?: string[];
    payload?: Record<string, unknown>;
    updatedAt: Date;
    updatedBy?: string;
}

const ADMIN_SETTINGS_KEYS = [
    'states',
    'boards',
    'tags',
    'workflow-defaults',
    'homepage-defaults',
    'alert-thresholds',
    'security-policy',
    'notification-routing',
] as const satisfies ReadonlyArray<AdminSettingsDoc['key']>;

const ARRAY_SETTINGS_KEYS = new Set<AdminSettingsDoc['key']>(['states', 'boards', 'tags']);

const isAdminSettingKey = (value: string): value is AdminSettingsDoc['key'] =>
    (ADMIN_SETTINGS_KEYS as readonly string[]).includes(value);

interface AdminUserListDoc {
    email: string;
    username?: string;
    role: string;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    lastLoginAt?: Date;
}

interface AdminSavedViewDoc {
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
}

const statusSchema = z.enum(['draft', 'pending', 'scheduled', 'published', 'archived']);
const sessionIdSchema = z.object({
    sessionId: z.string().min(8),
});
const dateField = z
    .string()
    .datetime()
    .optional()
    .or(z.literal(''))
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

const adminAnnouncementBaseSchema = z.object({
    title: z.string().min(10).max(500),
    type: z.enum(['job', 'result', 'admit-card', 'syllabus', 'answer-key', 'admission'] as [ContentType, ...ContentType[]]),
    category: z.string().min(3).max(255),
    organization: z.string().min(2).max(255),
    content: z.string().optional(),
    externalLink: z.string().url().optional().or(z.literal('')),
    location: z.string().optional().or(z.literal('')),
    deadline: dateField,
    minQualification: z.string().optional().or(z.literal('')),
    ageLimit: z.string().optional().or(z.literal('')),
    applicationFee: z.string().optional().or(z.literal('')),
    salaryMin: z.coerce.number().min(0).optional(),
    salaryMax: z.coerce.number().min(0).optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    cutoffMarks: z.string().trim().optional().or(z.literal('')),
    totalPosts: z.number().int().positive().optional(),
    status: statusSchema.optional(),
    publishAt: dateField,
    approvedAt: dateField,
    approvedBy: z.string().optional(),
    tags: z.array(z.string()).optional(),
    importantDates: z.array(z.object({
        eventName: z.string(),
        eventDate: z.string(),
        description: z.string().optional(),
    })).optional(),
    jobDetails: z.any().optional(),
    typeDetails: z.record(z.unknown()).optional(),
    seo: z.object({
        metaTitle: z.string().max(160).optional().or(z.literal('')),
        metaDescription: z.string().max(320).optional().or(z.literal('')),
        canonical: z.string().url().optional().or(z.literal('')),
        indexPolicy: z.enum(['index', 'noindex']).optional(),
        ogImage: z.string().url().optional().or(z.literal('')),
    }).optional(),
    home: z.object({
        section: z.string().trim().max(80).optional().or(z.literal('')),
        stickyRank: z.coerce.number().int().min(0).max(500).optional(),
        highlight: z.boolean().optional(),
        trendingScore: z.coerce.number().min(0).max(1_000_000).optional(),
    }).optional(),
    schema: z.record(z.unknown()).optional(),
});

const adminAnnouncementSchema = adminAnnouncementBaseSchema.superRefine((data, ctx) => {
    if (data.status === 'scheduled' && (!data.publishAt || data.publishAt === '')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'publishAt is required for scheduled announcements',
            path: ['publishAt'],
        });
    }
});

const adminAnnouncementPartialBaseSchema = adminAnnouncementBaseSchema.partial().extend({
    isActive: z.boolean().optional(),
    note: z.string().max(500).optional().or(z.literal('')),
});

const adminAnnouncementPartialSchema = adminAnnouncementPartialBaseSchema.superRefine((data, ctx) => {
    if (data.status === 'scheduled' && (!data.publishAt || data.publishAt === '')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'publishAt is required for scheduled announcements',
            path: ['publishAt'],
        });
    }
});

const adminListQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(500).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    status: statusSchema.or(z.literal('all')).optional(),
    type: z.enum(['job', 'result', 'admit-card', 'syllabus', 'answer-key', 'admission'] as [ContentType, ...ContentType[]]).optional(),
    search: z.string().trim().optional(),
    includeInactive: z.coerce.boolean().optional(),
    sort: z.enum(['newest', 'oldest', 'deadline', 'updated', 'views']).optional(),
    dateStart: z.string().trim().optional(),
    dateEnd: z.string().trim().optional(),
    author: z.string().trim().optional(),
    assignee: z.enum(['me', 'unassigned', 'assigned']).optional(),
});

const bulkUpdateSchema = z.object({
    ids: z.array(z.string().min(1)).min(1),
    dryRun: z.boolean().optional().default(false),
    data: adminAnnouncementPartialSchema,
});

const bulkPreviewSchema = z.object({
    ids: z.array(z.string().min(1)).min(1),
    data: adminAnnouncementPartialSchema,
});

const bulkReviewSchema = z.object({
    ids: z.array(z.string().min(1)).min(1),
    dryRun: z.boolean().optional().default(false),
    note: z.string().max(500).optional().or(z.literal('')),
});

const reviewPreviewSchema = z.object({
    ids: z.array(z.string().min(1)).min(1),
    action: z.enum(['approve', 'reject', 'schedule']),
    note: z.string().max(500).optional().or(z.literal('')),
    scheduleAt: dateField,
});

const adminTelemetrySchema = z.object({
    type: z.enum([
        'admin_list_loaded',
        'admin_filter_applied',
        'admin_row_action_clicked',
        'admin_review_decision_submitted',
        'admin_bulk_preview_opened',
        'admin_metric_drilldown_opened',
    ]),
    metadata: z.record(z.any()).optional(),
});

const auditQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    userId: z.string().trim().optional(),
    action: z.string().trim().optional(),
    start: z.string().trim().optional(),
    end: z.string().trim().optional(),
});

const workflowOverviewQuerySchema = z.object({
    staleLimit: z.coerce.number().int().min(1).max(100).default(10),
    dueSoonMinutes: z.coerce.number().int().min(1).max(24 * 60).default(30),
});

const auditIntegrityQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100_000).default(5000),
});

const rollbackSchema = z.object({
    version: z.coerce.number().int().min(1),
    dryRun: z.boolean().optional().default(false),
    note: z.string().max(500).optional().or(z.literal('')),
});

const adminExportQuerySchema = z.object({
    status: statusSchema.or(z.literal('all')).optional(),
    type: z.enum(['job', 'result', 'admit-card', 'syllabus', 'answer-key', 'admission'] as [ContentType, ...ContentType[]]).optional(),
    includeInactive: z.coerce.boolean().optional(),
});

const adminSummaryQuerySchema = z.object({
    includeInactive: z.coerce.boolean().optional(),
});

const adminApprovalsQuerySchema = z.object({
    status: z.enum(['pending', 'approved', 'rejected', 'executed', 'expired', 'all']).optional().default('pending'),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
});

const securityLogsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(200).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    eventType: z.string().trim().min(1).max(80).optional(),
    ip: z.string().trim().min(1).max(120).optional(),
    endpoint: z.string().trim().min(1).max(500).optional(),
    start: z.string().trim().optional(),
    end: z.string().trim().optional(),
});

const adminApprovalResolveSchema = z.object({
    note: z.string().max(500).optional().or(z.literal('')),
    reason: z.string().max(500).optional().or(z.literal('')),
});

const sectionItemSchema = z.object({
    key: z.string().trim().min(2).max(80),
    title: z.string().trim().min(2).max(120),
    itemType: z.enum(['job', 'result', 'admit-card', 'answer-key', 'syllabus', 'admission', 'important']),
    sortRule: z.enum(['newest', 'sticky', 'trending']),
    pinnedIds: z.array(z.string().trim().min(1)).max(50).optional().default([]),
    highlightIds: z.array(z.string().trim().min(1)).max(50).optional().default([]),
});

const sectionUpsertSchema = z.object({
    sections: z.array(sectionItemSchema).min(1).max(20),
});

const linkRecordCreateSchema = z.object({
    label: z.string().trim().min(2).max(120),
    url: z.string().url(),
    type: z.enum(['official', 'pdf', 'external']),
    status: z.enum(['active', 'expired', 'broken']).optional().default('active'),
    announcementId: z.string().trim().optional(),
    notes: z.string().trim().max(500).optional().or(z.literal('')),
});

const linkRecordPatchSchema = linkRecordCreateSchema.partial().extend({
    status: z.enum(['active', 'expired', 'broken']).optional(),
});

const linkCheckSchema = z.object({
    ids: z.array(z.string().trim().min(1)).max(200).optional(),
    urls: z.array(z.string().url()).max(200).optional(),
    timeoutMs: z.coerce.number().int().min(1000).max(15000).optional().default(5000),
});

const linkReplaceSchema = z.object({
    fromUrl: z.string().url(),
    toUrl: z.string().url(),
    scope: z.enum(['all', 'announcements', 'links']).optional().default('all'),
});

const linkListQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    type: z.enum(['official', 'pdf', 'external', 'all']).optional().default('all'),
    status: z.enum(['active', 'expired', 'broken', 'all']).optional().default('all'),
    announcementId: z.string().trim().optional(),
    search: z.string().trim().optional(),
});

const mediaAssetCreateSchema = z.object({
    label: z.string().trim().min(2).max(160),
    fileName: z.string().trim().min(1).max(220),
    fileUrl: z.string().url(),
    mimeType: z.string().trim().min(3).max(120),
    category: z.enum(['notification', 'result', 'admit-card', 'answer-key', 'syllabus', 'other']).optional().default('other'),
    keepStableUrl: z.boolean().optional().default(true),
    fileSizeBytes: z.coerce.number().int().min(0).optional(),
});

const mediaAssetPatchSchema = mediaAssetCreateSchema.partial().extend({
    status: z.enum(['active', 'archived']).optional(),
});

const mediaListQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    category: z.enum(['notification', 'result', 'admit-card', 'answer-key', 'syllabus', 'other', 'all']).optional().default('all'),
    status: z.enum(['active', 'archived', 'all']).optional().default('all'),
    search: z.string().trim().optional(),
});

const templateCreateSchema = z.object({
    type: z.enum(['job', 'result', 'admit-card', 'syllabus', 'answer-key', 'admission'] as [ContentType, ...ContentType[]]),
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).optional().or(z.literal('')),
    shared: z.boolean().optional().default(true),
    sections: z.array(z.string().trim().min(2).max(80)).max(20).optional().default([]),
    payload: z.record(z.unknown()).optional().default({}),
});

const templatePatchSchema = templateCreateSchema.partial();

const templateListQuerySchema = z.object({
    type: z.enum(['job', 'result', 'admit-card', 'syllabus', 'answer-key', 'admission', 'all']).optional().default('all'),
    shared: z
        .enum(['true', 'false', 'all'])
        .optional()
        .default('all'),
    limit: z.coerce.number().int().min(1).max(200).default(100),
    offset: z.coerce.number().int().min(0).default(0),
});

const alertCreateSchema = z.object({
    source: z.enum(['deadline', 'schedule', 'link', 'traffic', 'manual']),
    severity: z.enum(['info', 'warning', 'critical']),
    message: z.string().trim().min(3).max(500),
    status: z.enum(['open', 'acknowledged', 'resolved']).optional().default('open'),
    metadata: z.record(z.unknown()).optional(),
});

const alertPatchSchema = alertCreateSchema.partial();

const alertListQuerySchema = z.object({
    source: z.enum(['deadline', 'schedule', 'link', 'traffic', 'manual', 'all']).optional().default('all'),
    severity: z.enum(['info', 'warning', 'critical', 'all']).optional().default('all'),
    status: z.enum(['open', 'acknowledged', 'resolved', 'all']).optional().default('all'),
    limit: z.coerce.number().int().min(1).max(200).default(60),
    offset: z.coerce.number().int().min(0).default(0),
});

const settingValuesSchema = z.object({
    values: z.array(z.string().trim().min(1).max(120)).max(500).optional(),
    payload: z.record(z.unknown()).optional(),
});

const adminRoleUpdateSchema = z.object({
    role: z.enum(['admin', 'editor', 'reviewer', 'viewer', 'contributor']),
    isActive: z.boolean().optional(),
});

const adminInviteSchema = z.object({
    email: z.string().email().trim().toLowerCase(),
    role: z.enum(['admin', 'editor', 'reviewer', 'viewer', 'contributor']),
});

const adminStatusPatchSchema = z.object({
    isActive: z.boolean(),
});

const adminRoleOverrideSchema = z.object({
    permissions: z.array(z.enum(ADMIN_PERMISSION_LIST as [string, ...string[]]).or(z.literal('*'))).min(1),
});

const assignmentPatchSchema = z.object({
    assigneeUserId: z.string().trim().optional().or(z.literal('')),
    assigneeEmail: z.string().email().trim().optional().or(z.literal('')),
});

const reviewSlaPatchSchema = z.object({
    reviewDueAt: dateField,
});

const securityIncidentPatchSchema = z.object({
    incidentStatus: z.enum(['new', 'investigating', 'resolved']).optional(),
    assigneeEmail: z.string().email().trim().optional().or(z.literal('')),
    note: z.string().trim().max(1000).optional().or(z.literal('')),
});

const seoPatchSchema = z.object({
    seo: z.object({
        metaTitle: z.string().max(160).optional().or(z.literal('')),
        metaDescription: z.string().max(320).optional().or(z.literal('')),
        canonical: z.string().url().optional().or(z.literal('')),
        indexPolicy: z.enum(['index', 'noindex']).optional(),
        ogImage: z.string().url().optional().or(z.literal('')),
    }),
    schema: z.record(z.unknown()).optional(),
});

const adminSearchQuerySchema = z.object({
    q: z.string().trim().min(1).max(120),
    limit: z.coerce.number().int().min(1).max(100).default(24),
    entities: z.string().trim().optional(),
});

const adminViewsListQuerySchema = z.object({
    module: z.string().trim().min(1).max(80).optional(),
    scope: z.enum(['all', 'private', 'shared']).optional().default('all'),
    search: z.string().trim().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(100),
    offset: z.coerce.number().int().min(0).default(0),
});

const adminViewCreateSchema = z.object({
    name: z.string().trim().min(2).max(120),
    module: z.string().trim().min(2).max(80),
    scope: z.enum(['private', 'shared']).optional().default('private'),
    filters: z.record(z.unknown()).optional().default({}),
    columns: z.array(z.string().trim().min(1).max(80)).max(60).optional().default([]),
    sort: z.record(z.unknown()).optional(),
    isDefault: z.boolean().optional().default(false),
});

const adminViewPatchSchema = adminViewCreateSchema.partial();

const announcementDraftSchema = z.object({
    type: z.enum(['job', 'result', 'admit-card', 'syllabus', 'answer-key', 'admission'] as [ContentType, ...ContentType[]]).optional().default('job'),
    title: z.string().trim().min(3).max(500).optional(),
    category: z.string().trim().min(2).max(255).optional(),
    organization: z.string().trim().min(2).max(255).optional(),
    templateId: z.string().trim().max(120).optional(),
});

const announcementAutosaveSchema = adminAnnouncementPartialBaseSchema.extend({
    autosave: z.object({
        editorSessionId: z.string().trim().max(120).optional(),
        clientUpdatedAt: z.string().datetime().optional(),
        cursor: z.record(z.unknown()).optional(),
    }).optional(),
});

const announcementRevisionsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

const linkHealthSummaryQuerySchema = z.object({
    days: z.coerce.number().int().min(1).max(90).default(7),
});

const mapApprovalResolveFailure = (reason?: string) => {
    if (reason === 'not_found') {
        return { status: 404, code: 'approval_not_found' };
    }
    if (reason === 'self_approval_forbidden') {
        return { status: 403, code: 'self_approval_forbidden' };
    }
    if (reason?.startsWith('invalid_status:')) {
        return { status: 409, code: 'approval_invalid_status' };
    }
    return { status: 400, code: 'approval_invalid' };
};

const normalizeAnnouncementStatus = (status?: string | null) => status ?? 'published';

const isPublishedStatus = (status?: string | null) => normalizeAnnouncementStatus(status) === 'published';

const getRecentSecurityLogsSafe = async (limit = 250) => {
    const getRecentLogsPaged = (SecurityLogger as any)?.getRecentLogsPaged;
    if (typeof getRecentLogsPaged !== 'function') {
        return { data: [], total: 0, source: 'memory' as const };
    }
    return getRecentLogsPaged.call(SecurityLogger, limit, 0);
};

type DashboardWidgetStatus = 'ready' | 'empty' | 'forbidden' | 'error';
type DashboardMetricTone = 'neutral' | 'info' | 'warning' | 'danger' | 'success';
type DashboardActionTone = 'primary' | 'subtle' | 'warning' | 'danger' | 'success';
type DashboardWidgetKind = 'metrics' | 'list' | 'traffic' | 'actions';
type DashboardDataSource =
    | 'announcements'
    | 'users'
    | 'subscriptions'
    | 'alerts'
    | 'error_reports'
    | 'security_logs'
    | 'admin_audit_logs'
    | 'analytics_rollups'
    | 'announcement_views'
    | 'admin_approval_requests'
    | 'modules'
    | 'mixed';
type DashboardWidgetId =
    | 'summary'
    | 'my-queue'
    | 'pending-approvals'
    | 'my-deadlines'
    | 'recent-changes'
    | 'alerts'
    | 'security'
    | 'audit'
    | 'traffic'
    | 'top-content'
    | 'quick-actions';
type DashboardSectionId = 'my-work' | 'system-health';
type DashboardRouteKey =
    | 'analytics'
    | 'manage-posts'
    | 'create-post'
    | 'review'
    | 'approvals'
    | 'queue'
    | 'alerts'
    | 'security'
    | 'sessions'
    | 'audit'
    | 'reports'
    | 'error-reports'
    | 'users-roles'
    | 'link-manager'
    | 'detailed-post';

type DashboardWidgetEmptyState = {
    title: string;
    description: string;
};

type DashboardMetric = {
    key: string;
    label: string;
    value: number | string;
    route?: string;
    tone?: DashboardMetricTone;
    hint?: string;
};

type DashboardListItem = {
    id: string;
    title: string;
    subtitle?: string;
    meta?: string;
    route?: string;
    timestamp?: string;
};

type DashboardAction = {
    id: string;
    label: string;
    route: string;
    description?: string;
    tone?: DashboardActionTone;
};

type DashboardWidget<T> = {
    id: DashboardWidgetId;
    title: string;
    description: string;
    kind: DashboardWidgetKind;
    status: DashboardWidgetStatus;
    updatedAt: string;
    source: DashboardDataSource;
    stale: boolean;
    emptyState: DashboardWidgetEmptyState;
    permission?: Permission;
    drilldown?: string;
    message?: string;
    data: T | null;
};

type DashboardSection = {
    id: DashboardSectionId;
    title: string;
    description: string;
    widgetIds: DashboardWidgetId[];
};

type DashboardWidgetDefinition = {
    id: DashboardWidgetId;
    title: string;
    description: string;
    kind: DashboardWidgetKind;
    source: DashboardDataSource;
    emptyState: DashboardWidgetEmptyState;
    errorMessage: string;
    permission?: Permission;
    drilldown?: string;
};

type DashboardRouteDefinition = {
    key: DashboardRouteKey;
    route: string;
    permission: Permission;
};

type DashboardActionDefinition = {
    id: string;
    label: string;
    description: string;
    tone?: DashboardActionTone;
    routeKey: DashboardRouteKey;
};

type DashboardPermissionFlags = {
    adminRead: boolean;
    adminWrite: boolean;
    analyticsRead: boolean;
    announcementsRead: boolean;
    announcementsWrite: boolean;
    announcementsApprove: boolean;
    auditRead: boolean;
    securityRead: boolean;
};

const DASHBOARD_SNAPSHOT_TTL_MS = 30_000;
const DASHBOARD_WIDGET_STALE_MS = 15_000;
const dashboardSnapshotCache = new Map<string, { expiresAt: number; snapshot: any }>();

const DASHBOARD_SECTION_REGISTRY: DashboardSection[] = [
    {
        id: 'my-work',
        title: 'My Work',
        description: 'Assigned queue, pending approvals, my deadlines, and my recent changes.',
        widgetIds: ['my-queue', 'pending-approvals', 'my-deadlines', 'recent-changes'],
    },
    {
        id: 'system-health',
        title: 'System Health',
        description: 'Alerts, security, audit, and platform signals.',
        widgetIds: ['alerts', 'security', 'audit', 'traffic', 'top-content'],
    },
];

const DASHBOARD_WIDGET_REGISTRY: Record<DashboardWidgetId, DashboardWidgetDefinition> = {
    summary: {
        id: 'summary',
        title: 'Operations Snapshot',
        description: 'Current content, audience, and platform totals.',
        kind: 'metrics',
        source: 'mixed',
        permission: 'announcements:read',
        emptyState: {
            title: 'Overview unavailable',
            description: 'Summary metrics are unavailable for this role.',
        },
        errorMessage: 'Failed to load dashboard summary.',
    },
    'my-queue': {
        id: 'my-queue',
        title: 'My Queue',
        description: 'Assigned queue and review pressure tied to your account.',
        kind: 'metrics',
        source: 'announcements',
        permission: 'announcements:read',
        drilldown: '/queue?assignee=me',
        emptyState: {
            title: 'Queue is clear',
            description: 'No assigned or pending queue work right now.',
        },
        errorMessage: 'Failed to load my queue.',
    },
    'pending-approvals': {
        id: 'pending-approvals',
        title: 'Pending Approvals',
        description: 'Approval load, expiry pressure, and execution backlog.',
        kind: 'metrics',
        source: 'admin_approval_requests',
        permission: 'announcements:approve',
        drilldown: '/approvals',
        emptyState: {
            title: 'Approvals are clear',
            description: 'No approval backlog is waiting on this role.',
        },
        errorMessage: 'Failed to load approvals.',
    },
    'my-deadlines': {
        id: 'my-deadlines',
        title: 'My Deadlines',
        description: 'Upcoming deadlines for content already assigned to you.',
        kind: 'list',
        source: 'announcements',
        permission: 'announcements:read',
        drilldown: '/queue?assignee=me',
        emptyState: {
            title: 'No deadlines due',
            description: 'No assigned deadlines are due in the next 7 days.',
        },
        errorMessage: 'Failed to load upcoming deadlines.',
    },
    'recent-changes': {
        id: 'recent-changes',
        title: 'My Recent Changes',
        description: 'Your latest content and administrative changes.',
        kind: 'list',
        source: 'announcements',
        permission: 'announcements:read',
        drilldown: '/manage-posts',
        emptyState: {
            title: 'No recent changes',
            description: 'Your recent changes will appear here after the next update.',
        },
        errorMessage: 'Failed to load recent changes.',
    },
    alerts: {
        id: 'alerts',
        title: 'Alerts',
        description: 'Open alerts, critical issues, and unresolved errors.',
        kind: 'metrics',
        source: 'mixed',
        permission: 'admin:read',
        drilldown: '/alerts',
        emptyState: {
            title: 'No active alerts',
            description: 'There are no open alerts or unresolved error spikes right now.',
        },
        errorMessage: 'Failed to load alerts.',
    },
    security: {
        id: 'security',
        title: 'Security',
        description: 'Risky sessions and blocked or suspicious activity.',
        kind: 'metrics',
        source: 'security_logs',
        permission: 'security:read',
        drilldown: '/security',
        emptyState: {
            title: 'Security is calm',
            description: 'No active session anomalies or blocked events were detected.',
        },
        errorMessage: 'Failed to load security signals.',
    },
    audit: {
        id: 'audit',
        title: 'Audit Activity',
        description: 'Recent administrative actions across the control plane.',
        kind: 'list',
        source: 'admin_audit_logs',
        permission: 'audit:read',
        drilldown: '/audit',
        emptyState: {
            title: 'No audit activity',
            description: 'Administrative activity will appear here as actions are recorded.',
        },
        errorMessage: 'Failed to load audit activity.',
    },
    traffic: {
        id: 'traffic',
        title: 'Traffic Overview',
        description: 'Seven-day traffic and source mix for the public platform.',
        kind: 'traffic',
        source: 'analytics_rollups',
        permission: 'analytics:read',
        drilldown: '/analytics',
        emptyState: {
            title: 'No traffic data yet',
            description: 'Traffic charts will populate after announcement views are recorded.',
        },
        errorMessage: 'Failed to load traffic trends.',
    },
    'top-content': {
        id: 'top-content',
        title: 'Top Content',
        description: 'Most-viewed announcements in the last 24 hours.',
        kind: 'list',
        source: 'announcement_views',
        permission: 'analytics:read',
        drilldown: '/analytics',
        emptyState: {
            title: 'No viewed posts yet',
            description: 'Top content will appear after public traffic events are recorded.',
        },
        errorMessage: 'Failed to load top content.',
    },
    'quick-actions': {
        id: 'quick-actions',
        title: 'Quick Actions',
        description: 'Only modules this role can successfully open are shown here.',
        kind: 'actions',
        source: 'modules',
        emptyState: {
            title: 'No actions available',
            description: 'No quick actions are currently available for this role.',
        },
        errorMessage: 'Failed to build quick actions.',
    },
};

const DASHBOARD_ROUTE_REGISTRY: Record<DashboardRouteKey, DashboardRouteDefinition> = {
    analytics: { key: 'analytics', route: '/analytics', permission: 'analytics:read' },
    'manage-posts': { key: 'manage-posts', route: '/manage-posts', permission: 'announcements:read' },
    'create-post': { key: 'create-post', route: '/create-post', permission: 'announcements:write' },
    review: { key: 'review', route: '/review', permission: 'announcements:approve' },
    approvals: { key: 'approvals', route: '/approvals', permission: 'announcements:approve' },
    queue: { key: 'queue', route: '/queue', permission: 'announcements:read' },
    alerts: { key: 'alerts', route: '/alerts', permission: 'admin:read' },
    security: { key: 'security', route: '/security', permission: 'security:read' },
    sessions: { key: 'sessions', route: '/sessions', permission: 'security:read' },
    audit: { key: 'audit', route: '/audit', permission: 'audit:read' },
    reports: { key: 'reports', route: '/reports', permission: 'analytics:read' },
    'error-reports': { key: 'error-reports', route: '/errors', permission: 'admin:read' },
    'users-roles': { key: 'users-roles', route: '/users-roles', permission: 'admin:read' },
    'link-manager': { key: 'link-manager', route: '/link-manager', permission: 'announcements:write' },
    'detailed-post': { key: 'detailed-post', route: '/detailed-post', permission: 'announcements:write' },
};

const DASHBOARD_ACTION_CATALOG: DashboardActionDefinition[] = [
    { id: 'create-post', label: 'New Post', description: 'Open the unified content create flow.', tone: 'primary', routeKey: 'create-post' },
    { id: 'manage-posts', label: 'Manage Posts', description: 'Open the post operations table.', tone: 'subtle', routeKey: 'manage-posts' },
    { id: 'review', label: 'Review Queue', description: 'Process pending review items.', tone: 'warning', routeKey: 'review' },
    { id: 'approvals', label: 'Approvals', description: 'Resolve approval-gated actions.', tone: 'warning', routeKey: 'approvals' },
    { id: 'alerts', label: 'Alerts', description: 'Open the operational alert feed.', tone: 'subtle', routeKey: 'alerts' },
    { id: 'analytics', label: 'Analytics', description: 'Inspect traffic and audience movement.', tone: 'subtle', routeKey: 'analytics' },
    { id: 'reports', label: 'Reports', description: 'Open the reporting workspace.', tone: 'subtle', routeKey: 'reports' },
    { id: 'security', label: 'Security', description: 'Investigate incidents and risky activity.', tone: 'danger', routeKey: 'security' },
    { id: 'sessions', label: 'Sessions', description: 'Inspect active admin sessions.', tone: 'danger', routeKey: 'sessions' },
    { id: 'audit', label: 'Audit Log', description: 'Review the latest administrative actions.', tone: 'subtle', routeKey: 'audit' },
    { id: 'users-roles', label: 'Users & Roles', description: 'Review access, roles, and account posture.', tone: 'subtle', routeKey: 'users-roles' },
];

const cloneDashboardValue = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const hasDashboardPermission = (permissions: DashboardPermissionFlags, permission: Permission): boolean => {
    switch (permission) {
        case 'admin:read':
            return permissions.adminRead;
        case 'admin:write':
            return permissions.adminWrite;
        case 'analytics:read':
            return permissions.analyticsRead;
        case 'announcements:read':
            return permissions.announcementsRead;
        case 'announcements:write':
            return permissions.announcementsWrite;
        case 'announcements:approve':
            return permissions.announcementsApprove;
        case 'audit:read':
            return permissions.auditRead;
        case 'security:read':
            return permissions.securityRead;
        case 'announcements:delete':
            return false;
        default:
            return false;
    }
};

const resolveDashboardRoute = (key: DashboardRouteKey, permissions: DashboardPermissionFlags) => {
    const definition = DASHBOARD_ROUTE_REGISTRY[key];
    return hasDashboardPermission(permissions, definition.permission) ? definition.route : undefined;
};

const resolveAnnouncementDrilldownRoute = (announcementId: string, permissions: DashboardPermissionFlags) => {
    const detailedPostRoute = resolveDashboardRoute('detailed-post', permissions);
    if (detailedPostRoute) {
        return `${detailedPostRoute}?focus=${encodeURIComponent(announcementId)}`;
    }
    return resolveDashboardRoute('manage-posts', permissions);
};

const deriveDashboardActions = (permissions: DashboardPermissionFlags): DashboardAction[] =>
    DASHBOARD_ACTION_CATALOG.flatMap((item) => {
        const route = resolveDashboardRoute(item.routeKey, permissions);
        if (!route) return [];
        return [{
            id: item.id,
            label: item.label,
            route,
            description: item.description,
            tone: item.tone,
        }];
    });

const findDashboardAction = (actions: DashboardAction[], ids: string[]) =>
    actions.find((item) => ids.includes(item.id));

const dashboardReady = <T>(
    definition: DashboardWidgetDefinition,
    data: T,
    options?: { empty?: boolean; message?: string; permission?: Permission; updatedAt?: string; stale?: boolean }
): DashboardWidget<T> => ({
    id: definition.id,
    title: definition.title,
    description: definition.description,
    kind: definition.kind,
    status: options?.empty ? 'empty' : 'ready',
    updatedAt: options?.updatedAt ?? new Date().toISOString(),
    source: definition.source,
    stale: options?.stale ?? false,
    emptyState: definition.emptyState,
    ...(definition.permission ? { permission: definition.permission } : {}),
    ...(definition.drilldown ? { drilldown: definition.drilldown } : {}),
    ...(options?.permission ? { permission: options.permission } : {}),
    ...(options?.message ? { message: options.message } : {}),
    data,
});

const dashboardForbidden = <T>(
    definition: DashboardWidgetDefinition,
    message: string,
    permissionOverride?: Permission
): DashboardWidget<T> => ({
    id: definition.id,
    title: definition.title,
    description: definition.description,
    kind: definition.kind,
    status: 'forbidden',
    updatedAt: new Date().toISOString(),
    source: definition.source,
    stale: false,
    emptyState: definition.emptyState,
    permission: permissionOverride ?? definition.permission,
    drilldown: definition.drilldown,
    message,
    data: null,
});

const dashboardError = <T>(
    definition: DashboardWidgetDefinition,
    message?: string,
    options?: { permission?: Permission; updatedAt?: string; stale?: boolean }
): DashboardWidget<T> => ({
    id: definition.id,
    title: definition.title,
    description: definition.description,
    kind: definition.kind,
    status: 'error',
    updatedAt: options?.updatedAt ?? new Date().toISOString(),
    source: definition.source,
    stale: options?.stale ?? false,
    emptyState: definition.emptyState,
    ...(options?.permission ? { permission: options.permission } : (definition.permission ? { permission: definition.permission } : {})),
    ...(definition.drilldown ? { drilldown: definition.drilldown } : {}),
    message: message ?? definition.errorMessage,
    data: null,
});

const dashboardFocusByRole = (
    role: string | undefined,
    actions: DashboardAction[]
): {
    eyebrow: string;
    title: string;
    description: string;
    primaryAction?: DashboardAction;
    secondaryAction?: DashboardAction;
} => {
    switch (role) {
        case 'admin':
            return {
                eyebrow: 'Admin Control',
                title: 'Own incidents, routing, and access drift first.',
                description: 'Start with critical alerts, risky sessions, and role-impacting changes before moving into content operations.',
                primaryAction: findDashboardAction(actions, ['security', 'alerts']),
                secondaryAction: findDashboardAction(actions, ['users-roles', 'audit']),
            };
        case 'reviewer':
            return {
                eyebrow: 'Reviewer Lane',
                title: 'Clear pending approvals and review debt before new work accumulates.',
                description: 'Prioritize the work already on your desk, then close overdue reviews and approval expiry risk.',
                primaryAction: findDashboardAction(actions, ['review']),
                secondaryAction: findDashboardAction(actions, ['approvals', 'audit']),
            };
        case 'editor':
        case 'contributor':
            return {
                eyebrow: 'Publishing Lane',
                title: 'Move assigned content forward before opening new drafts.',
                description: 'Focus on assigned work, deadline risk, and changes you already own.',
                primaryAction: findDashboardAction(actions, ['manage-posts']),
                secondaryAction: findDashboardAction(actions, ['create-post']),
            };
        default:
            return {
                eyebrow: 'Monitoring Lane',
                title: 'Track platform movement without stepping into write paths.',
                description: 'Use the dashboard as a read-only control room for alerts, traffic, and audit movement.',
                primaryAction: findDashboardAction(actions, ['analytics', 'reports', 'alerts']),
                secondaryAction: findDashboardAction(actions, ['alerts', 'audit', 'manage-posts']),
            };
    }
};

const humanizeDashboardAuditAction = (action?: string | null) => {
    const normalized = String(action ?? '')
        .replace(/^admin_/, '')
        .replace(/_/g, ' ')
        .trim();
    if (!normalized) return 'Admin activity';
    return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
};

const isHighRiskSecurityLog = (entry: any) => {
    const eventType = String(entry?.eventType ?? entry?.event_type ?? '').toLowerCase();
    return eventType.includes('alert')
        || eventType.includes('fail')
        || eventType.includes('forbidden')
        || eventType.includes('blocked');
};

const buildDashboardPermissionFlags = async (role: string | undefined): Promise<DashboardPermissionFlags> => {
    const [
        adminRead,
        adminWrite,
        analyticsRead,
        announcementsRead,
        announcementsWrite,
        announcementsApprove,
        auditRead,
        securityRead,
    ] = await Promise.all([
        hasEffectivePermission(role as any, 'admin:read'),
        hasEffectivePermission(role as any, 'admin:write'),
        hasEffectivePermission(role as any, 'analytics:read'),
        hasEffectivePermission(role as any, 'announcements:read'),
        hasEffectivePermission(role as any, 'announcements:write'),
        hasEffectivePermission(role as any, 'announcements:approve'),
        hasEffectivePermission(role as any, 'audit:read'),
        hasEffectivePermission(role as any, 'security:read'),
    ]);

    return {
        adminRead,
        adminWrite,
        analyticsRead,
        announcementsRead,
        announcementsWrite,
        announcementsApprove,
        auditRead,
        securityRead,
    };
};

const withDashboardFreshness = <T extends { generatedAt?: string; widgets?: Record<string, { stale?: boolean }> }>(snapshot: T): T => {
    const generatedAtMs = snapshot.generatedAt ? new Date(snapshot.generatedAt).getTime() : 0;
    const isStale = Number.isFinite(generatedAtMs) ? (Date.now() - generatedAtMs) > DASHBOARD_WIDGET_STALE_MS : false;
    for (const widget of Object.values(snapshot.widgets ?? {})) {
        widget.stale = isStale;
    }
    return snapshot;
};

const readCachedDashboardSnapshot = (cacheKey: string) => {
    const cached = dashboardSnapshotCache.get(cacheKey);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
        dashboardSnapshotCache.delete(cacheKey);
        return null;
    }
    return withDashboardFreshness(cloneDashboardValue(cached.snapshot));
};

const writeCachedDashboardSnapshot = (cacheKey: string, snapshot: Record<string, unknown>) => {
    dashboardSnapshotCache.set(cacheKey, {
        expiresAt: Date.now() + DASHBOARD_SNAPSHOT_TTL_MS,
        snapshot: cloneDashboardValue(snapshot),
    });
};

const buildAdminDashboardSnapshot = async (req: any) => {
    const role = typeof req.user?.role === 'string' ? req.user.role : undefined;
    const displayName = typeof req.user?.email === 'string'
        ? req.user.email.split('@')[0]
        : 'Admin';
    const permissions = await buildDashboardPermissionFlags(role);
    const cacheKey = JSON.stringify({
        userId: String(req.user?.userId ?? req.user?.email ?? 'anonymous'),
        role: role ?? 'unknown',
        permissions,
    });
    const cached = readCachedDashboardSnapshot(cacheKey);
    if (cached) {
        return cached;
    }

    const generatedAt = new Date().toISOString();
    const actions = deriveDashboardActions(permissions);
    const focus = dashboardFocusByRole(role, actions);

    const announcementsPromise = permissions.announcementsRead
        ? AnnouncementModelMongo.findAllAdmin({ includeInactive: true, limit: 2000 })
        : Promise.resolve(null);
    const activeUsersPromise = permissions.adminRead
        ? getCollection<UserDoc>('users').countDocuments({ isActive: true })
        : Promise.resolve(null);
    const subscribersPromise = permissions.analyticsRead
        ? getCollection<SubscriptionDoc>('subscriptions').countDocuments({ isActive: true, verified: true })
        : Promise.resolve(null);
    const brokenLinksPromise = permissions.announcementsWrite
        ? getCollection<LinkRecordDoc>('link_records').countDocuments({ status: 'broken' } as any)
        : Promise.resolve(null);
    const openAlertsPromise = permissions.adminRead
        ? getCollection<AdminAlertDoc>('admin_alerts').countDocuments({ status: 'open' } as any)
        : Promise.resolve(null);
    const criticalAlertsPromise = permissions.adminRead
        ? getCollection<AdminAlertDoc>('admin_alerts').countDocuments({ status: 'open', severity: 'critical' } as any)
        : Promise.resolve(null);
    const errorReportsPromise = permissions.adminRead
        ? getCollection<any>('error_reports').countDocuments({ status: { $ne: 'resolved' } } as any)
        : Promise.resolve(null);
    const trafficSeriesPromise = permissions.analyticsRead ? getDailyRollups(7) : Promise.resolve(null);
    const trafficSourcesPromise = permissions.analyticsRead ? getAnnouncementViewTrafficSources(7) : Promise.resolve(null);
    const topViewsPromise = permissions.analyticsRead ? getTopAnnouncementViews(24, 10) : Promise.resolve(null);
    const auditPromise = permissions.auditRead
        ? getAdminAuditLogsPaged({ limit: 10, offset: 0 })
        : Promise.resolve(null);
    const securityPromise = permissions.securityRead
        ? getRecentSecurityLogsSafe(250)
        : Promise.resolve(null);
    const approvalsPromise = permissions.announcementsApprove
        ? getAdminApprovalWorkflowSummary({ dueSoonMinutes: 60 })
        : Promise.resolve(null);

    const [
        announcementsResult,
        activeUsersResult,
        subscribersResult,
        brokenLinksResult,
        openAlertsResult,
        criticalAlertsResult,
        errorReportsResult,
        trafficSeriesResult,
        trafficSourcesResult,
        topViewsResult,
        auditResult,
        securityResult,
        approvalsResult,
    ] = await Promise.allSettled([
        announcementsPromise,
        activeUsersPromise,
        subscribersPromise,
        brokenLinksPromise,
        openAlertsPromise,
        criticalAlertsPromise,
        errorReportsPromise,
        trafficSeriesPromise,
        trafficSourcesPromise,
        topViewsPromise,
        auditPromise,
        securityPromise,
        approvalsPromise,
    ]);

    const announcements = announcementsResult.status === 'fulfilled' ? announcementsResult.value : null;
    const totalUsers = activeUsersResult.status === 'fulfilled' ? activeUsersResult.value : null;
    const activeSubscribers = subscribersResult.status === 'fulfilled' ? subscribersResult.value : null;
    const brokenLinks = brokenLinksResult.status === 'fulfilled' ? brokenLinksResult.value : null;
    const openAlerts = openAlertsResult.status === 'fulfilled' ? openAlertsResult.value : null;
    const criticalAlerts = criticalAlertsResult.status === 'fulfilled' ? criticalAlertsResult.value : null;
    const unresolvedErrors = errorReportsResult.status === 'fulfilled' ? errorReportsResult.value : null;
    const trafficSeries = trafficSeriesResult.status === 'fulfilled' ? trafficSeriesResult.value : null;
    const trafficSources = trafficSourcesResult.status === 'fulfilled' ? trafficSourcesResult.value : null;
    const topViews = topViewsResult.status === 'fulfilled' ? topViewsResult.value : null;
    const auditFeed = auditResult.status === 'fulfilled' ? auditResult.value : null;
    const securityFeed = securityResult.status === 'fulfilled' ? securityResult.value : null;
    const approvalSummary = approvalsResult.status === 'fulfilled' ? approvalsResult.value : null;

    const nowMs = Date.now();
    const sevenDaysMs = nowMs + (7 * 24 * 60 * 60 * 1000);
    const currentUserId = String(req.user?.userId ?? '');
    const currentEmail = typeof req.user?.email === 'string' ? req.user.email : undefined;
    const managePostsRoute = resolveDashboardRoute('manage-posts', permissions);
    const reviewRoute = resolveDashboardRoute('review', permissions);
    const approvalsRoute = resolveDashboardRoute('approvals', permissions);
    const queueRoute = resolveDashboardRoute('queue', permissions);
    const alertsRoute = resolveDashboardRoute('alerts', permissions);
    const securityRoute = resolveDashboardRoute('security', permissions);
    const sessionsRoute = resolveDashboardRoute('sessions', permissions);
    const auditRoute = resolveDashboardRoute('audit', permissions);
    const reportsRoute = resolveDashboardRoute('reports', permissions);
    const usersRolesRoute = resolveDashboardRoute('users-roles', permissions);
    const linkManagerRoute = resolveDashboardRoute('link-manager', permissions);
    const errorReportsRoute = resolveDashboardRoute('error-reports', permissions);

    const withQuery = (route: string | undefined, query: string) => (route ? `${route}${query}` : undefined);
    const hasWorkOwner = (item: any) =>
        (currentUserId && String(item?.assigneeUserId ?? '') === currentUserId)
        || (currentEmail && String(item?.assigneeEmail ?? '') === currentEmail)
        || (currentEmail && String(item?.updatedBy ?? '') === currentEmail)
        || (currentEmail && String(item?.createdBy ?? item?.authorEmail ?? '') === currentEmail);
    const hasPositiveMetric = (metrics: DashboardMetric[]) =>
        metrics.some((metric) => typeof metric.value === 'number' && metric.value > 0);
    const summaryDefinition = DASHBOARD_WIDGET_REGISTRY.summary;
    const myQueueDefinition = DASHBOARD_WIDGET_REGISTRY['my-queue'];
    const approvalsDefinition = DASHBOARD_WIDGET_REGISTRY['pending-approvals'];
    const deadlinesDefinition = DASHBOARD_WIDGET_REGISTRY['my-deadlines'];
    const recentChangesDefinition = DASHBOARD_WIDGET_REGISTRY['recent-changes'];
    const alertsDefinition = DASHBOARD_WIDGET_REGISTRY.alerts;
    const securityDefinition = DASHBOARD_WIDGET_REGISTRY.security;
    const auditDefinition = DASHBOARD_WIDGET_REGISTRY.audit;
    const trafficDefinition = DASHBOARD_WIDGET_REGISTRY.traffic;
    const topContentDefinition = DASHBOARD_WIDGET_REGISTRY['top-content'];
    const quickActionsDefinition = DASHBOARD_WIDGET_REGISTRY['quick-actions'];

    const announcementDocs: any[] = Array.isArray(announcements) ? announcements : [];
    const announcementsById = new Map<string, any>(
        announcementDocs.map((item: any) => [serializeId(item?.id ?? item?._id), item])
    );

    const summary = (() => {
        if (!permissions.announcementsRead) {
            return dashboardForbidden<{ metrics: DashboardMetric[] }>(
                summaryDefinition,
                'Announcement access is required to view the operations snapshot.'
            );
        }
        if (!announcements) {
            return dashboardError<{ metrics: DashboardMetric[] }>(summaryDefinition, undefined, { updatedAt: generatedAt });
        }

        const statusMap = announcementDocs.reduce<Record<string, number>>((acc, item: any) => {
            const key = normalizeAnnouncementStatus(item.status);
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
        }, {});
        const totalViews = announcementDocs.reduce((sum: number, item: any) => sum + Number(item.viewCount ?? 0), 0);
        const metrics: DashboardMetric[] = [
            { key: 'total-posts', label: 'Total Posts', value: announcementDocs.length, route: managePostsRoute },
            { key: 'published', label: 'Published', value: statusMap.published ?? 0, route: withQuery(managePostsRoute, '?status=published'), tone: 'success' },
            { key: 'pending-review', label: 'Pending Review', value: statusMap.pending ?? 0, route: reviewRoute ?? managePostsRoute, tone: (statusMap.pending ?? 0) > 0 ? 'warning' : 'neutral' },
            { key: 'views', label: 'Total Views', value: totalViews, route: reportsRoute, hint: reportsRoute ? undefined : 'Analytics access required' },
            { key: 'active-users', label: 'Active Users', value: usersRolesRoute ? (totalUsers ?? '--') : 'Locked', route: usersRolesRoute, hint: usersRolesRoute ? (totalUsers === null ? 'Unavailable' : undefined) : 'Requires admin access' },
            { key: 'subscribers', label: 'Subscribers', value: reportsRoute ? (activeSubscribers ?? '--') : 'Locked', route: reportsRoute, hint: reportsRoute ? (activeSubscribers === null ? 'Unavailable' : undefined) : 'Requires analytics access' },
        ];

        return dashboardReady(summaryDefinition, { metrics }, {
            empty: announcementDocs.length === 0 && totalViews === 0,
            message: announcementDocs.length === 0 ? 'No announcements are available to summarize yet.' : undefined,
            updatedAt: generatedAt,
        });
    })();

    const myQueue = (() => {
        if (!permissions.announcementsRead) {
            return dashboardForbidden<{ metrics: DashboardMetric[] }>(
                myQueueDefinition,
                'Announcement access is required to view your queue.'
            );
        }
        if (!announcements) {
            return dashboardError<{ metrics: DashboardMetric[] }>(myQueueDefinition, undefined, { updatedAt: generatedAt });
        }

        const pendingReviewItems = announcementDocs.filter((item: any) => normalizeAnnouncementStatus(item.status) === 'pending');
        const overdueReviewItems = pendingReviewItems.filter((item: any) => item.reviewDueAt && new Date(item.reviewDueAt).getTime() < nowMs);
        const unassignedPendingReview = pendingReviewItems.filter((item: any) => !item.assigneeUserId && !item.assigneeEmail);
        const ownedAnnouncements = announcementDocs.filter((item: any) => hasWorkOwner(item));
        const assignedToCurrentUser = ownedAnnouncements.filter((item: any) => ['pending', 'scheduled', 'draft'].includes(normalizeAnnouncementStatus(item.status)));
        const myDrafts = ownedAnnouncements.filter((item: any) => normalizeAnnouncementStatus(item.status) === 'draft');
        const myScheduled = ownedAnnouncements.filter((item: any) => normalizeAnnouncementStatus(item.status) === 'scheduled');
        const myDueSoon = ownedAnnouncements.filter((item: any) => {
            if (!item.deadline) return false;
            const deadlineTs = new Date(item.deadline).getTime();
            return !Number.isNaN(deadlineTs) && deadlineTs >= nowMs && deadlineTs <= sevenDaysMs;
        });

        const metrics: DashboardMetric[] = role === 'reviewer'
            ? [
                { key: 'pending-review', label: 'Pending Reviews', value: pendingReviewItems.length, route: reviewRoute, tone: pendingReviewItems.length > 0 ? 'warning' : 'neutral' },
                { key: 'overdue-review', label: 'Overdue Review Items', value: overdueReviewItems.length, route: withQuery(reviewRoute, '?status=pending&sla=overdue'), tone: overdueReviewItems.length > 0 ? 'danger' : 'neutral' },
                { key: 'unassigned', label: 'Unassigned Pending Reviews', value: unassignedPendingReview.length, route: withQuery(reviewRoute, '?status=pending&assignee=unassigned'), tone: unassignedPendingReview.length > 0 ? 'warning' : 'neutral' },
                { key: 'assigned', label: 'Assigned To Me', value: assignedToCurrentUser.length, route: withQuery(queueRoute, '?assignee=me'), tone: assignedToCurrentUser.length > 0 ? 'info' : 'neutral' },
                { key: 'approvals-due', label: 'Approvals Due Soon', value: approvalsRoute ? (approvalSummary?.dueSoon ?? '--') : 'Locked', route: approvalsRoute, tone: (approvalSummary?.dueSoon ?? 0) > 0 ? 'warning' : 'neutral', hint: approvalsRoute ? (approvalSummary ? undefined : 'Unavailable') : 'Requires approval access' },
            ]
            : role === 'editor' || role === 'contributor'
                ? [
                    { key: 'assigned', label: 'Assigned To Me', value: assignedToCurrentUser.length, route: withQuery(queueRoute, '?assignee=me'), tone: assignedToCurrentUser.length > 0 ? 'info' : 'neutral' },
                    { key: 'drafts', label: 'My Drafts', value: myDrafts.length, route: withQuery(managePostsRoute, '?status=draft'), tone: myDrafts.length > 0 ? 'warning' : 'neutral' },
                    { key: 'scheduled', label: 'Scheduled', value: myScheduled.length, route: withQuery(queueRoute, '?status=scheduled'), tone: myScheduled.length > 0 ? 'info' : 'neutral' },
                    { key: 'deadlines', label: 'Deadlines This Week', value: myDueSoon.length, route: queueRoute, tone: myDueSoon.length > 0 ? 'warning' : 'neutral' },
                    { key: 'broken-links', label: 'Broken Links', value: linkManagerRoute ? (brokenLinks ?? '--') : 'Locked', route: linkManagerRoute, tone: (brokenLinks ?? 0) > 0 ? 'danger' : 'neutral', hint: linkManagerRoute ? (brokenLinks === null ? 'Unavailable' : undefined) : 'Requires write access' },
                ]
                : [
                    { key: 'pending-review', label: 'Pending Reviews', value: pendingReviewItems.length, route: reviewRoute ?? managePostsRoute, tone: pendingReviewItems.length > 0 ? 'warning' : 'neutral' },
                    { key: 'unassigned', label: 'Unassigned Pending Reviews', value: unassignedPendingReview.length, route: withQuery(reviewRoute, '?status=pending&assignee=unassigned'), tone: unassignedPendingReview.length > 0 ? 'warning' : 'neutral' },
                    { key: 'overdue', label: 'Overdue Review Items', value: overdueReviewItems.length, route: withQuery(reviewRoute, '?status=pending&sla=overdue'), tone: overdueReviewItems.length > 0 ? 'danger' : 'neutral' },
                    { key: 'assigned', label: 'My Queue', value: assignedToCurrentUser.length, route: withQuery(queueRoute, '?assignee=me'), tone: assignedToCurrentUser.length > 0 ? 'info' : 'neutral' },
                    { key: 'broken-links', label: 'Broken Links', value: linkManagerRoute ? (brokenLinks ?? '--') : 'Locked', route: linkManagerRoute, tone: (brokenLinks ?? 0) > 0 ? 'danger' : 'neutral', hint: linkManagerRoute ? (brokenLinks === null ? 'Unavailable' : undefined) : 'Requires write access' },
                ];

        return dashboardReady(myQueueDefinition, { metrics }, {
            empty: !hasPositiveMetric(metrics),
            message: 'No active queue pressure right now.',
            updatedAt: generatedAt,
        });
    })();

    const pendingApprovals = (() => {
        if (!permissions.announcementsApprove) {
            return dashboardForbidden<{ metrics: DashboardMetric[] }>(
                approvalsDefinition,
                'Approval access is required to view pending approvals.'
            );
        }
        if (!approvalSummary) {
            return dashboardError<{ metrics: DashboardMetric[] }>(approvalsDefinition, undefined, { updatedAt: generatedAt });
        }

        const metrics: DashboardMetric[] = [
            { key: 'pending', label: 'Pending', value: approvalSummary.pending, route: withQuery(approvalsRoute, '?status=pending'), tone: approvalSummary.pending > 0 ? 'warning' : 'neutral' },
            { key: 'approved', label: 'Approved Pending Execution', value: approvalSummary.approvedPendingExecution, route: withQuery(approvalsRoute, '?status=approved'), tone: approvalSummary.approvedPendingExecution > 0 ? 'info' : 'neutral' },
            { key: 'overdue', label: 'Overdue', value: approvalSummary.overdue, route: approvalsRoute, tone: approvalSummary.overdue > 0 ? 'danger' : 'neutral' },
            { key: 'due-soon', label: 'Due Soon', value: approvalSummary.dueSoon, route: approvalsRoute, tone: approvalSummary.dueSoon > 0 ? 'warning' : 'neutral' },
        ];

        return dashboardReady(approvalsDefinition, { metrics }, {
            empty: !hasPositiveMetric(metrics),
            message: 'No approvals are waiting on this role right now.',
            updatedAt: generatedAt,
        });
    })();

    const myDeadlines = (() => {
        if (!permissions.announcementsRead) {
            return dashboardForbidden<{ items: DashboardListItem[] }>(
                deadlinesDefinition,
                'Announcement access is required to view upcoming deadlines.'
            );
        }
        if (!announcements) {
            return dashboardError<{ items: DashboardListItem[] }>(deadlinesDefinition, undefined, { updatedAt: generatedAt });
        }

        const items = announcementDocs
            .filter((item: any) => hasWorkOwner(item) && item.deadline)
            .filter((item: any) => {
                const deadlineTs = new Date(item.deadline).getTime();
                return !Number.isNaN(deadlineTs) && deadlineTs >= nowMs && deadlineTs <= sevenDaysMs;
            })
            .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
            .slice(0, 6)
            .map((item: any) => {
                const id = serializeId(item.id ?? item._id);
                return {
                    id,
                    title: String(item.title ?? 'Untitled announcement'),
                    subtitle: String(item.organization ?? item.type ?? 'Announcement'),
                    meta: humanizeDashboardAuditAction(normalizeAnnouncementStatus(item.status)),
                    route: resolveAnnouncementDrilldownRoute(id, permissions),
                    timestamp: String(item.deadline),
                } satisfies DashboardListItem;
            });

        return dashboardReady(deadlinesDefinition, { items }, {
            empty: items.length === 0,
            message: 'No assigned deadlines are due in the next 7 days.',
            updatedAt: generatedAt,
        });
    })();

    const recentChanges = (() => {
        if (!permissions.announcementsRead) {
            return dashboardForbidden<{ items: DashboardListItem[] }>(
                recentChangesDefinition,
                'Announcement access is required to view your recent changes.'
            );
        }
        if (!announcements) {
            return dashboardError<{ items: DashboardListItem[] }>(recentChangesDefinition, undefined, { updatedAt: generatedAt });
        }

        const items = announcementDocs
            .filter((item: any) => hasWorkOwner(item))
            .sort((a: any, b: any) => new Date(b.updatedAt ?? b.createdAt ?? generatedAt).getTime() - new Date(a.updatedAt ?? a.createdAt ?? generatedAt).getTime())
            .slice(0, 6)
            .map((item: any) => {
                const id = serializeId(item.id ?? item._id);
                return {
                    id,
                    title: String(item.title ?? 'Untitled announcement'),
                    subtitle: String(item.organization ?? item.type ?? 'Announcement'),
                    meta: humanizeDashboardAuditAction(normalizeAnnouncementStatus(item.status)),
                    route: resolveAnnouncementDrilldownRoute(id, permissions),
                    timestamp: String(item.updatedAt ?? item.createdAt ?? generatedAt),
                } satisfies DashboardListItem;
            });

        return dashboardReady(recentChangesDefinition, { items }, {
            empty: items.length === 0,
            message: 'Your recent changes will appear here after the next update.',
            updatedAt: generatedAt,
        });
    })();

    const alertsWidget = (() => {
        if (!permissions.adminRead) {
            return dashboardForbidden<{ metrics: DashboardMetric[] }>(
                alertsDefinition,
                'Admin access is required to view alerts.'
            );
        }
        if (openAlerts === null && criticalAlerts === null && unresolvedErrors === null) {
            return dashboardError<{ metrics: DashboardMetric[] }>(alertsDefinition, undefined, { updatedAt: generatedAt });
        }

        const metrics: DashboardMetric[] = [
            { key: 'open-alerts', label: 'Open Alerts', value: openAlerts ?? '--', route: alertsRoute, tone: (openAlerts ?? 0) > 0 ? 'warning' : 'neutral', hint: openAlerts === null ? 'Unavailable' : undefined },
            { key: 'critical-alerts', label: 'Critical Alerts', value: criticalAlerts ?? '--', route: withQuery(alertsRoute, '?status=open&severity=critical'), tone: (criticalAlerts ?? 0) > 0 ? 'danger' : 'neutral', hint: criticalAlerts === null ? 'Unavailable' : undefined },
            { key: 'unresolved-errors', label: 'Unresolved Errors', value: unresolvedErrors ?? '--', route: errorReportsRoute, tone: (unresolvedErrors ?? 0) > 0 ? 'warning' : 'neutral', hint: unresolvedErrors === null ? 'Unavailable' : undefined },
        ];

        return dashboardReady(alertsDefinition, { metrics }, {
            empty: !hasPositiveMetric(metrics),
            message: 'There are no open alerts or unresolved error spikes right now.',
            updatedAt: generatedAt,
        });
    })();

    const securityWidget = (() => {
        if (!permissions.securityRead) {
            return dashboardForbidden<{ metrics: DashboardMetric[] }>(
                securityDefinition,
                'Security access is required to view risky activity.'
            );
        }
        if (!securityFeed) {
            return dashboardError<{ metrics: DashboardMetric[] }>(securityDefinition, undefined, { updatedAt: generatedAt });
        }

        const highRiskSessions = securityFeed.data.filter((entry: any) => isHighRiskSecurityLog(entry)).length;
        const blockedRequests = securityFeed.data.filter((entry: any) => {
            const eventType = String(entry?.eventType ?? entry?.event_type ?? '').toLowerCase();
            return eventType.includes('blocked') || eventType.includes('forbidden');
        }).length;
        const failedAuth = securityFeed.data.filter((entry: any) => {
            const eventType = String(entry?.eventType ?? entry?.event_type ?? '').toLowerCase();
            return eventType.includes('fail') || eventType.includes('denied');
        }).length;
        const metrics: DashboardMetric[] = [
            { key: 'high-risk', label: 'High-risk Sessions', value: highRiskSessions, route: withQuery(securityRoute, '?risk=high'), tone: highRiskSessions > 0 ? 'danger' : 'neutral' },
            { key: 'blocked', label: 'Blocked Requests', value: blockedRequests, route: securityRoute, tone: blockedRequests > 0 ? 'warning' : 'neutral' },
            { key: 'failed-auth', label: 'Failed Auth Events', value: failedAuth, route: securityRoute, tone: failedAuth > 0 ? 'warning' : 'neutral' },
            { key: 'events', label: 'Recent Security Events', value: Number(securityFeed.total ?? securityFeed.data.length ?? 0), route: sessionsRoute ?? securityRoute, tone: 'info' },
        ];

        return dashboardReady(securityDefinition, { metrics }, {
            empty: !hasPositiveMetric(metrics),
            message: 'No active session anomalies or blocked events were detected.',
            updatedAt: generatedAt,
        });
    })();

    const auditWidget = (() => {
        if (!permissions.auditRead) {
            return dashboardForbidden<{ items: DashboardListItem[] }>(
                auditDefinition,
                'Audit access is required to view recent administrative activity.'
            );
        }
        if (!auditFeed) {
            return dashboardError<{ items: DashboardListItem[] }>(auditDefinition, undefined, { updatedAt: generatedAt });
        }

        const items = auditFeed.data.slice(0, 6).map((entry: any, index: number) => ({
            id: String(entry.id ?? index),
            title: humanizeDashboardAuditAction(entry.action),
            subtitle: String(entry.actorEmail ?? entry.userId ?? 'System'),
            meta: entry.title ? String(entry.title) : undefined,
            route: entry.announcementId
                ? resolveAnnouncementDrilldownRoute(String(entry.announcementId), permissions)
                : auditRoute,
            timestamp: String(entry.createdAt ?? generatedAt),
        } satisfies DashboardListItem));

        return dashboardReady(auditDefinition, { items }, {
            empty: items.length === 0,
            message: 'Administrative activity will appear here as actions are recorded.',
            updatedAt: generatedAt,
        });
    })();

    const trafficWidget = (() => {
        if (!permissions.analyticsRead) {
            return dashboardForbidden<{
                totalVisits: number;
                series: Array<{ date: string; views: number }>;
                sources: Array<{ source: string; label: string; views: number; percentage: number }>;
            }>(trafficDefinition, 'Analytics access is required to view traffic trends.');
        }
        if (!trafficSeries || !trafficSources) {
            return dashboardError<{
                totalVisits: number;
                series: Array<{ date: string; views: number }>;
                sources: Array<{ source: string; label: string; views: number; percentage: number }>;
            }>(trafficDefinition, undefined, { updatedAt: generatedAt });
        }

        const totalVisits = trafficSeries.reduce((sum: number, item: any) => sum + Number(item.views ?? 0), 0);
        const sourceTotal = trafficSources.reduce((sum: number, item: any) => sum + Number(item.views ?? 0), 0);
        const data = {
            totalVisits,
            series: trafficSeries.map((entry: any) => ({
                date: String(entry.date),
                views: Number(entry.views ?? 0),
            })),
            sources: trafficSources.map((entry: any) => ({
                source: String(entry.source ?? 'unknown'),
                label: String(entry.label ?? entry.source ?? 'Unknown'),
                views: Number(entry.views ?? 0),
                percentage: sourceTotal > 0
                    ? Number(((Number(entry.views ?? 0) / sourceTotal) * 100).toFixed(1))
                    : 0,
            })),
        };

        return dashboardReady(trafficDefinition, data, {
            empty: totalVisits === 0 && data.sources.length === 0,
            message: 'Traffic charts will populate after announcement views are recorded.',
            updatedAt: generatedAt,
        });
    })();

    const topContentWidget = (() => {
        if (!permissions.analyticsRead) {
            return dashboardForbidden<{ items: DashboardListItem[] }>(
                topContentDefinition,
                'Analytics access is required to view top content.'
            );
        }
        if (!topViews) {
            return dashboardError<{ items: DashboardListItem[] }>(topContentDefinition, undefined, { updatedAt: generatedAt });
        }

        const metadataUnavailable = permissions.announcementsRead && !announcements;
        const items = topViews
            .map((entry: any, index: number) => {
                const id = serializeId(entry.announcementId ?? entry.id ?? `view-${index}`);
                const match = announcementsById.get(id);
                return {
                    id,
                    title: match?.title ? String(match.title) : `Announcement ${id}`,
                    subtitle: String(match?.organization ?? match?.type ?? (metadataUnavailable ? 'Metadata unavailable' : 'Traffic event')),
                    meta: `${Number(entry.views ?? 0)} views`,
                    route: resolveAnnouncementDrilldownRoute(id, permissions),
                } satisfies DashboardListItem;
            })
            .filter((item) => item.id);

        const missingMetadataCount = items.filter((item) => item.subtitle === 'Metadata unavailable' || item.subtitle === 'Traffic event').length;

        return dashboardReady(topContentDefinition, { items }, {
            empty: items.length === 0,
            message: missingMetadataCount > 0
                ? 'Some announcement metadata is unavailable, but view counts remain current.'
                : 'Top content will appear after public traffic events are recorded.',
            updatedAt: generatedAt,
        });
    })();

    const quickActions = dashboardReady(quickActionsDefinition, { items: actions }, {
        empty: actions.length === 0,
        message: actions.length === 0 ? 'No quick actions are currently available for this role.' : undefined,
        updatedAt: generatedAt,
    });

    const snapshot = {
        generatedAt,
        displayName,
        role,
        permissions,
        focus,
        sections: DASHBOARD_SECTION_REGISTRY.map((section) => ({
            ...section,
            widgetIds: [...section.widgetIds],
        })),
        widgets: {
            summary,
            'my-queue': myQueue,
            'pending-approvals': pendingApprovals,
            'my-deadlines': myDeadlines,
            'recent-changes': recentChanges,
            alerts: alertsWidget,
            security: securityWidget,
            audit: auditWidget,
            traffic: trafficWidget,
            'top-content': topContentWidget,
            'quick-actions': quickActions,
        },
    };

    writeCachedDashboardSnapshot(cacheKey, snapshot);
    return snapshot;
};

const dispatchPublishNotifications = async (announcements: Announcement[]) => {
    if (!announcements.length) return;

    const publishable = announcements.filter(
        (announcement) => announcement.status === 'published' && announcement.isActive
    );
    if (!publishable.length) return;

    await Promise.allSettled(
        publishable.map((announcement) => dispatchAnnouncementToSubscribers(announcement, { frequency: 'instant' }))
    );
};

const dispatchPublishNotificationsByIds = async (ids: string[]) => {
    if (!ids.length) return;
    const announcements = await AnnouncementModelMongo.findByIds(ids);
    await dispatchPublishNotifications(announcements);
};

const parseDateParam = (value?: string, boundary: 'start' | 'end' = 'start'): Date | undefined => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
        return undefined;
    }

    if (isDateOnly) {
        if (boundary === 'start') {
            parsed.setHours(0, 0, 0, 0);
        } else {
            parsed.setHours(23, 59, 59, 999);
        }
    }

    return parsed;
};

const normalizeStringList = (values: string[]) => {
    const deduped = new Set<string>();
    for (const raw of values) {
        const next = raw.trim();
        if (!next) continue;
        deduped.add(next);
    }
    return Array.from(deduped);
};

const sanitizeOptionalString = (value?: string) => {
    if (typeof value !== 'string') return undefined;
    const next = value.trim();
    return next ? next : undefined;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const DEFAULT_CATEGORY_BY_TYPE: Record<ContentType, string> = {
    job: 'Latest Jobs',
    result: 'Results',
    'admit-card': 'Admit Card',
    syllabus: 'Syllabus',
    'answer-key': 'Answer Key',
    admission: 'Admission',
};

const DEFAULT_ORGANIZATION_BY_TYPE: Record<ContentType, string> = {
    job: 'Government Department',
    result: 'Exam Authority',
    'admit-card': 'Exam Authority',
    syllabus: 'Exam Authority',
    'answer-key': 'Exam Authority',
    admission: 'Education Authority',
};

const canManageSharedViews = (role?: string) => role === 'admin';

type ManagePostsLaneId = 'my-queue' | 'pending-review' | 'scheduled' | 'published' | 'all-posts';

type ManagePostsLaneDefinition = {
    id: ManagePostsLaneId;
    label: string;
    description: string;
    status?: Announcement['status'] | 'all';
    assignee?: 'me' | 'unassigned' | 'assigned';
};

type ManagePostsWorkspaceSnapshot = {
    generatedAt: string;
    capabilities: {
        announcementsRead: boolean;
        announcementsWrite: boolean;
        announcementsApprove: boolean;
        canManageSavedViews: boolean;
        canManageSharedViews: boolean;
    };
    summary: {
        total: number;
        draft: number;
        pending: number;
        scheduled: number;
        published: number;
        archived: number;
        assignedToMe: number;
        unassignedPending: number;
        overdueReview: number;
        stalePending: number;
        accessibleSavedViews: number;
    };
    pendingSla: {
        pendingTotal: number;
        averageDays: number;
        staleCount: number;
    };
    lanes: Array<ManagePostsLaneDefinition & { count: number }>;
};

const MANAGE_POSTS_WORKSPACE_TTL_MS = 30_000;
const managePostsWorkspaceCache = new Map<string, { expiresAt: number; snapshot: ManagePostsWorkspaceSnapshot }>();

const MANAGE_POSTS_LANE_REGISTRY: ManagePostsLaneDefinition[] = [
    {
        id: 'my-queue',
        label: 'My Queue',
        description: 'Assigned draft, pending, and scheduled work tied to your account.',
        assignee: 'me',
    },
    {
        id: 'pending-review',
        label: 'Pending Review',
        description: 'Posts waiting on review or approval.',
        status: 'pending',
    },
    {
        id: 'scheduled',
        label: 'Scheduled',
        description: 'Posts queued for automatic publication.',
        status: 'scheduled',
    },
    {
        id: 'published',
        label: 'Published',
        description: 'Live posts currently visible on the public surface.',
        status: 'published',
    },
    {
        id: 'all-posts',
        label: 'All Posts',
        description: 'All post states in one operational workspace.',
        status: 'all',
    },
];

const cloneManagePostsWorkspaceSnapshot = (snapshot: ManagePostsWorkspaceSnapshot): ManagePostsWorkspaceSnapshot => (
    JSON.parse(JSON.stringify(snapshot)) as ManagePostsWorkspaceSnapshot
);

const readCachedManagePostsWorkspaceSnapshot = (cacheKey: string) => {
    if (config.nodeEnv === 'test') return null;
    const cached = managePostsWorkspaceCache.get(cacheKey);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
        managePostsWorkspaceCache.delete(cacheKey);
        return null;
    }
    return cloneManagePostsWorkspaceSnapshot(cached.snapshot);
};

const writeCachedManagePostsWorkspaceSnapshot = (cacheKey: string, snapshot: ManagePostsWorkspaceSnapshot) => {
    if (config.nodeEnv === 'test') return;
    managePostsWorkspaceCache.set(cacheKey, {
        expiresAt: Date.now() + MANAGE_POSTS_WORKSPACE_TTL_MS,
        snapshot: cloneManagePostsWorkspaceSnapshot(snapshot),
    });
};

const diffComparableKeys = [
    'title',
    'type',
    'category',
    'organization',
    'content',
    'externalLink',
    'location',
    'deadline',
    'status',
    'publishAt',
    'approvedAt',
    'approvedBy',
    'tags',
    'importantDates',
    'typeDetails',
    'seo',
    'home',
    'schema',
] as const;

const calculateChangedKeys = (
    previousSnapshot: Record<string, unknown>,
    nextSnapshot: Record<string, unknown>
) => diffComparableKeys.filter((key) => {
    const prevSerialized = JSON.stringify(previousSnapshot[key] ?? null);
    const nextSerialized = JSON.stringify(nextSnapshot[key] ?? null);
    return prevSerialized !== nextSerialized;
});

const upsertLinkHealthAlert = async (input: {
    brokenUrls: string[];
    checkedCount: number;
    redirectCount: number;
    actorId?: string;
}) => {
    if (input.brokenUrls.length === 0) return;

    const alertsCollection = getCollection<AdminAlertDoc>('admin_alerts');
    const now = new Date();
    const signature = input.brokenUrls
        .slice()
        .sort()
        .slice(0, 10)
        .join('|');
    const recentWindowStart = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    const existing = await alertsCollection.findOne({
        source: 'link',
        status: 'open',
        'metadata.signature': signature,
        updatedAt: { $gte: recentWindowStart } as any,
    } as any);

    const alertMessage = `Link health check detected ${input.brokenUrls.length} broken/error URL(s) out of ${input.checkedCount} checked.`;
    const metadata = {
        signature,
        checkedCount: input.checkedCount,
        brokenCount: input.brokenUrls.length,
        redirectCount: input.redirectCount,
        sampleUrls: input.brokenUrls.slice(0, 8),
    };

    if (existing) {
        await alertsCollection.updateOne(
            { _id: (existing as any)._id },
            {
                $set: {
                    message: alertMessage,
                    severity: input.brokenUrls.length >= 10 ? 'critical' : 'warning',
                    metadata,
                    updatedAt: now,
                    updatedBy: input.actorId,
                },
            }
        );
        return;
    }

    await alertsCollection.insertOne({
        source: 'link',
        severity: input.brokenUrls.length >= 10 ? 'critical' : 'warning',
        message: alertMessage,
        status: 'open',
        metadata,
        createdAt: now,
        updatedAt: now,
        createdBy: input.actorId,
        updatedBy: input.actorId,
    });
};

const toMongoId = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : id);
const serializeId = (value: unknown) => {
    if (value && typeof value === 'object' && typeof (value as any).toHexString === 'function') {
        return (value as any).toHexString();
    }
    return typeof value === 'string' ? value : String(value ?? '');
};

const DEFAULT_HOME_SECTIONS: Omit<HomeSectionDoc, 'updatedAt' | 'updatedBy'>[] = [
    { key: 'latest-jobs', title: 'Latest Jobs', itemType: 'job', sortRule: 'newest', pinnedIds: [], highlightIds: [] },
    { key: 'results', title: 'Results', itemType: 'result', sortRule: 'newest', pinnedIds: [], highlightIds: [] },
    { key: 'admit-card', title: 'Admit Card', itemType: 'admit-card', sortRule: 'newest', pinnedIds: [], highlightIds: [] },
    { key: 'answer-key', title: 'Answer Key', itemType: 'answer-key', sortRule: 'newest', pinnedIds: [], highlightIds: [] },
    { key: 'syllabus', title: 'Syllabus', itemType: 'syllabus', sortRule: 'newest', pinnedIds: [], highlightIds: [] },
    { key: 'important', title: 'Important', itemType: 'important', sortRule: 'sticky', pinnedIds: [], highlightIds: [] },
];

const getEndpointPath = (url: string) => url.split('?')[0];
const getRequestId = (req: any): string =>
    typeof req?.requestId === 'string' && req.requestId
        ? req.requestId
        : (typeof req?.headers?.['x-request-id'] === 'string' ? req.headers['x-request-id'] : 'unknown');

const withAuditContext = (req: any, metadata?: Record<string, unknown>): Record<string, unknown> => ({
    requestId: getRequestId(req),
    endpoint: getEndpointPath(req?.originalUrl || req?.url || ''),
    method: req?.method || 'UNKNOWN',
    ...(metadata ?? {}),
});

const audit = (req: any, entry: {
    action: string;
    announcementId?: string;
    title?: string;
    userId?: string;
    note?: string;
    metadata?: Record<string, unknown>;
}) => recordAdminAudit({
    ...entry,
    metadata: withAuditContext(req, entry.metadata),
});

const toAnnouncementId = (doc: any): string =>
    doc?.id?.toString?.() || doc?._id?.toString?.() || '';

const collectMissingIds = (ids: string[], docs: any[]): string[] => {
    const foundIds = new Set(docs.map((doc) => toAnnouncementId(doc)).filter(Boolean));
    return ids.filter((id) => !foundIds.has(id));
};

const normalizeRollbackTags = (tags: any): string[] | undefined => {
    if (!Array.isArray(tags)) return undefined;
    const normalized = tags
        .map((tag) => {
            if (typeof tag === 'string') return tag.trim();
            if (tag && typeof tag === 'object' && typeof tag.name === 'string') return tag.name.trim();
            return '';
        })
        .filter(Boolean);
    return normalized.length ? normalized : undefined;
};

const normalizeRollbackImportantDates = (importantDates: any) => {
    if (!Array.isArray(importantDates)) return undefined;
    const normalized = importantDates
        .map((entry) => {
            if (!entry || typeof entry !== 'object') return null;
            const eventName = typeof entry.eventName === 'string' ? entry.eventName.trim() : '';
            const eventDate = typeof entry.eventDate === 'string' ? entry.eventDate : undefined;
            if (!eventName || !eventDate) return null;
            return {
                eventName,
                eventDate,
                description: typeof entry.description === 'string' ? entry.description : undefined,
            };
        })
        .filter(Boolean);
    return normalized.length ? normalized : undefined;
};

const normalizeRollbackDateField = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    if (!value.trim()) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return value;
};

const getQaWarningCount = (doc: any): number => {
    let count = 0;
    if (!doc?.title || String(doc.title).trim().length < 10) count += 1;
    if (!doc?.category || String(doc.category).trim().length === 0) count += 1;
    if (!doc?.organization || String(doc.organization).trim().length === 0) count += 1;
    if (doc?.status === 'scheduled' && !doc?.publishAt) count += 1;
    if (typeof doc?.externalLink === 'string' && doc.externalLink.trim()) {
        try {

            new URL(doc.externalLink);
        } catch {
            count += 1;
        }
    }
    if (doc?.deadline) {
        const deadlineTime = new Date(doc.deadline).getTime();
        if (!Number.isNaN(deadlineTime) && deadlineTime < Date.now()) count += 1;
    }
    return count;
};

const getDueSoonCount = (docs: any[], days = 7): number => {
    const threshold = Date.now() + days * 24 * 60 * 60 * 1000;
    return docs.filter((doc) => {
        if (!doc?.deadline) return false;
        const deadlineTime = new Date(doc.deadline).getTime();
        return !Number.isNaN(deadlineTime) && deadlineTime >= Date.now() && deadlineTime <= threshold;
    }).length;
};

const ensureConditionalStepUp = async (req: any, res: any): Promise<boolean> => {
    return new Promise((resolve) => {
        let settled = false;

        const finalize = (value: boolean) => {
            if (settled) return;
            settled = true;
            res.off('finish', onFinish);
            resolve(value);
        };

        const onFinish = () => finalize(false);
        res.once('finish', onFinish);

        try {
            requireAdminStepUp(req, res, () => finalize(true));
        } catch (error) {
            console.error('Step-up verification middleware error:', error);
            finalize(false);
        }
    });
};

const normalizeBreakGlassReason = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    return value.trim();
};

const resolveApprovalInvalidMessage = (reason?: string): string => {
    if (reason === 'invalid_status:pending') {
        return 'Approval request is still pending secondary approval.';
    }
    if (reason === 'invalid_status:expired') {
        return 'Approval request expired. Retry the action to create a new request.';
    }
    if (reason === 'invalid_status:rejected') {
        return 'Approval request was rejected. Retry the action to submit a new request.';
    }
    if (reason === 'invalid_status:executed') {
        return 'Approval request has already been executed.';
    }
    if (reason === 'request_mismatch') {
        return 'Approval no longer matches this action payload. Retry the action.';
    }
    if (reason === 'not_found') {
        return 'Approval request was not found.';
    }
    return 'Approval is missing, expired, or does not match this action.';
};

const requireDualApproval = async (
    req: any,
    res: any,
    input: {
        actionType: AdminApprovalActionType;
        targetIds: string[];
        payload?: Record<string, any>;
        note?: string;
    }
): Promise<ApprovalGateResult> => {
    const policyEvaluation = evaluateAdminApprovalRequirement({
        actionType: input.actionType,
        actorRole: req.user?.role,
        targetIds: input.targetIds,
        payload: input.payload,
    });

    if (!policyEvaluation.required) {
        return { allowed: true };
    }

    const endpoint = getEndpointPath(req.originalUrl || req.url || '');
    const approvalIdHeader = req.get(ADMIN_APPROVAL_ID_HEADER)?.trim() || '';
    const breakGlassReason = normalizeBreakGlassReason(req.get(ADMIN_BREAK_GLASS_REASON_HEADER));
    const payload = input.payload ?? {};

    if (breakGlassReason) {
        if (!config.adminBreakGlassEnabled) {
            res.status(403).json({
                error: 'break_glass_disabled',
                code: 'BREAK_GLASS_DISABLED',
                message: 'Emergency override is disabled by policy.',
            });
            return { allowed: false };
        }
        if (breakGlassReason.length < config.adminBreakGlassMinReasonLength) {
            res.status(403).json({
                error: 'break_glass_reason_invalid',
                code: 'BREAK_GLASS_REASON_INVALID',
                message: `Break-glass reason must be at least ${config.adminBreakGlassMinReasonLength} characters.`,
            });
            return { allowed: false };
        }

        SecurityLogger.log({
            ip_address: req.ip,
            event_type: 'admin_break_glass_used',
            endpoint,
            metadata: {
                actionType: input.actionType,
                actor: req.user?.email,
                actorRole: req.user?.role,
                reason: breakGlassReason,
                risk: policyEvaluation.risk,
            },
        });

        return {
            allowed: true,
            breakGlassUsed: true,
            breakGlassReason,
            breakGlassEndpoint: endpoint,
            breakGlassActionType: input.actionType,
            breakGlassActor: req.user?.email ?? req.user?.userId ?? 'unknown',
        };
    }

    if (!approvalIdHeader) {
        const approval = await createAdminApprovalRequest({
            actionType: input.actionType,
            endpoint,
            method: req.method,
            targetIds: input.targetIds,
            payload,
            note: input.note,
            requestedBy: {
                userId: req.user?.userId ?? 'unknown',
                email: req.user?.email ?? 'unknown',
                role: req.user?.role,
            },
        });
        SecurityLogger.log({
            ip_address: req.ip,
            event_type: 'admin_approval_requested',
            endpoint,
            metadata: {
                approvalId: approval.id,
                actionType: input.actionType,
                requestedBy: req.user?.email,
                risk: policyEvaluation.risk,
            },
        });
        res.status(202).json({
            error: 'approval_required',
            code: 'APPROVAL_REQUIRED',
            requiresApproval: true,
            approvalId: approval.id,
            message: 'Action queued for secondary approval.',
            breakGlass: {
                enabled: config.adminBreakGlassEnabled,
                minReasonLength: config.adminBreakGlassMinReasonLength,
            },
            data: approval,
        });
        return { allowed: false };
    }

    const validation = await validateApprovalForExecution({
        id: approvalIdHeader,
        actionType: input.actionType,
        endpoint,
        method: req.method,
        targetIds: input.targetIds,
        payload,
    });
    if (!validation.ok) {
        const message = resolveApprovalInvalidMessage(validation.reason);
        res.status(409).json({
            error: 'approval_invalid',
            code: 'APPROVAL_INVALID',
            reason: validation.reason,
            message,
        });
        return { allowed: false };
    }

    return { allowed: true, approvalId: approvalIdHeader };
};

const approvalGateAuditMetadata = (gate?: ApprovalGateResult): Record<string, unknown> => {
    if (!gate?.breakGlassUsed) return {};
    return {
        breakGlassUsed: true,
        breakGlassReason: gate.breakGlassReason,
        breakGlassEndpoint: gate.breakGlassEndpoint,
        breakGlassActionType: gate.breakGlassActionType,
        breakGlassActor: gate.breakGlassActor,
    };
};

const finalizeApprovalExecution = async (req: any, approvalId?: string) => {
    if (!approvalId) return;
    await markAdminApprovalExecuted({
        id: approvalId,
        executedBy: {
            userId: req.user?.userId ?? 'unknown',
            email: req.user?.email ?? 'unknown',
        },
    });
    SecurityLogger.log({
        ip_address: req.ip,
        event_type: 'admin_approval_executed',
        endpoint: getEndpointPath(req.originalUrl || req.url || ''),
        metadata: { approvalId, actor: req.user?.email },
    });
};

const buildRollbackPayloadFromSnapshot = (
    snapshot: any,
    note?: string
): Partial<CreateAnnouncementDto> & { isActive?: boolean; note?: string } => {
    const rollbackPayload: Partial<CreateAnnouncementDto> & { isActive?: boolean; note?: string } = {
        title: snapshot.title,
        type: snapshot.type,
        category: snapshot.category,
        organization: snapshot.organization,
        content: snapshot.content,
        externalLink: snapshot.externalLink,
        location: snapshot.location,
        minQualification: snapshot.minQualification,
        ageLimit: snapshot.ageLimit,
        applicationFee: snapshot.applicationFee,
        salaryMin: snapshot.salaryMin,
        salaryMax: snapshot.salaryMax,
        difficulty: snapshot.difficulty,
        cutoffMarks: snapshot.cutoffMarks,
        totalPosts: snapshot.totalPosts,
        status: snapshot.status,
        publishAt: normalizeRollbackDateField(snapshot.publishAt),
        approvedAt: normalizeRollbackDateField(snapshot.approvedAt),
        approvedBy: typeof snapshot.approvedBy === 'string' ? snapshot.approvedBy : undefined,
        tags: normalizeRollbackTags(snapshot.tags),
        importantDates: normalizeRollbackImportantDates(snapshot.importantDates),
        jobDetails: snapshot.jobDetails,
        isActive: typeof snapshot.isActive === 'boolean' ? snapshot.isActive : undefined,
        note: note?.trim() || undefined,
    };

    if (typeof snapshot.deadline === 'string') {
        rollbackPayload.deadline = snapshot.deadline || '';
    }

    return rollbackPayload;
};
// All admin dashboard routes require admin-level read access
router.use(authenticateToken, requirePermission('admin:read'));

/**
 * POST /api/admin/telemetry/events
 * Lightweight admin-side instrumentation sink.
 */
telemetryRouter.post('/telemetry/events', requirePermission('admin:read'), async (req, res) => {
    try {
        const parsed = adminTelemetrySchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        await recordAnalyticsEvent({
            type: parsed.data.type as any,
            userId: req.user?.userId,
            metadata: {
                ...parsed.data.metadata,
                role: req.user?.role,
                source: 'admin_console',
            },
        });

        return res.status(202).json({ message: 'Telemetry recorded' });
    } catch (error) {
        console.error('Admin telemetry error:', error);
        return res.status(500).json({ error: 'Failed to record telemetry event' });
    }
});

/**
 * GET /api/admin/dashboard
 * Permission-aware dashboard snapshot for the vNext admin console.
 */
telemetryRouter.get('/dashboard', async (req, res) => {
    try {
        return res.json({ data: await buildAdminDashboardSnapshot(req) });
    } catch (error) {
        console.error('Dashboard error:', error);
        return res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

/**
 * GET /api/admin/search
 * Global search across posts, links, media, organizations and tags.
 */
contentRouter.get('/search', requirePermission('announcements:read'), async (req, res) => {
    try {
        const parsed = adminSearchQuerySchema.safeParse(req.query ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const searchQuery = parsed.data.q.trim();
        const limit = parsed.data.limit;
        const requestedEntities = parsed.data.entities
            ? normalizeStringList(parsed.data.entities.split(',').map((item) => item.toLowerCase()))
            : ['all'];
        const includeAll = requestedEntities.includes('all');
        const includes = (entity: string) => includeAll || requestedEntities.includes(entity);

        const regex = { $regex: escapeRegex(searchQuery), $options: 'i' };
        const perEntityLimit = Math.max(5, Math.ceil(limit / 2));
        const results: Array<{
            key: string;
            entity: 'post' | 'link' | 'media' | 'organization' | 'tag';
            id: string;
            title: string;
            subtitle?: string;
            route?: string;
        }> = [];

        if (includes('posts')) {
            const posts = await AnnouncementModelMongo.findAllAdmin({
                search: searchQuery,
                limit: perEntityLimit,
                includeInactive: true,
                sort: 'updated',
            });
            for (const post of posts) {
                results.push({
                    key: `post:${post.id}`,
                    entity: 'post',
                    id: post.id,
                    title: post.title,
                    subtitle: `${post.type} · ${post.organization}`,
                    route: `/manage-posts?focus=${encodeURIComponent(post.id)}`,
                });
            }
        }

        if (includes('links')) {
            const links = await getCollection<LinkRecordDoc>('link_records')
                .find({
                    $or: [{ label: regex }, { url: regex }, { notes: regex }],
                } as any)
                .sort({ updatedAt: -1 })
                .limit(perEntityLimit)
                .toArray();
            for (const link of links as any[]) {
                const id = serializeId(link._id);
                results.push({
                    key: `link:${id}`,
                    entity: 'link',
                    id,
                    title: link.label || link.url,
                    subtitle: `${link.status || 'active'} · ${link.url}`,
                    route: `/link-manager?focus=${encodeURIComponent(id)}`,
                });
            }
        }

        if (includes('media')) {
            const media = await getCollection<MediaAssetDoc>('media_assets')
                .find({
                    $or: [{ label: regex }, { fileName: regex }, { fileUrl: regex }],
                } as any)
                .sort({ updatedAt: -1 })
                .limit(perEntityLimit)
                .toArray();
            for (const asset of media as any[]) {
                const id = serializeId(asset._id);
                results.push({
                    key: `media:${id}`,
                    entity: 'media',
                    id,
                    title: asset.label || asset.fileName,
                    subtitle: `${asset.category || 'other'} · ${asset.fileName}`,
                    route: `/media-pdfs?focus=${encodeURIComponent(id)}`,
                });
            }
        }

        const announcementsCollection = getCollection<any>('announcements');

        if (includes('organizations')) {
            const organizations = await announcementsCollection.aggregate([
                { $match: { organization: regex } },
                { $group: { _id: '$organization', count: { $sum: 1 } } },
                { $sort: { count: -1, _id: 1 } },
                { $limit: perEntityLimit },
            ]).toArray();
            for (const item of organizations as any[]) {
                const title = String(item._id || '').trim();
                if (!title) continue;
                results.push({
                    key: `organization:${title.toLowerCase()}`,
                    entity: 'organization',
                    id: title,
                    title,
                    subtitle: `${item.count || 0} post(s)`,
                    route: `/manage-posts?organization=${encodeURIComponent(title)}`,
                });
            }
        }

        if (includes('tags')) {
            const tags = await announcementsCollection.aggregate([
                { $match: { tags: { $exists: true, $ne: [] } } },
                { $unwind: '$tags' },
                { $match: { tags: regex } },
                { $group: { _id: '$tags', count: { $sum: 1 } } },
                { $sort: { count: -1, _id: 1 } },
                { $limit: perEntityLimit },
            ]).toArray();
            for (const tag of tags as any[]) {
                const title = String(tag._id || '').trim();
                if (!title) continue;
                results.push({
                    key: `tag:${title.toLowerCase()}`,
                    entity: 'tag',
                    id: title,
                    title,
                    subtitle: `${tag.count || 0} post(s)`,
                    route: `/manage-posts?tag=${encodeURIComponent(title)}`,
                });
            }
        }

        const deduped = Array.from(new Map(results.map((item) => [item.key, item])).values()).slice(0, limit);
        return res.json({
            data: deduped.map((item) => ({
                entity: item.entity,
                id: item.id,
                title: item.title,
                subtitle: item.subtitle,
                route: item.route,
            })),
            meta: {
                query: searchQuery,
                limit,
                total: deduped.length,
                entities: includeAll ? ['posts', 'links', 'media', 'organizations', 'tags'] : requestedEntities,
            },
        });
    } catch (error) {
        console.error('Admin global search error:', error);
        return res.status(500).json({ error: 'Failed to search admin data' });
    }
});

/**
 * GET /api/admin/views
 * List saved filter views for the current admin.
 */
contentRouter.get('/views', requirePermission('announcements:read'), async (req, res) => {
    try {
        const parsed = adminViewsListQuerySchema.safeParse(req.query ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const actorId = req.user?.userId ?? 'unknown';
        const { module, scope, search, limit, offset } = parsed.data;
        const viewsCollection = getCollection<AdminSavedViewDoc>('admin_saved_views');
        const filter: Record<string, unknown> = {};

        if (module) filter.module = module;
        if (search) filter.name = { $regex: escapeRegex(search), $options: 'i' };

        if (scope === 'private') {
            filter.scope = 'private';
            filter.createdBy = actorId;
        } else if (scope === 'shared') {
            filter.scope = 'shared';
        } else {
            filter.$or = [
                { scope: 'shared' },
                { scope: 'private', createdBy: actorId },
            ];
        }

        const [total, docs] = await Promise.all([
            viewsCollection.countDocuments(filter as any),
            viewsCollection.find(filter as any).sort({ updatedAt: -1 }).skip(offset).limit(limit).toArray(),
        ]);

        return res.json({
            data: docs.map((doc: any) => ({
                id: serializeId(doc._id),
                ...doc,
            })),
            meta: { total, limit, offset },
        });
    } catch (error) {
        console.error('Admin views list error:', error);
        return res.status(500).json({ error: 'Failed to load saved views' });
    }
});

/**
 * POST /api/admin/views
 * Create saved view.
 */
contentRouter.post('/views', requirePermission('announcements:write'), idempotency(), async (req, res) => {
    try {
        const parsed = adminViewCreateSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        if (parsed.data.scope === 'shared' && !canManageSharedViews(req.user?.role)) {
            return res.status(403).json({ error: 'Only admin can create shared views' });
        }

        const actorId = req.user?.userId ?? 'unknown';
        const viewsCollection = getCollection<AdminSavedViewDoc>('admin_saved_views');
        const now = new Date();

        if (parsed.data.isDefault) {
            const defaultFilter: Record<string, unknown> = {
                module: parsed.data.module,
                isDefault: true,
            };
            if (parsed.data.scope === 'private') {
                defaultFilter.scope = 'private';
                defaultFilter.createdBy = actorId;
            } else {
                defaultFilter.scope = 'shared';
            }
            await viewsCollection.updateMany(defaultFilter as any, { $set: { isDefault: false, updatedAt: now, updatedBy: actorId } as any });
        }

        const result = await viewsCollection.insertOne({
            name: parsed.data.name,
            module: parsed.data.module,
            scope: parsed.data.scope,
            filters: parsed.data.filters ?? {},
            columns: normalizeStringList(parsed.data.columns ?? []),
            sort: parsed.data.sort,
            isDefault: parsed.data.isDefault ?? false,
            createdAt: now,
            updatedAt: now,
            createdBy: actorId,
            updatedBy: actorId,
        });

        await audit(req, {
            action: 'admin_view_create',
            userId: actorId,
            metadata: { module: parsed.data.module, scope: parsed.data.scope },
        });

        return res.status(201).json({
            data: {
                id: serializeId(result.insertedId),
                ...parsed.data,
                columns: normalizeStringList(parsed.data.columns ?? []),
                createdAt: now,
                updatedAt: now,
                createdBy: actorId,
                updatedBy: actorId,
            },
        });
    } catch (error) {
        console.error('Admin view create error:', error);
        return res.status(500).json({ error: 'Failed to create saved view' });
    }
});

/**
 * PATCH /api/admin/views/:id
 * Update saved view.
 */
contentRouter.patch('/views/:id', requirePermission('announcements:write'), idempotency(), async (req, res) => {
    try {
        const parsed = adminViewPatchSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const viewId = getPathParam(req.params.id);
        const actorId = req.user?.userId ?? 'unknown';
        const viewsCollection = getCollection<AdminSavedViewDoc>('admin_saved_views');
        const existing = await viewsCollection.findOne({ _id: toMongoId(viewId) as any });
        if (!existing) {
            return res.status(404).json({ error: 'Saved view not found' });
        }

        const existingScope = (existing as any).scope as 'private' | 'shared';
        const existingOwner = (existing as any).createdBy;
        const adminScopeAccess = canManageSharedViews(req.user?.role);
        if (existingScope === 'shared' && !adminScopeAccess) {
            return res.status(403).json({ error: 'Only admin can edit shared views' });
        }
        if (existingScope === 'private' && existingOwner !== actorId && !adminScopeAccess) {
            return res.status(403).json({ error: 'Only owner can edit private views' });
        }

        if (parsed.data.scope === 'shared' && !adminScopeAccess) {
            return res.status(403).json({ error: 'Only admin can promote a view to shared scope' });
        }

        const nextScope = parsed.data.scope ?? existingScope;
        if (parsed.data.isDefault) {
            const resetFilter: Record<string, unknown> = {
                module: parsed.data.module ?? (existing as any).module,
                isDefault: true,
            };
            if (nextScope === 'private') {
                resetFilter.scope = 'private';
                resetFilter.createdBy = (existing as any).createdBy ?? actorId;
            } else {
                resetFilter.scope = 'shared';
            }
            await viewsCollection.updateMany(resetFilter as any, { $set: { isDefault: false, updatedAt: new Date(), updatedBy: actorId } as any });
        }

        const setData: Record<string, unknown> = {
            updatedAt: new Date(),
            updatedBy: actorId,
        };
        if (parsed.data.name !== undefined) setData.name = parsed.data.name;
        if (parsed.data.module !== undefined) setData.module = parsed.data.module;
        if (parsed.data.scope !== undefined) setData.scope = parsed.data.scope;
        if (parsed.data.filters !== undefined) setData.filters = parsed.data.filters;
        if (parsed.data.columns !== undefined) setData.columns = normalizeStringList(parsed.data.columns);
        if (parsed.data.sort !== undefined) setData.sort = parsed.data.sort;
        if (parsed.data.isDefault !== undefined) setData.isDefault = parsed.data.isDefault;

        const updated = await viewsCollection.findOneAndUpdate(
            { _id: toMongoId(viewId) as any },
            { $set: setData },
            { returnDocument: 'after' }
        );

        if (!updated) {
            return res.status(404).json({ error: 'Saved view not found' });
        }

        await audit(req, {
            action: 'admin_view_update',
            userId: actorId,
            metadata: { viewId },
        });

        return res.json({ data: { id: serializeId((updated as any)._id), ...(updated as any) } });
    } catch (error) {
        console.error('Admin view patch error:', error);
        return res.status(500).json({ error: 'Failed to update saved view' });
    }
});

/**
 * DELETE /api/admin/views/:id
 * Delete saved view.
 */
contentRouter.delete('/views/:id', requirePermission('announcements:write'), idempotency(), async (req, res) => {
    try {
        const viewId = getPathParam(req.params.id);
        const actorId = req.user?.userId ?? 'unknown';
        const viewsCollection = getCollection<AdminSavedViewDoc>('admin_saved_views');
        const existing = await viewsCollection.findOne({ _id: toMongoId(viewId) as any });
        if (!existing) {
            return res.status(404).json({ error: 'Saved view not found' });
        }

        const existingScope = (existing as any).scope as 'private' | 'shared';
        const existingOwner = (existing as any).createdBy;
        const adminScopeAccess = canManageSharedViews(req.user?.role);
        if (existingScope === 'shared' && !adminScopeAccess) {
            return res.status(403).json({ error: 'Only admin can delete shared views' });
        }
        if (existingScope === 'private' && existingOwner !== actorId && !adminScopeAccess) {
            return res.status(403).json({ error: 'Only owner can delete private views' });
        }

        await viewsCollection.deleteOne({ _id: toMongoId(viewId) as any });

        await audit(req, {
            action: 'admin_view_delete',
            userId: actorId,
            metadata: { viewId },
        });

        return res.json({ data: { success: true, id: viewId } });
    } catch (error) {
        console.error('Admin view delete error:', error);
        return res.status(500).json({ error: 'Failed to delete saved view' });
    }
});

/**
 * POST /api/admin/announcements/draft
 * Create a draft-first announcement shell.
 */
contentRouter.post('/announcements/draft', requirePermission('announcements:write'), idempotency(), async (req, res) => {
    try {
        const parsed = announcementDraftSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const type = parsed.data.type;
        const now = new Date();
        const shortStamp = now.toISOString().slice(0, 16).replace('T', ' ');
        const title = parsed.data.title?.trim() || `Untitled ${type.toUpperCase()} Draft ${shortStamp}`;

        const draft = await AnnouncementModelMongo.create(
            {
                title,
                type,
                category: parsed.data.category?.trim() || DEFAULT_CATEGORY_BY_TYPE[type],
                organization: parsed.data.organization?.trim() || DEFAULT_ORGANIZATION_BY_TYPE[type],
                content: '',
                status: 'draft',
                tags: [],
                typeDetails: parsed.data.templateId ? { templateId: parsed.data.templateId } : undefined,
            },
            req.user?.userId ?? 'system'
        );

        await audit(req, {
            action: 'announcement_draft_create',
            userId: req.user?.userId,
            announcementId: draft.id,
            title: draft.title,
            metadata: { type: draft.type, templateId: parsed.data.templateId },
        });

        return res.status(201).json({ data: draft });
    } catch (error) {
        console.error('Draft create error:', error);
        return res.status(500).json({ error: 'Failed to create draft announcement' });
    }
});

/**
 * PATCH /api/admin/announcements/:id/autosave
 * Autosave draft edits.
 */
contentRouter.patch('/announcements/:id/autosave', requirePermission('announcements:write'), idempotency(), async (req, res) => {
    try {
        const parsed = announcementAutosaveSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const announcementId = getPathParam(req.params.id);
        const actorId = req.user?.userId ?? 'unknown';
        const payload: Partial<CreateAnnouncementDto> = {};
        const fieldsToCopy: Array<keyof CreateAnnouncementDto> = [
            'title',
            'type',
            'category',
            'organization',
            'content',
            'externalLink',
            'location',
            'deadline',
            'minQualification',
            'ageLimit',
            'applicationFee',
            'salaryMin',
            'salaryMax',
            'difficulty',
            'cutoffMarks',
            'totalPosts',
            'status',
            'publishAt',
            'approvedAt',
            'approvedBy',
            'tags',
            'importantDates',
            'jobDetails',
            'typeDetails',
            'seo',
            'home',
            'schema',
        ];

        const parsedData = parsed.data as Record<string, unknown>;
        for (const key of fieldsToCopy) {
            if (parsedData[key] !== undefined) {
                (payload as any)[key] = parsedData[key];
            }
        }
        (payload as any).note = 'autosave';

        const hasMutationFields = Object.keys(payload).some((key) => key !== 'note');
        const updated = hasMutationFields
            ? await AnnouncementModelMongo.update(announcementId, payload, actorId)
            : await AnnouncementModelMongo.findById(announcementId);

        if (!updated) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        const autosaveCollection = getCollection<any>('admin_autosaves');
        await autosaveCollection.updateOne(
            { announcementId, userId: actorId },
            {
                $set: {
                    announcementId,
                    userId: actorId,
                    editorSessionId: parsed.data.autosave?.editorSessionId,
                    clientUpdatedAt: parsed.data.autosave?.clientUpdatedAt ? new Date(parsed.data.autosave.clientUpdatedAt) : undefined,
                    cursor: parsed.data.autosave?.cursor,
                    title: updated.title,
                    status: updated.status,
                    version: updated.version,
                    updatedAt: new Date(),
                },
            },
            { upsert: true }
        );

        return res.json({
            data: {
                id: updated.id,
                title: updated.title,
                status: updated.status,
                version: updated.version,
                updatedAt: updated.updatedAt,
                autosaved: true,
            },
        });
    } catch (error) {
        console.error('Autosave error:', error);
        return res.status(500).json({ error: 'Failed to autosave announcement' });
    }
});

/**
 * GET /api/admin/announcements/:id/revisions
 * Fetch revision timeline metadata.
 */
contentRouter.get('/announcements/:id/revisions', requirePermission('announcements:read'), async (req, res) => {
    try {
        const parsed = announcementRevisionsQuerySchema.safeParse(req.query ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const announcementId = getPathParam(req.params.id);
        const announcement = await AnnouncementModelMongo.findById(announcementId);
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        const versions = Array.isArray(announcement.versions) ? announcement.versions.slice(0, parsed.data.limit) : [];
        const currentSnapshot = {
            title: announcement.title,
            type: announcement.type,
            category: announcement.category,
            organization: announcement.organization,
            content: announcement.content,
            externalLink: announcement.externalLink,
            location: announcement.location,
            deadline: announcement.deadline,
            status: announcement.status,
            publishAt: announcement.publishAt,
            approvedAt: announcement.approvedAt,
            approvedBy: announcement.approvedBy,
            tags: announcement.tags,
            importantDates: announcement.importantDates,
            typeDetails: announcement.typeDetails,
            seo: announcement.seo,
            home: announcement.home,
            schema: announcement.schema,
        } as Record<string, unknown>;

        const revisions = versions.map((revision, index) => {
            const newerSnapshot = index === 0
                ? currentSnapshot
                : (versions[index - 1]?.snapshot as Record<string, unknown>);
            const revisionSnapshot = (revision.snapshot ?? {}) as Record<string, unknown>;
            const changedKeys = calculateChangedKeys(revisionSnapshot, newerSnapshot || currentSnapshot);

            return {
                version: revision.version,
                updatedAt: revision.updatedAt,
                updatedBy: revision.updatedBy,
                note: revision.note,
                changedKeys,
                snapshot: revision.snapshot,
            };
        });

        return res.json({
            data: {
                announcementId: announcement.id,
                currentVersion: announcement.version,
                currentUpdatedAt: announcement.updatedAt,
                revisions,
            },
        });
    } catch (error) {
        console.error('Announcement revisions error:', error);
        return res.status(500).json({ error: 'Failed to load revision timeline' });
    }
});

/**
 * GET /api/admin/links/health/summary
 * Link health summary for dashboard/reporting widgets.
 */
contentRouter.get('/links/health/summary', requirePermission('announcements:read'), async (req, res) => {
    try {
        const parsed = linkHealthSummaryQuerySchema.safeParse(req.query ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const linksCollection = getCollection<LinkRecordDoc>('link_records');
        const eventsCollection = getCollection<LinkHealthEventDoc>('link_health_events');
        const now = new Date();
        const since = new Date(now.getTime() - parsed.data.days * 24 * 60 * 60 * 1000);

        const [totalLinks, statusBuckets, recentEvents, recentBroken] = await Promise.all([
            linksCollection.countDocuments({}),
            linksCollection.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]).toArray(),
            eventsCollection.aggregate([
                { $match: { checkedAt: { $gte: since } } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        avgResponseTimeMs: { $avg: '$responseTimeMs' },
                    },
                },
            ]).toArray(),
            linksCollection.find({ status: 'broken' } as any).sort({ updatedAt: -1 }).limit(20).toArray(),
        ]);

        const byStatus: Record<string, number> = {
            active: 0,
            expired: 0,
            broken: 0,
        };
        for (const bucket of statusBuckets as any[]) {
            if (bucket?._id && typeof bucket.count === 'number') {
                byStatus[String(bucket._id)] = bucket.count;
            }
        }

        return res.json({
            data: {
                windowDays: parsed.data.days,
                generatedAt: now.toISOString(),
                totalLinks,
                byStatus,
                eventSummary: (recentEvents as any[]).map((item) => ({
                    status: item._id,
                    count: item.count,
                    avgResponseTimeMs: typeof item.avgResponseTimeMs === 'number'
                        ? Math.round(item.avgResponseTimeMs)
                        : null,
                })),
                recentBroken: (recentBroken as any[]).map((item) => ({
                    id: serializeId(item._id),
                    label: item.label,
                    url: item.url,
                    announcementId: item.announcementId,
                    updatedAt: item.updatedAt,
                })),
            },
        });
    } catch (error) {
        console.error('Link health summary error:', error);
        return res.status(500).json({ error: 'Failed to load link health summary' });
    }
});

/**
 * GET /api/admin/homepage/sections
 * Homepage section ordering and ranking configuration.
*/
contentRouter.get('/homepage/sections', requirePermission('announcements:read'), async (_req, res) => {
    try {
        const sectionsCollection = getCollection<HomeSectionDoc>('homepage_sections');
        const docs = await sectionsCollection
            .find({})
            .sort({ key: 1 })
            .toArray();

        if (!docs.length) {
            return res.json({
                data: DEFAULT_HOME_SECTIONS.map((item) => ({
                    ...item,
                    updatedAt: new Date().toISOString(),
                })),
            });
        }

        return res.json({
            data: docs.map((doc: any) => ({
                id: serializeId(doc._id),
                key: doc.key,
                title: doc.title,
                itemType: doc.itemType,
                sortRule: doc.sortRule,
                pinnedIds: Array.isArray(doc.pinnedIds) ? doc.pinnedIds : [],
                highlightIds: Array.isArray(doc.highlightIds) ? doc.highlightIds : [],
                updatedAt: doc.updatedAt,
                updatedBy: doc.updatedBy,
            })),
        });
    } catch (error) {
        console.error('Homepage sections fetch error:', error);
        return res.status(500).json({ error: 'Failed to load homepage sections' });
    }
});

/**
 * PUT /api/admin/homepage/sections
 * Upsert homepage section configs.
 */
contentRouter.put('/homepage/sections', requirePermission('admin:write'), idempotency(), async (req, res) => {
    try {
        const parsed = sectionUpsertSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const sectionsCollection = getCollection<HomeSectionDoc>('homepage_sections');
        const now = new Date();
        const sectionKeys = parsed.data.sections.map((section) => section.key);
        const operations = parsed.data.sections.map((section) => ({
            updateOne: {
                filter: { key: section.key },
                update: {
                    $set: {
                        key: section.key,
                        title: section.title,
                        itemType: section.itemType,
                        sortRule: section.sortRule,
                        pinnedIds: normalizeStringList(section.pinnedIds),
                        highlightIds: normalizeStringList(section.highlightIds),
                        updatedAt: now,
                        updatedBy: req.user?.userId,
                    },
                },
                upsert: true,
            },
        }));

        if (operations.length > 0) {
            await sectionsCollection.bulkWrite(operations, { ordered: false });
        }

        await sectionsCollection.deleteMany({ key: { $nin: sectionKeys } as any });
        audit(req, {
            action: 'homepage_sections_update',
            userId: req.user?.userId,
            metadata: { count: sectionKeys.length },
        }).catch(console.error);

        const updated = await sectionsCollection.find({}).sort({ key: 1 }).toArray();
        return res.json({
            data: updated.map((doc: any) => ({
                id: serializeId(doc._id),
                key: doc.key,
                title: doc.title,
                itemType: doc.itemType,
                sortRule: doc.sortRule,
                pinnedIds: Array.isArray(doc.pinnedIds) ? doc.pinnedIds : [],
                highlightIds: Array.isArray(doc.highlightIds) ? doc.highlightIds : [],
                updatedAt: doc.updatedAt,
                updatedBy: doc.updatedBy,
            })),
        });
    } catch (error) {
        console.error('Homepage sections update error:', error);
        return res.status(500).json({ error: 'Failed to update homepage sections' });
    }
});

/**
 * GET /api/admin/links
 * Link manager listing.
 */
contentRouter.get('/links', requirePermission('announcements:read'), async (req, res) => {
    try {
        const parsed = linkListQuerySchema.safeParse(req.query ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const { limit, offset, type, status, announcementId, search } = parsed.data;
        const linksCollection = getCollection<LinkRecordDoc>('link_records');
        const filter: Record<string, unknown> = {};
        if (type !== 'all') filter.type = type;
        if (status !== 'all') filter.status = status;
        if (announcementId) filter.announcementId = announcementId;
        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            filter.$or = [{ label: searchRegex }, { url: searchRegex }, { notes: searchRegex }];
        }

        const [total, docs] = await Promise.all([
            linksCollection.countDocuments(filter),
            linksCollection.find(filter).sort({ updatedAt: -1 }).skip(offset).limit(limit).toArray(),
        ]);

        return res.json({
            data: docs.map((doc: any) => ({
                id: serializeId(doc._id),
                label: doc.label,
                url: doc.url,
                type: doc.type,
                status: doc.status,
                announcementId: doc.announcementId,
                notes: doc.notes,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
                updatedBy: doc.updatedBy,
            })),
            meta: { total, limit, offset },
        });
    } catch (error) {
        console.error('Links list error:', error);
        return res.status(500).json({ error: 'Failed to load links' });
    }
});

/**
 * POST /api/admin/links
 * Create link record.
 */
contentRouter.post('/links', requirePermission('announcements:write'), idempotency(), async (req, res) => {
    try {
        const parsed = linkRecordCreateSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const linksCollection = getCollection<LinkRecordDoc>('link_records');
        const now = new Date();
        const payload = parsed.data;
        const result = await linksCollection.insertOne({
            label: payload.label,
            url: payload.url,
            type: payload.type,
            status: payload.status,
            announcementId: sanitizeOptionalString(payload.announcementId),
            notes: sanitizeOptionalString(payload.notes),
            createdAt: now,
            updatedAt: now,
            updatedBy: req.user?.userId,
        });

        audit(req, {
            action: 'link_create',
            userId: req.user?.userId,
            metadata: { label: payload.label, type: payload.type },
        }).catch(console.error);

        return res.status(201).json({
            data: {
                id: serializeId(result.insertedId),
                ...payload,
                announcementId: sanitizeOptionalString(payload.announcementId),
                notes: sanitizeOptionalString(payload.notes),
                createdAt: now,
                updatedAt: now,
                updatedBy: req.user?.userId,
            },
        });
    } catch (error) {
        console.error('Create link error:', error);
        return res.status(500).json({ error: 'Failed to create link record' });
    }
});

/**
 * PATCH /api/admin/links/:id
 * Update link record.
 */
contentRouter.patch('/links/:id', requirePermission('announcements:write'), idempotency(), async (req, res) => {
    try {
        const parsed = linkRecordPatchSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const linkId = getPathParam(req.params.id);
        const linksCollection = getCollection<LinkRecordDoc>('link_records');
        const nextSet: Record<string, unknown> = {
            updatedAt: new Date(),
            updatedBy: req.user?.userId,
        };
        if (parsed.data.label !== undefined) nextSet.label = parsed.data.label;
        if (parsed.data.url !== undefined) nextSet.url = parsed.data.url;
        if (parsed.data.type !== undefined) nextSet.type = parsed.data.type;
        if (parsed.data.status !== undefined) nextSet.status = parsed.data.status;
        if (parsed.data.announcementId !== undefined) nextSet.announcementId = sanitizeOptionalString(parsed.data.announcementId);
        if (parsed.data.notes !== undefined) nextSet.notes = sanitizeOptionalString(parsed.data.notes);

        const result = await linksCollection.findOneAndUpdate(
            { _id: toMongoId(linkId) as any },
            { $set: nextSet },
            { returnDocument: 'after' }
        );
        if (!result) {
            return res.status(404).json({ error: 'Link record not found' });
        }

        audit(req, {
            action: 'link_update',
            userId: req.user?.userId,
            metadata: { id: linkId },
        }).catch(console.error);

        return res.json({
            data: {
                id: serializeId((result as any)._id),
                ...(result as any),
            },
        });
    } catch (error) {
        console.error('Update link error:', error);
        return res.status(500).json({ error: 'Failed to update link record' });
    }
});

/**
 * POST /api/admin/links/check
 * Run link health checks.
 */
contentRouter.post('/links/check', requirePermission('announcements:read'), async (req, res) => {
    try {
        const parsed = linkCheckSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const linksCollection = getCollection<LinkRecordDoc>('link_records');
        const healthEventsCollection = getCollection<LinkHealthEventDoc>('link_health_events');
        let targets: Array<{ id?: string; url: string }> = [];

        if (parsed.data.ids && parsed.data.ids.length > 0) {
            const ids = parsed.data.ids.map((id) => toMongoId(id));
            const docs = await linksCollection.find({ _id: { $in: ids as any[] } as any }).toArray();
            targets = docs.map((doc: any) => ({ id: serializeId(doc._id), url: doc.url }));
        } else if (parsed.data.urls && parsed.data.urls.length > 0) {
            targets = parsed.data.urls.map((url) => ({ url }));
        } else {
            const docs = await linksCollection.find({}).sort({ updatedAt: -1 }).limit(100).toArray();
            targets = docs.map((doc: any) => ({ id: serializeId(doc._id), url: doc.url }));
        }

        const timeoutMs = parsed.data.timeoutMs;
        const results = await Promise.all(targets.map(async (target) => {
            const startedAt = Date.now();
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const response = await fetch(target.url, {
                    method: 'HEAD',
                    redirect: 'manual',
                    signal: controller.signal,
                });
                clearTimeout(timeout);
                const responseTimeMs = Date.now() - startedAt;
                const statusCode = response.status;
                const redirectTarget = response.headers.get('location') || undefined;
                const status: LinkHealthEventDoc['status'] = statusCode >= 200 && statusCode < 300
                    ? 'ok'
                    : (statusCode >= 300 && statusCode < 400 ? 'redirect' : 'broken');
                return {
                    id: target.id,
                    url: target.url,
                    status,
                    statusCode,
                    redirectTarget,
                    responseTimeMs,
                };
            } catch {
                clearTimeout(timeout);
                return {
                    id: target.id,
                    url: target.url,
                    status: 'error' as const,
                    responseTimeMs: Date.now() - startedAt,
                };
            }
        }));

        if (results.length > 0) {
            await healthEventsCollection.insertMany(results.map((item) => ({
                url: item.url,
                status: item.status,
                statusCode: item.statusCode,
                redirectTarget: item.redirectTarget,
                responseTimeMs: item.responseTimeMs,
                checkedAt: new Date(),
                checkedBy: req.user?.userId,
            })));
        }

        const brokenByUrl = new Set(results.filter((item) => item.status === 'broken' || item.status === 'error').map((item) => item.url));
        const redirectCount = results.filter((item) => item.status === 'redirect').length;
        if (brokenByUrl.size > 0) {
            await linksCollection.updateMany(
                { url: { $in: Array.from(brokenByUrl) } as any },
                { $set: { status: 'broken', updatedAt: new Date(), updatedBy: req.user?.userId } }
            );
            await upsertLinkHealthAlert({
                brokenUrls: Array.from(brokenByUrl),
                checkedCount: results.length,
                redirectCount,
                actorId: req.user?.userId,
            });
        }

        return res.json({
            data: results,
            meta: {
                checked: results.length,
                broken: results.filter((item) => item.status === 'broken' || item.status === 'error').length,
                redirects: redirectCount,
            },
        });
    } catch (error) {
        console.error('Link check error:', error);
        return res.status(500).json({ error: 'Failed to check links' });
    }
});

/**
 * POST /api/admin/links/replace
 * Replace a URL across link records and content.
 */
contentRouter.post('/links/replace', requirePermission('announcements:write'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const parsed = linkReplaceSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const { fromUrl, toUrl, scope } = parsed.data;

        const linksCollection = getCollection<LinkRecordDoc>('link_records');
        const now = new Date();
        let linksUpdated = 0;
        let announcementsUpdated = 0;

        if (scope === 'all' || scope === 'links') {
            const result = await linksCollection.updateMany(
                { url: fromUrl },
                { $set: { url: toUrl, updatedAt: now, updatedBy: req.user?.userId, status: 'active' } }
            );
            linksUpdated = result.modifiedCount;
        }

        if (scope === 'all' || scope === 'announcements') {
            const docs = await AnnouncementModelMongo.findAllAdmin({ includeInactive: true, limit: 2000 });
            const matched = docs.filter((item: any) => item.externalLink === fromUrl);
            if (matched.length > 0) {
                const updates = matched.map((item) => ({
                    id: item.id,
                    data: {
                        externalLink: toUrl,
                    } as Partial<CreateAnnouncementDto> & { isActive?: boolean },
                }));
                const result = await AnnouncementModelMongo.batchUpdate(updates, req.user?.userId);
                announcementsUpdated = result.updated;
            }
        }

        audit(req, {
            action: 'link_replace',
            userId: req.user?.userId,
            metadata: { fromUrl, toUrl, scope, linksUpdated, announcementsUpdated },
        }).catch(console.error);

        return res.json({
            data: {
                success: true,
                fromUrl,
                toUrl,
                scope,
                linksUpdated,
                announcementsUpdated,
            },
        });
    } catch (error) {
        console.error('Link replace error:', error);
        return res.status(500).json({ error: 'Failed to replace links' });
    }
});

/**
 * GET /api/admin/media
 * Media/PDF listing.
 */
contentRouter.get('/media', requirePermission('announcements:read'), async (req, res) => {
    try {
        const parsed = mediaListQuerySchema.safeParse(req.query ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const { limit, offset, category, status, search } = parsed.data;
        const mediaCollection = getCollection<MediaAssetDoc>('media_assets');
        const filter: Record<string, unknown> = {};
        if (category !== 'all') filter.category = category;
        if (status !== 'all') filter.status = status;
        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            filter.$or = [{ label: searchRegex }, { fileName: searchRegex }, { fileUrl: searchRegex }];
        }
        const [total, docs] = await Promise.all([
            mediaCollection.countDocuments(filter),
            mediaCollection.find(filter).sort({ updatedAt: -1 }).skip(offset).limit(limit).toArray(),
        ]);
        return res.json({
            data: docs.map((doc: any) => ({
                id: serializeId(doc._id),
                ...doc,
            })),
            meta: { total, limit, offset },
        });
    } catch (error) {
        console.error('Media list error:', error);
        return res.status(500).json({ error: 'Failed to load media assets' });
    }
});

/**
 * POST /api/admin/media
 * Add media/PDF metadata entry.
 */
contentRouter.post('/media', requirePermission('announcements:write'), idempotency(), async (req, res) => {
    try {
        const parsed = mediaAssetCreateSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const mediaCollection = getCollection<MediaAssetDoc>('media_assets');
        const now = new Date();
        const payload = parsed.data;
        const cleanFileName = payload.fileName
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9._-]/g, '');
        const result = await mediaCollection.insertOne({
            label: payload.label,
            fileName: cleanFileName,
            fileUrl: payload.fileUrl,
            mimeType: payload.mimeType,
            category: payload.category,
            keepStableUrl: payload.keepStableUrl,
            fileSizeBytes: payload.fileSizeBytes,
            status: 'active',
            createdAt: now,
            updatedAt: now,
            updatedBy: req.user?.userId,
        });
        audit(req, {
            action: 'media_create',
            userId: req.user?.userId,
            metadata: { fileName: cleanFileName, category: payload.category },
        }).catch(console.error);
        return res.status(201).json({
            data: {
                id: serializeId(result.insertedId),
                label: payload.label,
                fileName: cleanFileName,
                fileUrl: payload.fileUrl,
                mimeType: payload.mimeType,
                category: payload.category,
                keepStableUrl: payload.keepStableUrl,
                fileSizeBytes: payload.fileSizeBytes,
                status: 'active',
                createdAt: now,
                updatedAt: now,
                updatedBy: req.user?.userId,
            },
        });
    } catch (error) {
        console.error('Media create error:', error);
        return res.status(500).json({ error: 'Failed to create media asset' });
    }
});

/**
 * PATCH /api/admin/media/:id
 * Update media metadata.
 */
contentRouter.patch('/media/:id', requirePermission('announcements:write'), idempotency(), async (req, res) => {
    try {
        const parsed = mediaAssetPatchSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const mediaId = getPathParam(req.params.id);
        const mediaCollection = getCollection<MediaAssetDoc>('media_assets');
        const updateSet: Record<string, unknown> = {
            updatedAt: new Date(),
            updatedBy: req.user?.userId,
        };
        if (parsed.data.label !== undefined) updateSet.label = parsed.data.label;
        if (parsed.data.fileName !== undefined) updateSet.fileName = parsed.data.fileName;
        if (parsed.data.fileUrl !== undefined) updateSet.fileUrl = parsed.data.fileUrl;
        if (parsed.data.mimeType !== undefined) updateSet.mimeType = parsed.data.mimeType;
        if (parsed.data.category !== undefined) updateSet.category = parsed.data.category;
        if (parsed.data.keepStableUrl !== undefined) updateSet.keepStableUrl = parsed.data.keepStableUrl;
        if (parsed.data.fileSizeBytes !== undefined) updateSet.fileSizeBytes = parsed.data.fileSizeBytes;
        if (parsed.data.status !== undefined) updateSet.status = parsed.data.status;

        const updated = await mediaCollection.findOneAndUpdate(
            { _id: toMongoId(mediaId) as any },
            { $set: updateSet },
            { returnDocument: 'after' }
        );
        if (!updated) {
            return res.status(404).json({ error: 'Media asset not found' });
        }

        audit(req, {
            action: 'media_update',
            userId: req.user?.userId,
            metadata: { id: mediaId },
        }).catch(console.error);

        return res.json({ data: { id: serializeId((updated as any)._id), ...(updated as any) } });
    } catch (error) {
        console.error('Media update error:', error);
        return res.status(500).json({ error: 'Failed to update media asset' });
    }
});

/**
 * GET /api/admin/templates
 * Fetch posting templates.
 */
contentRouter.get('/templates', requirePermission('announcements:read'), async (req, res) => {
    try {
        const parsed = templateListQuerySchema.safeParse(req.query ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const templatesCollection = getCollection<AdminTemplateDoc>('admin_templates');
        const filter: Record<string, unknown> = {};
        if (parsed.data.type !== 'all') filter.type = parsed.data.type;
        if (parsed.data.shared !== 'all') filter.shared = parsed.data.shared === 'true';

        const [total, docs] = await Promise.all([
            templatesCollection.countDocuments(filter),
            templatesCollection
                .find(filter)
                .sort({ updatedAt: -1 })
                .skip(parsed.data.offset)
                .limit(parsed.data.limit)
                .toArray(),
        ]);

        return res.json({
            data: docs.map((doc: any) => ({ id: serializeId(doc._id), ...doc })),
            meta: { total, limit: parsed.data.limit, offset: parsed.data.offset },
        });
    } catch (error) {
        console.error('Template list error:', error);
        return res.status(500).json({ error: 'Failed to load templates' });
    }
});

/**
 * POST /api/admin/templates
 * Create posting template.
 */
contentRouter.post('/templates', requirePermission('announcements:write'), idempotency(), async (req, res) => {
    try {
        const parsed = templateCreateSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const templatesCollection = getCollection<AdminTemplateDoc>('admin_templates');
        const now = new Date();
        const payload = parsed.data;
        const result = await templatesCollection.insertOne({
            type: payload.type,
            name: payload.name,
            description: sanitizeOptionalString(payload.description),
            shared: payload.shared,
            sections: normalizeStringList(payload.sections),
            payload: payload.payload ?? {},
            createdAt: now,
            updatedAt: now,
            createdBy: req.user?.userId,
            updatedBy: req.user?.userId,
        });

        audit(req, {
            action: 'template_create',
            userId: req.user?.userId,
            metadata: { type: payload.type, name: payload.name },
        }).catch(console.error);

        return res.status(201).json({
            data: {
                id: serializeId(result.insertedId),
                type: payload.type,
                name: payload.name,
                description: sanitizeOptionalString(payload.description),
                shared: payload.shared,
                sections: normalizeStringList(payload.sections),
                payload: payload.payload ?? {},
                createdAt: now,
                updatedAt: now,
            },
        });
    } catch (error) {
        console.error('Template create error:', error);
        return res.status(500).json({ error: 'Failed to create template' });
    }
});

/**
 * PATCH /api/admin/templates/:id
 * Update posting template.
 */
contentRouter.patch('/templates/:id', requirePermission('announcements:write'), idempotency(), async (req, res) => {
    try {
        const parsed = templatePatchSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const templateId = getPathParam(req.params.id);
        const templatesCollection = getCollection<AdminTemplateDoc>('admin_templates');
        const setData: Record<string, unknown> = {
            updatedAt: new Date(),
            updatedBy: req.user?.userId,
        };
        if (parsed.data.type !== undefined) setData.type = parsed.data.type;
        if (parsed.data.name !== undefined) setData.name = parsed.data.name;
        if (parsed.data.description !== undefined) setData.description = sanitizeOptionalString(parsed.data.description);
        if (parsed.data.shared !== undefined) setData.shared = parsed.data.shared;
        if (parsed.data.sections !== undefined) setData.sections = normalizeStringList(parsed.data.sections);
        if (parsed.data.payload !== undefined) setData.payload = parsed.data.payload;

        const updated = await templatesCollection.findOneAndUpdate(
            { _id: toMongoId(templateId) as any },
            { $set: setData },
            { returnDocument: 'after' }
        );
        if (!updated) {
            return res.status(404).json({ error: 'Template not found' });
        }

        audit(req, {
            action: 'template_update',
            userId: req.user?.userId,
            metadata: { id: templateId },
        }).catch(console.error);

        return res.json({ data: { id: serializeId((updated as any)._id), ...(updated as any) } });
    } catch (error) {
        console.error('Template update error:', error);
        return res.status(500).json({ error: 'Failed to update template' });
    }
});

/**
 * GET /api/admin/alerts
 * Notifications and alerts feed.
 */
operationsRouter.get('/alerts', requirePermission('admin:read'), async (req, res) => {
    try {
        const parsed = alertListQuerySchema.safeParse(req.query ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const alertsCollection = getCollection<AdminAlertDoc>('admin_alerts');
        const filter: Record<string, unknown> = {};
        if (parsed.data.source !== 'all') filter.source = parsed.data.source;
        if (parsed.data.severity !== 'all') filter.severity = parsed.data.severity;
        if (parsed.data.status !== 'all') filter.status = parsed.data.status;

        const [total, docs] = await Promise.all([
            alertsCollection.countDocuments(filter),
            alertsCollection
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(parsed.data.offset)
                .limit(parsed.data.limit)
                .toArray(),
        ]);

        return res.json({
            data: docs.map((doc: any) => ({ id: serializeId(doc._id), ...doc })),
            meta: { total, limit: parsed.data.limit, offset: parsed.data.offset },
        });
    } catch (error) {
        console.error('Alerts list error:', error);
        return res.status(500).json({ error: 'Failed to load alerts' });
    }
});

/**
 * POST /api/admin/alerts
 * Create manual/admin alert.
 */
operationsRouter.post('/alerts', requirePermission('admin:write'), idempotency(), async (req, res) => {
    try {
        const parsed = alertCreateSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const alertsCollection = getCollection<AdminAlertDoc>('admin_alerts');
        const now = new Date();
        const payload = parsed.data;
        const result = await alertsCollection.insertOne({
            source: payload.source,
            severity: payload.severity,
            message: payload.message,
            status: payload.status,
            metadata: payload.metadata,
            createdAt: now,
            updatedAt: now,
            createdBy: req.user?.userId,
            updatedBy: req.user?.userId,
        });

        audit(req, {
            action: 'alert_create',
            userId: req.user?.userId,
            metadata: { source: payload.source, severity: payload.severity },
        }).catch(console.error);

        return res.status(201).json({
            data: {
                id: serializeId(result.insertedId),
                source: payload.source,
                severity: payload.severity,
                message: payload.message,
                status: payload.status,
                metadata: payload.metadata,
                createdAt: now,
                updatedAt: now,
            },
        });
    } catch (error) {
        console.error('Alert create error:', error);
        return res.status(500).json({ error: 'Failed to create alert' });
    }
});

/**
 * PATCH /api/admin/alerts/:id
 * Update alert state.
 */
operationsRouter.patch('/alerts/:id', requirePermission('admin:write'), idempotency(), async (req, res) => {
    try {
        const parsed = alertPatchSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const alertId = getPathParam(req.params.id);
        const alertsCollection = getCollection<AdminAlertDoc>('admin_alerts');
        const setData: Record<string, unknown> = {
            updatedAt: new Date(),
            updatedBy: req.user?.userId,
        };
        if (parsed.data.source !== undefined) setData.source = parsed.data.source;
        if (parsed.data.severity !== undefined) setData.severity = parsed.data.severity;
        if (parsed.data.message !== undefined) setData.message = parsed.data.message;
        if (parsed.data.status !== undefined) setData.status = parsed.data.status;
        if (parsed.data.metadata !== undefined) setData.metadata = parsed.data.metadata;
        const updated = await alertsCollection.findOneAndUpdate(
            { _id: toMongoId(alertId) as any },
            { $set: setData },
            { returnDocument: 'after' }
        );
        if (!updated) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        audit(req, {
            action: 'alert_update',
            userId: req.user?.userId,
            metadata: { id: alertId },
        }).catch(console.error);
        return res.json({ data: { id: serializeId((updated as any)._id), ...(updated as any) } });
    } catch (error) {
        console.error('Alert update error:', error);
        return res.status(500).json({ error: 'Failed to update alert' });
    }
});

/**
 * GET /api/admin/settings/:key
 * Read configurable taxonomy arrays.
 */
operationsRouter.get('/settings/:key', requirePermission('admin:read'), async (req, res) => {
    try {
        const settingsKey = getPathParam(req.params.key);
        if (!isAdminSettingKey(settingsKey)) {
            return res.status(400).json({ error: 'Invalid settings key' });
        }
        const typedKey = settingsKey as AdminSettingsDoc['key'];
        const settingsCollection = getCollection<AdminSettingsDoc>('admin_settings');
        const existing = await settingsCollection.findOne({ key: typedKey });
        return res.json({
            data: {
                key: typedKey,
                values: ARRAY_SETTINGS_KEYS.has(typedKey) ? (existing?.values ?? []) : undefined,
                payload: ARRAY_SETTINGS_KEYS.has(typedKey) ? undefined : (existing?.payload ?? {}),
                updatedAt: existing?.updatedAt ?? null,
                updatedBy: existing?.updatedBy ?? null,
            },
        });
    } catch (error) {
        console.error('Settings fetch error:', error);
        return res.status(500).json({ error: 'Failed to load settings' });
    }
});

/**
 * PUT /api/admin/settings/:key
 * Update taxonomy arrays.
 */
operationsRouter.put('/settings/:key', requirePermission('admin:write'), idempotency(), async (req, res) => {
    try {
        const settingsKey = getPathParam(req.params.key);
        if (!isAdminSettingKey(settingsKey)) {
            return res.status(400).json({ error: 'Invalid settings key' });
        }
        const typedKey = settingsKey as AdminSettingsDoc['key'];
        const parsed = settingValuesSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const settingsCollection = getCollection<AdminSettingsDoc>('admin_settings');
        const isArraySetting = ARRAY_SETTINGS_KEYS.has(typedKey);
        if (isArraySetting && !parsed.data.values) {
            return res.status(400).json({ error: 'values are required for this settings key' });
        }
        if (!isArraySetting && !parsed.data.payload) {
            return res.status(400).json({ error: 'payload is required for this settings key' });
        }
        const values = isArraySetting ? normalizeStringList(parsed.data.values) : undefined;
        const payload = isArraySetting ? undefined : parsed.data.payload ?? {};
        const now = new Date();
        await settingsCollection.updateOne(
            { key: typedKey },
            {
                $set: {
                    key: typedKey,
                    ...(values !== undefined ? { values } : {}),
                    ...(payload !== undefined ? { payload } : {}),
                    updatedAt: now,
                    updatedBy: req.user?.userId,
                },
                $unset: isArraySetting ? { payload: '' } : { values: '' },
            },
            { upsert: true }
        );
        audit(req, {
            action: `settings_${settingsKey}_update`,
            userId: req.user?.userId,
            metadata: isArraySetting ? { count: values?.length ?? 0 } : { keys: Object.keys(payload ?? {}).length },
        }).catch(console.error);
        return res.json({
            data: {
                key: typedKey,
                values,
                payload,
                updatedAt: now,
                updatedBy: req.user?.userId,
            },
        });
    } catch (error) {
        console.error('Settings update error:', error);
        return res.status(500).json({ error: 'Failed to update settings' });
    }
});

/**
 * GET /api/admin/users
 * Admin user roster with roles.
 */
operationsRouter.get('/users', requirePermission('admin:read'), async (_req, res) => {
    try {
        return res.json({
            data: await listAdminAccessUsers(),
        });
    } catch (error) {
        console.error('Admin users list error:', error);
        return res.status(500).json({ error: 'Failed to load users' });
    }
});

/**
 * PATCH /api/admin/users/:id/role
 * Update admin user role / status.
 */
operationsRouter.patch('/users/:id/role', requirePermission('admin:write'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const userId = getPathParam(req.params.id);
        const parsed = adminRoleUpdateSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const usersCollection = getCollection<AdminUserListDoc>('users');
        const setData: Record<string, unknown> = {
            role: parsed.data.role,
            updatedAt: new Date(),
        };
        if (parsed.data.isActive !== undefined) {
            setData.isActive = parsed.data.isActive;
        }
        const updated = await usersCollection.findOneAndUpdate(
            { _id: toMongoId(userId) as any },
            { $set: setData },
            { returnDocument: 'after' }
        );
        if (!updated) {
            return res.status(404).json({ error: 'User not found' });
        }

        await syncAdminAccessMetadata({
            userId,
            email: (updated as any).email,
            role: (updated as any).role,
            isActive: Boolean((updated as any).isActive),
            twoFactorEnabled: Boolean((updated as any).twoFactorEnabled),
            lastLoginAt: (updated as any).lastLogin ? new Date((updated as any).lastLogin) : null,
        });
        await revokeAdminStepUpGrantsForUser(userId);

        audit(req, {
            action: 'admin_role_update',
            userId: req.user?.userId,
            metadata: { targetUserId: userId, role: parsed.data.role },
        }).catch(console.error);

        return res.json({
            data: (await listAdminAccessUsers()).find((item) => item.id === userId) ?? {
                id: serializeId((updated as any)._id),
                email: (updated as any).email,
                username: (updated as any).username,
                role: (updated as any).role,
                isActive: Boolean((updated as any).isActive),
                updatedAt: (updated as any).updatedAt,
            },
        });
    } catch (error) {
        console.error('Admin role update error:', error);
        return res.status(500).json({ error: 'Failed to update admin role' });
    }
});

operationsRouter.post('/users/invite', requirePermission('admin:write'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const parsed = adminInviteSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const invited = await inviteAdminUser({
            email: parsed.data.email,
            role: parsed.data.role,
            actorEmail: req.user?.email,
        });

        await audit(req, {
            action: 'admin_user_invite',
            userId: req.user?.userId,
            metadata: {
                targetUserId: invited.id,
                email: invited.email,
                role: invited.role,
            },
        });

        return res.status(201).json({
            data: (await listAdminAccessUsers()).find((item) => item.id === invited.id) ?? invited,
        });
    } catch (error) {
        console.error('Admin invite error:', error);
        return res.status(500).json({ error: 'Failed to invite admin user' });
    }
});

operationsRouter.patch('/users/:id/status', requirePermission('admin:write'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const userId = getPathParam(req.params.id);
        const parsed = adminStatusPatchSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const updated = await getCollection<AdminUserListDoc>('users').findOneAndUpdate(
            { _id: toMongoId(userId) as any },
            { $set: { isActive: parsed.data.isActive, updatedAt: new Date() } },
            { returnDocument: 'after' }
        );

        if (!updated) {
            return res.status(404).json({ error: 'User not found' });
        }

        await syncAdminAccessMetadata({
            userId,
            email: (updated as any).email,
            role: (updated as any).role,
            isActive: Boolean((updated as any).isActive),
            twoFactorEnabled: Boolean((updated as any).twoFactorEnabled),
            lastLoginAt: (updated as any).lastLogin ? new Date((updated as any).lastLogin) : null,
        });
        await revokeAdminStepUpGrantsForUser(userId);

        await audit(req, {
            action: parsed.data.isActive ? 'admin_user_reactivated' : 'admin_user_suspended',
            userId: req.user?.userId,
            metadata: { targetUserId: userId, isActive: parsed.data.isActive },
        });

        return res.json({
            data: (await listAdminAccessUsers()).find((item) => item.id === userId),
        });
    } catch (error) {
        console.error('Admin status update error:', error);
        return res.status(500).json({ error: 'Failed to update admin status' });
    }
});

operationsRouter.post('/users/:id/reset-password', requirePermission('admin:write'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const userId = getPathParam(req.params.id);
        const user = await getCollection<AdminUserListDoc>('users').findOne({ _id: toMongoId(userId) as any });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await issueAdminPasswordReset(userId, user.email, req.user?.email);
        await revokeAdminStepUpGrantsForUser(userId);
        await audit(req, {
            action: 'admin_password_reset_issued',
            userId: req.user?.userId,
            metadata: { targetUserId: userId, email: user.email },
        });

        return res.json({
            data: (await listAdminAccessUsers()).find((item) => item.id === userId) ?? { id: userId, email: user.email },
        });
    } catch (error) {
        console.error('Admin reset issue error:', error);
        return res.status(500).json({ error: 'Failed to issue password reset' });
    }
});

operationsRouter.get('/roles', requirePermission('admin:read'), async (_req, res) => {
    try {
        const snapshot = await getAdminPermissionsSnapshot();
        return res.json({
            data: {
                roles: snapshot.roles,
                permissions: ADMIN_PERMISSION_LIST,
                defaults: ADMIN_PORTAL_ROLES,
            },
        });
    } catch (error) {
        console.error('Admin roles error:', error);
        return res.status(500).json({ error: 'Failed to load roles' });
    }
});

operationsRouter.patch('/roles/:role/permissions', requirePermission('admin:write'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const role = getPathParam(req.params.role) as typeof ADMIN_PORTAL_ROLES[number];
        if (!ADMIN_PORTAL_ROLES.includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        const parsed = adminRoleOverrideSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        await upsertAdminRoleOverride(role, parsed.data.permissions, req.user?.email);
        const impactedUsers = await getCollection<AdminUserListDoc>('users')
            .find({ role } as Partial<AdminUserListDoc>)
            .project({ _id: 1 })
            .toArray();
        await Promise.all(
            impactedUsers
                .map((user) => serializeId((user as any)._id))
                .filter(Boolean)
                .map((userId) => revokeAdminStepUpGrantsForUser(userId))
        );
        await audit(req, {
            action: 'admin_role_permissions_update',
            userId: req.user?.userId,
            metadata: { role, permissions: parsed.data.permissions },
        });
        return res.json({ data: await getAdminPermissionsSnapshot() });
    } catch (error) {
        console.error('Admin role override error:', error);
        return res.status(500).json({ error: 'Failed to update role permissions' });
    }
});

/**
 * PATCH /api/admin/announcements/:id/seo
 * Update SEO/schema fields for a content record.
 */
contentRouter.patch('/announcements/:id/seo', requirePermission('announcements:write'), idempotency(), async (req, res) => {
    try {
        const announcementId = getPathParam(req.params.id);
        const parsed = seoPatchSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const payload: Partial<CreateAnnouncementDto> = {
            seo: {
                metaTitle: sanitizeOptionalString(parsed.data.seo.metaTitle),
                metaDescription: sanitizeOptionalString(parsed.data.seo.metaDescription),
                canonical: sanitizeOptionalString(parsed.data.seo.canonical),
                indexPolicy: parsed.data.seo.indexPolicy,
                ogImage: sanitizeOptionalString(parsed.data.seo.ogImage),
            },
            schema: parsed.data.schema,
        } as Partial<CreateAnnouncementDto>;

        const updated = await AnnouncementModelMongo.update(announcementId, payload, req.user?.userId);
        if (!updated) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        audit(req, {
            action: 'announcement_seo_update',
            userId: req.user?.userId,
            announcementId,
            title: updated.title,
        }).catch(console.error);
        return res.json({ data: updated });
    } catch (error) {
        console.error('Announcement SEO update error:', error);
        return res.status(500).json({ error: 'Failed to update SEO fields' });
    }
});

/**
 * GET /api/admin/reports
 * Operational report snapshot for links, deadlines, traffic, and queue.
 */
operationsRouter.get('/reports', requirePermission('analytics:read'), async (req, res) => {
    try {
        const [announcements, linkRecords, trafficRollups, trafficSourcesRaw, topAnnouncementViews, errorReports, securityLogs, criticalAlerts] = await Promise.all([
            AnnouncementModelMongo.findAllAdmin({ includeInactive: true, limit: 2000 }),
            getCollection<LinkRecordDoc>('link_records').find({}).toArray(),
            getDailyRollups(7),
            getAnnouncementViewTrafficSources(7),
            getTopAnnouncementViews(24, 10),
            getCollection<any>('error_reports').find({}).sort({ createdAt: -1 }).limit(250).toArray(),
            getRecentSecurityLogsSafe(250),
            getCollection<AdminAlertDoc>('admin_alerts').find({ status: 'open', severity: 'critical' } as any).sort({ updatedAt: -1 }).limit(20).toArray(),
        ]);
        const now = Date.now();
        const inSevenDays = now + 7 * 24 * 60 * 60 * 1000;
        const expired = announcements.filter((item: any) => item.deadline && new Date(item.deadline).getTime() < now);
        const upcoming = announcements
            .filter((item: any) => {
                if (!item.deadline) return false;
                const ts = new Date(item.deadline).getTime();
                return !Number.isNaN(ts) && ts >= now && ts <= inSevenDays;
            })
            .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
            .slice(0, 25);

        const announcementsById = new Map(
            announcements.map((item: any) => [
                serializeId(item?.id ?? item?._id),
                item,
            ]),
        );
        const topViewed24h = topAnnouncementViews
            .map(({ announcementId, views }) => {
                const item = announcementsById.get(announcementId);
                if (!item) return null;
                return {
                    id: serializeId(item.id ?? item._id),
                    title: item.title,
                    type: item.type,
                    views,
                    organization: item.organization,
                };
            })
            .filter((item) => item !== null);

        const trafficSeries = trafficRollups.map((entry) => ({
            date: entry.date,
            views: entry.views,
        }));
        const trafficSourceTotal = trafficSourcesRaw.reduce((sum, item) => sum + item.views, 0);
        const trafficSources = trafficSourcesRaw.map((item) => ({
            ...item,
            percentage: trafficSourceTotal > 0
                ? Number(((item.views / trafficSourceTotal) * 100).toFixed(1))
                : 0,
        }));
        const brokenLinks = linkRecords.filter((item) => item.status === 'broken');
        const pendingDrafts = announcements.filter((item: any) => (item.status || 'published') === 'draft');
        const scheduled = announcements.filter((item: any) => item.status === 'scheduled');
        const pendingReview = announcements.filter((item: any) => item.status === 'pending');
        const unassignedPendingReview = pendingReview.filter((item: any) => !item.assigneeUserId && !item.assigneeEmail);
        const overdueReview = pendingReview.filter((item: any) => item.reviewDueAt && new Date(item.reviewDueAt).getTime() < now);
        const assignedQueue = announcements.filter((item: any) => {
            const status = normalizeAnnouncementStatus(item.status);
            if (!['pending', 'scheduled', 'draft'].includes(status)) return false;
            return item.assigneeUserId === req.user?.userId || item.assigneeEmail === req.user?.email;
        });
        const unresolvedErrorReports = errorReports.filter((item: any) => item.status !== 'resolved');
        const highRiskSessions = securityLogs.data.filter((log: any) => {
            const eventType = String(log.eventType ?? log.event_type ?? '').toLowerCase();
            return eventType.includes('alert') || eventType.includes('fail') || eventType.includes('forbidden') || eventType.includes('blocked');
        });

        return res.json({
            data: {
                summary: {
                    totalPosts: announcements.length,
                    pendingDrafts: pendingDrafts.length,
                    scheduled: scheduled.length,
                    pendingReview: pendingReview.length,
                    brokenLinks: brokenLinks.length,
                    expired: expired.length,
                },
                mostViewed24h: topViewed24h,
                upcomingDeadlines: upcoming.map((item: any) => ({
                    id: item.id,
                    title: item.title,
                    type: item.type,
                    deadline: item.deadline,
                    organization: item.organization,
                })),
                trafficSeries,
                trafficSources,
                brokenLinkItems: brokenLinks.slice(0, 50).map((item: any) => ({
                    id: serializeId((item as any)._id),
                    label: item.label,
                    url: item.url,
                    updatedAt: item.updatedAt,
                    announcementId: item.announcementId,
                })),
                workflowSummary: {
                    unassignedPendingReview: unassignedPendingReview.length,
                    overdueReviewItems: overdueReview.length,
                    currentUserAssignedQueue: assignedQueue.length,
                },
                incidentSummary: {
                    unresolvedErrorReports: unresolvedErrorReports.length,
                    highRiskSessions: highRiskSessions.length,
                    openCriticalAlerts: criticalAlerts.length,
                },
                drilldowns: [
                    { key: 'unassigned-pending', label: 'Unassigned pending reviews', count: unassignedPendingReview.length, route: '/review?status=pending&assignee=unassigned', tone: unassignedPendingReview.length > 0 ? 'warning' : 'neutral' },
                    { key: 'overdue-review', label: 'Overdue review items', count: overdueReview.length, route: '/review?status=pending&sla=overdue', tone: overdueReview.length > 0 ? 'danger' : 'neutral' },
                    { key: 'my-queue', label: 'Assigned to me', count: assignedQueue.length, route: '/queue?assignee=me', tone: assignedQueue.length > 0 ? 'info' : 'neutral' },
                    { key: 'errors', label: 'Unresolved error reports', count: unresolvedErrorReports.length, route: '/errors?status=new', tone: unresolvedErrorReports.length > 0 ? 'warning' : 'neutral' },
                    { key: 'sessions', label: 'High-risk sessions', count: highRiskSessions.length, route: '/security?risk=high', tone: highRiskSessions.length > 0 ? 'danger' : 'neutral' },
                    { key: 'critical-alerts', label: 'Open critical alerts', count: criticalAlerts.length, route: '/alerts?status=open&severity=critical', tone: criticalAlerts.length > 0 ? 'danger' : 'neutral' },
                ],
            },
        });
    } catch (error) {
        console.error('Reports fetch error:', error);
        return res.status(500).json({ error: 'Failed to load reports' });
    }
});

/**
 * GET /api/admin/active-users
 * Get active user counts in the last N minutes
 */
operationsRouter.get('/active-users', async (req, res) => {
    try {
        const windowMinutes = Math.min(120, parseInt(req.query.windowMinutes as string) || 15);
        const stats = await getActiveUsersStats(windowMinutes);
        return res.json({ data: stats });
    } catch (error) {
        console.error('Active users error:', error);
        return res.status(500).json({ error: 'Failed to load active users' });
    }
});

/**
 * GET /api/admin/stats
 * Get quick stats overview
 */
operationsRouter.get('/stats', async (_req, res) => {
    try {
        const announcements = await AnnouncementModelMongo.findAllAdmin({ limit: 1000, includeInactive: true });
        return res.json({
            data: {
                totalAnnouncements: announcements.length,
                database: 'MongoDB'
            }
        });
    } catch (error) {
        console.error('Stats error:', error);
        return res.status(500).json({ error: 'Failed to load stats' });
    }
});

/**
 * GET /api/admin/slo
 * Get admin SLO snapshot with synthetic dependency status.
 */
operationsRouter.get('/slo', async (_req, res) => {
    try {
        const snapshot = getAdminSloSnapshot();
        const dbConfigured = Boolean(process.env.COSMOS_CONNECTION_STRING || process.env.MONGODB_URI);
        let syntheticStatus: 'ok' | 'degraded' | 'not_configured' = 'not_configured';

        if (dbConfigured) {
            const ok = await healthCheck().catch(() => false);
            syntheticStatus = ok ? 'ok' : 'degraded';
        }

        return res.json({
            data: {
                ...snapshot,
                synthetic: {
                    status: syntheticStatus,
                    dbConfigured,
                },
            },
        });
    } catch (error) {
        console.error('Admin SLO error:', error);
        return res.status(500).json({ error: 'Failed to load admin SLO snapshot' });
    }
});

/**
 * GET /api/admin/security
 * Get security logs
 */
operationsRouter.get('/security', requirePermission('security:read'), async (req, res) => {
    try {
        const parsed = securityLogsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const { limit, offset, eventType, ip, endpoint, start, end } = parsed.data;
        const startDate = parseDateParam(start, 'start');
        const endDate = parseDateParam(end, 'end');

        if (start && !startDate) {
            return res.status(400).json({ error: 'Invalid start date' });
        }
        if (end && !endDate) {
            return res.status(400).json({ error: 'Invalid end date' });
        }

        const logs = await SecurityLogger.getRecentLogsPaged(limit, offset, {
            eventType,
            ipAddress: ip,
            endpoint,
            start: startDate,
            end: endDate,
        });
        return res.json({
            data: logs.data,
            meta: {
                total: logs.total,
                limit,
                offset,
                source: logs.source,
                filters: {
                    eventType: eventType || null,
                    ip: ip || null,
                    endpoint: endpoint || null,
                    start: startDate?.toISOString() ?? null,
                    end: endDate?.toISOString() ?? null,
                },
            },
        });
    } catch (error) {
        console.error('Security logs error:', error);
        return res.status(500).json({ error: 'Failed to load security logs' });
    }
});

/**
 * GET /api/admin/security/logs
 * Get security logs (alias)
 */
operationsRouter.get('/security/logs', requirePermission('security:read'), async (req, res) => {
    try {
        const parsed = securityLogsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const { limit, offset, eventType, ip, endpoint, start, end } = parsed.data;
        const startDate = parseDateParam(start, 'start');
        const endDate = parseDateParam(end, 'end');

        if (start && !startDate) {
            return res.status(400).json({ error: 'Invalid start date' });
        }
        if (end && !endDate) {
            return res.status(400).json({ error: 'Invalid end date' });
        }

        const logs = await SecurityLogger.getRecentLogsPaged(limit, offset, {
            eventType,
            ipAddress: ip,
            endpoint,
            start: startDate,
            end: endDate,
        });
        return res.json({
            data: logs.data,
            meta: {
                total: logs.total,
                limit,
                offset,
                source: logs.source,
                filters: {
                    eventType: eventType || null,
                    ip: ip || null,
                    endpoint: endpoint || null,
                    start: startDate?.toISOString() ?? null,
                    end: endDate?.toISOString() ?? null,
                },
            },
        });
    } catch (error) {
        console.error('Security logs error:', error);
        return res.status(500).json({ error: 'Failed to load security logs' });
    }
});

operationsRouter.patch('/security/logs/:id/status', requirePermission('admin:write'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const id = Number.parseInt(getPathParam(req.params.id), 10);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ error: 'Invalid security log id' });
        }
        const parsed = securityIncidentPatchSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const updated = await SecurityLogger.updateIncident(id, {
            incidentStatus: parsed.data.incidentStatus,
            assigneeEmail: parsed.data.assigneeEmail || null,
            note: parsed.data.note || null,
        });
        if (!updated) {
            return res.status(404).json({ error: 'Security log not found' });
        }

        await audit(req, {
            action: 'security_incident_update',
            userId: req.user?.userId,
            metadata: {
                logId: id,
                incidentStatus: parsed.data.incidentStatus,
                assigneeEmail: parsed.data.assigneeEmail || null,
            },
        });

        return res.json({ data: updated });
    } catch (error) {
        console.error('Security incident update error:', error);
        return res.status(500).json({ error: 'Failed to update security incident' });
    }
});

/**
 * GET /api/admin/sessions
 * List active admin sessions.
 */
operationsRouter.get('/sessions', requirePermission('security:read'), async (req, res) => {
    try {
        const currentSessionId = req.user?.sessionId;
        const sessions = (await listAdminSessions()).map((record) => mapSessionForClient(record, currentSessionId));
        return res.json({
            data: sessions,
            meta: { total: sessions.length },
        });
    } catch (error) {
        console.error('Admin sessions error:', error);
        return res.status(500).json({ error: 'Failed to load sessions' });
    }
});

/**
 * GET /api/admin/session
 * Get current admin session details.
 */
operationsRouter.get('/session', requirePermission('security:read'), async (req, res) => {
    try {
        const session = await getAdminSession(req.user?.sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        return res.json({ data: mapSessionForClient(session, req.user?.sessionId) });
    } catch (error) {
        console.error('Admin session error:', error);
        return res.status(500).json({ error: 'Failed to load session' });
    }
});

/**
 * POST /api/admin/sessions/terminate
 * Terminate a specific session.
 */
operationsRouter.post('/sessions/terminate', requirePermission('security:read'), requireAdminStepUp, async (req, res) => {
    try {
        const parsed = sessionIdSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const { sessionId } = parsed.data;
        if (sessionId === req.user?.sessionId) {
            return res.status(400).json({
                error: 'cannot_terminate_current_session',
                message: 'Current session cannot be terminated from this endpoint.',
            });
        }
        const removed = await terminateAdminSession(sessionId);
        if (!removed) {
            return res.status(404).json({ error: 'Session not found' });
        }
        SecurityLogger.log({
            ip_address: req.ip,
            event_type: 'admin_session_terminated',
            endpoint: '/api/admin/sessions/terminate',
            metadata: { sessionId, admin: req.user?.email }
        });
        return res.json({ success: true });
    } catch (error) {
        console.error('Terminate session error:', error);
        return res.status(500).json({ error: 'Failed to terminate session' });
    }
});

/**
 * POST /api/admin/sessions/terminate-others
 * Terminate all other sessions for the current admin.
 */
operationsRouter.post('/sessions/terminate-others', requirePermission('security:read'), requireAdminStepUp, async (req, res) => {
    try {
        if (!req.user?.userId) {
            return res.status(400).json({ error: 'Missing user context' });
        }
        const removed = await terminateOtherSessions(req.user.userId, req.user.sessionId);
        if (removed > 0) {
            SecurityLogger.log({
                ip_address: req.ip,
                event_type: 'admin_session_terminated',
                endpoint: '/api/admin/sessions/terminate-others',
                metadata: { removed, admin: req.user?.email }
            });
        }
        return res.json({ success: true, removed });
    } catch (error) {
        console.error('Terminate sessions error:', error);
        return res.status(500).json({ error: 'Failed to terminate sessions' });
    }
});

/**
 * GET /api/admin/approvals
 * List approval workflow items.
 */
governanceRouter.get('/approvals', requirePermission('announcements:approve'), async (req, res) => {
    try {
        const parsed = adminApprovalsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const { status, limit, offset } = parsed.data;
        const result = await listAdminApprovalRequests({ status, limit, offset });
        return res.json({
            data: result.data,
            meta: { total: result.total, limit, offset },
        });
    } catch (error) {
        console.error('Admin approvals list error:', error);
        return res.status(500).json({ error: 'Failed to load approvals' });
    }
});

/**
 * GET /api/admin/workflow/overview
 * Combined review queue, approval, and session workflow summary.
 */
governanceRouter.get('/workflow/overview', requirePermission('announcements:read'), async (req, res) => {
    try {
        const parsed = workflowOverviewQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const { staleLimit, dueSoonMinutes } = parsed.data;
        const [reviewQueue, approvals, sessions] = await Promise.all([
            AnnouncementModelMongo.getPendingSlaSummary({
                includeInactive: true,
                staleLimit,
            }),
            getAdminApprovalWorkflowSummary({ dueSoonMinutes }),
            listAdminSessions(),
        ]);

        return res.json({
            data: {
                reviewQueue,
                approvals,
                sessions: {
                    total: sessions.length,
                },
            },
        });
    } catch (error) {
        console.error('Admin workflow overview error:', error);
        return res.status(500).json({ error: 'Failed to load workflow overview' });
    }
});

/**
 * POST /api/admin/approvals/:id/approve
 * Approve a pending high-risk action.
 */
governanceRouter.post('/approvals/:id/approve', requirePermission('announcements:approve'), requireAdminStepUp, async (req, res) => {
    try {
        const approvalId = getPathParam(req.params.id);
        const parsed = adminApprovalResolveSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const approved = await approveAdminApprovalRequest({
            id: approvalId,
            approvedBy: {
                userId: req.user?.userId ?? 'unknown',
                email: req.user?.email ?? 'unknown',
            },
            note: parsed.data.note,
        });
        if (!approved.ok) {
            const failure = mapApprovalResolveFailure(approved.reason);
            return res.status(failure.status).json({
                error: 'approval_failed',
                code: failure.code,
                reason: approved.reason,
            });
        }

        SecurityLogger.log({
            ip_address: req.ip,
            event_type: 'admin_approval_approved',
            endpoint: '/api/admin/approvals/:id/approve',
            metadata: { approvalId, approvedBy: req.user?.email },
        });
        return res.json({ data: approved.approval });
    } catch (error) {
        console.error('Admin approval approve error:', error);
        return res.status(500).json({ error: 'Failed to approve request' });
    }
});

/**
 * POST /api/admin/approvals/:id/reject
 * Reject a pending high-risk action.
 */
governanceRouter.post('/approvals/:id/reject', requirePermission('announcements:approve'), requireAdminStepUp, async (req, res) => {
    try {
        const approvalId = getPathParam(req.params.id);
        const parsed = adminApprovalResolveSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const rejected = await rejectAdminApprovalRequest({
            id: approvalId,
            rejectedBy: {
                userId: req.user?.userId ?? 'unknown',
                email: req.user?.email ?? 'unknown',
            },
            reason: parsed.data.reason || parsed.data.note,
        });
        if (!rejected.ok) {
            const failure = mapApprovalResolveFailure(rejected.reason);
            return res.status(failure.status).json({
                error: 'approval_reject_failed',
                code: failure.code,
                reason: rejected.reason,
            });
        }
        SecurityLogger.log({
            ip_address: req.ip,
            event_type: 'admin_approval_rejected',
            endpoint: '/api/admin/approvals/:id/reject',
            metadata: { approvalId, rejectedBy: req.user?.email },
        });
        return res.json({ data: rejected.approval });
    } catch (error) {
        console.error('Admin approval reject error:', error);
        return res.status(500).json({ error: 'Failed to reject request' });
    }
});

/**
 * GET /api/admin/audit-log
 * Get admin audit log
 */
governanceRouter.get('/audit-log', requirePermission('audit:read'), async (req, res) => {
    try {
        const parseResult = auditQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }

        const { limit, offset, userId, action, start, end } = parseResult.data;
        const startDate = parseDateParam(start, 'start');
        const endDate = parseDateParam(end, 'end');

        if (start && !startDate) {
            return res.status(400).json({ error: 'Invalid start date' });
        }

        if (end && !endDate) {
            return res.status(400).json({ error: 'Invalid end date' });
        }

        const { data, total } = await getAdminAuditLogsPaged({
            limit,
            offset,
            userId: userId || undefined,
            action: action || undefined,
            start: startDate,
            end: endDate,
        });
        return res.json({
            data,
            meta: {
                total,
                limit,
                offset,
            },
        });
    } catch (error) {
        console.error('Audit log error:', error);
        return res.status(500).json({ error: 'Failed to load audit log' });
    }
});

/**
 * GET /api/admin/audit-log/integrity
 * Verify immutable admin audit ledger integrity.
 */
governanceRouter.get('/audit-log/integrity', requirePermission('audit:read'), async (req, res) => {
    try {
        const parsed = auditIntegrityQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const result = await verifyAdminAuditLedger(parsed.data.limit);
        return res.json({ data: result });
    } catch (error) {
        console.error('Audit log integrity error:', error);
        return res.status(500).json({ error: 'Failed to verify audit log integrity' });
    }
});

/**
 * POST /api/admin/audit-log/rebuild
 * Rebuild the immutable audit ledger chain from raw audit logs.
 */
governanceRouter.post('/audit-log/rebuild', requirePermission('admin:write'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const result = await rebuildAdminAuditLedger();

        await audit(req, {
            action: 'audit_ledger_rebuild',
            userId: req.user?.userId,
            metadata: { rebuilt: result.rebuilt, valid: result.integrity.valid },
        });

        return res.json({ data: result });
    } catch (error) {
        console.error('Audit ledger rebuild error:', error);
        return res.status(500).json({ error: 'Failed to rebuild audit ledger' });
    }
});

/**
 * GET /api/admin/manage-posts/workspace
 * Manage Posts v2 snapshot for lanes, summary, and saved view health.
 */
announcementsRouter.get('/manage-posts/workspace', requirePermission('announcements:read'), async (req, res) => {
    try {
        const actorId = req.user?.userId ?? 'unknown';
        const actorEmail = req.user?.email ?? '';
        const actorRole = req.user?.role;
        const cacheKey = JSON.stringify({
            actorId,
            actorEmail,
            actorRole,
        });
        const cached = readCachedManagePostsWorkspaceSnapshot(cacheKey);
        if (cached) {
            return res.json({ data: cached });
        }

        const [announcements, counts, pendingSla, canWrite, canApprove] = await Promise.all([
            AnnouncementModelMongo.findAllAdmin({ includeInactive: true, limit: 2000 }),
            AnnouncementModelMongo.getAdminCounts({ includeInactive: true }),
            AnnouncementModelMongo.getPendingSlaSummary({ includeInactive: true, staleLimit: 10 }),
            hasEffectivePermission(actorRole as any, 'announcements:write'),
            hasEffectivePermission(actorRole as any, 'announcements:approve'),
        ]);

        const pendingReviewItems = announcements.filter((item: any) => normalizeAnnouncementStatus(item.status) === 'pending');
        const nowMs = Date.now();
        const assignedToMe = announcements.filter((item: any) => {
            const normalizedStatus = normalizeAnnouncementStatus(item.status);
            if (!['draft', 'pending', 'scheduled'].includes(normalizedStatus)) return false;
            return (
                (actorId && item.assigneeUserId === actorId)
                || (actorEmail && item.assigneeEmail === actorEmail)
            );
        });
        const unassignedPending = pendingReviewItems.filter((item: any) => !item.assigneeUserId && !item.assigneeEmail);
        const overdueReview = pendingReviewItems.filter((item: any) => item.reviewDueAt && new Date(item.reviewDueAt).getTime() < nowMs);

        const viewsCollection = getCollection<AdminSavedViewDoc>('admin_saved_views');
        const accessibleSavedViews = await viewsCollection.countDocuments({
            module: 'manage-posts',
            $or: [
                { scope: 'shared' },
                { scope: 'private', createdBy: actorId },
            ],
        } as any);

        const lanes = MANAGE_POSTS_LANE_REGISTRY.map((lane) => {
            if (lane.id === 'my-queue') {
                return { ...lane, count: assignedToMe.length };
            }
            if (lane.status === 'pending') {
                return { ...lane, count: counts.byStatus.pending };
            }
            if (lane.status === 'scheduled') {
                return { ...lane, count: counts.byStatus.scheduled };
            }
            if (lane.status === 'published') {
                return { ...lane, count: counts.byStatus.published };
            }
            return { ...lane, count: counts.total };
        });

        const snapshot: ManagePostsWorkspaceSnapshot = {
            generatedAt: new Date().toISOString(),
            capabilities: {
                announcementsRead: true,
                announcementsWrite: canWrite,
                announcementsApprove: canApprove,
                canManageSavedViews: canWrite,
                canManageSharedViews: canManageSharedViews(actorRole),
            },
            summary: {
                total: counts.total,
                draft: counts.byStatus.draft,
                pending: counts.byStatus.pending,
                scheduled: counts.byStatus.scheduled,
                published: counts.byStatus.published,
                archived: counts.byStatus.archived,
                assignedToMe: assignedToMe.length,
                unassignedPending: unassignedPending.length,
                overdueReview: overdueReview.length,
                stalePending: pendingSla.stale.length,
                accessibleSavedViews,
            },
            pendingSla: {
                pendingTotal: pendingSla.pendingTotal,
                averageDays: pendingSla.averageDays,
                staleCount: pendingSla.stale.length,
            },
            lanes,
        };

        writeCachedManagePostsWorkspaceSnapshot(cacheKey, snapshot);
        return res.json({ data: snapshot });
    } catch (error) {
        console.error('Manage posts workspace snapshot error:', error);
        return res.status(500).json({ error: 'Failed to load manage posts workspace' });
    }
});

/**
 * GET /api/admin/announcements
 * Get all announcements for admin management
 */
announcementsRouter.get('/announcements', requirePermission('announcements:read'), async (req, res) => {
    try {
        const parseResult = adminListQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }

        const filters = parseResult.data;
        const dateStart = parseDateParam(filters.dateStart, 'start');
        const dateEnd = parseDateParam(filters.dateEnd, 'end');
        if (filters.dateStart && !dateStart) {
            return res.status(400).json({ error: 'Invalid dateStart filter' });
        }
        if (filters.dateEnd && !dateEnd) {
            return res.status(400).json({ error: 'Invalid dateEnd filter' });
        }
        const assigneeUserId = filters.assignee === 'me' ? req.user?.userId : undefined;
        const assigneeEmail = filters.assignee === 'me' ? req.user?.email : undefined;
        const assigneeMode = filters.assignee === 'me' ? undefined : filters.assignee;

        const [announcements, total] = await Promise.all([
            AnnouncementModelMongo.findAllAdmin({
                limit: filters.limit,
                offset: filters.offset,
                status: filters.status,
                type: filters.type,
                search: filters.search,
                includeInactive: filters.includeInactive,
                sort: filters.sort,
                dateStart,
                dateEnd,
                author: filters.author,
                assigneeMode,
                assigneeUserId,
                assigneeEmail,
            }),
            AnnouncementModelMongo.countAdmin({
                status: filters.status,
                type: filters.type,
                search: filters.search,
                includeInactive: filters.includeInactive,
                dateStart,
                dateEnd,
                author: filters.author,
                assigneeMode,
                assigneeUserId,
                assigneeEmail,
            }),
        ]);

        return res.json({
            data: announcements.map((item: any) => ({
                ...item,
                claimedByCurrentUser: Boolean(
                    (req.user?.userId && item.assigneeUserId === req.user.userId)
                    || (req.user?.email && item.assigneeEmail === req.user.email)
                ),
            })),
            meta: {
                total,
                limit: filters.limit,
                offset: filters.offset,
            },
        });
    } catch (error) {
        console.error('Admin announcements error:', error);
        return res.status(500).json({ error: 'Failed to load announcements' });
    }
});

/**
 * GET /api/admin/announcements/summary
 * Get counts by status/type and pending SLA summary
 */
announcementsRouter.get('/announcements/summary', requirePermission('announcements:read'), async (req, res) => {
    try {
        const parseResult = adminSummaryQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }

        const includeInactive = parseResult.data.includeInactive ?? true;
        const [counts, pendingSla, qaCounts] = await Promise.all([
            AnnouncementModelMongo.getAdminCounts({ includeInactive }),
            AnnouncementModelMongo.getPendingSlaSummary({ includeInactive, staleLimit: 10 }),
            AnnouncementModelMongo.getAdminQaCounts({ includeInactive }),
        ]);

        return res.json({
            data: {
                counts: {
                    ...counts,
                    ...qaCounts,
                },
                pendingSla,
            },
        });
    } catch (error) {
        console.error('Admin summary error:', error);
        return res.status(500).json({ error: 'Failed to load admin summary' });
    }
});

announcementsRouter.patch('/announcements/:id/assignment', requirePermission('announcements:write'), idempotency(), async (req, res) => {
    try {
        const announcementId = getPathParam(req.params.id);
        const parsed = assignmentPatchSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const updated = await AnnouncementModelMongo.update(announcementId, {
            assigneeUserId: parsed.data.assigneeUserId || undefined,
            assigneeEmail: parsed.data.assigneeEmail || undefined,
            assignedAt: parsed.data.assigneeUserId || parsed.data.assigneeEmail ? new Date().toISOString() : '',
        } as Partial<CreateAnnouncementDto>, req.user?.userId);

        if (!updated) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        await audit(req, {
            action: 'announcement_assignment_update',
            announcementId,
            title: updated.title,
            userId: req.user?.userId,
            metadata: {
                assigneeUserId: parsed.data.assigneeUserId || null,
                assigneeEmail: parsed.data.assigneeEmail || null,
            },
        });

        await invalidateAnnouncementCaches().catch((err) => {
            console.error('Failed to invalidate caches after assignment update:', err);
        });

        return res.json({
            data: {
                ...updated,
                claimedByCurrentUser: Boolean(
                    (req.user?.userId && updated.assigneeUserId === req.user.userId)
                    || (req.user?.email && updated.assigneeEmail === req.user.email)
                ),
            },
        });
    } catch (error) {
        console.error('Announcement assignment update error:', error);
        return res.status(500).json({ error: 'Failed to update announcement assignment' });
    }
});

announcementsRouter.patch('/announcements/:id/review-sla', requirePermission('announcements:write'), idempotency(), async (req, res) => {
    try {
        const announcementId = getPathParam(req.params.id);
        const parsed = reviewSlaPatchSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const updated = await AnnouncementModelMongo.update(announcementId, {
            reviewDueAt: parsed.data.reviewDueAt || '',
        } as Partial<CreateAnnouncementDto>, req.user?.userId);

        if (!updated) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        await audit(req, {
            action: 'announcement_review_sla_update',
            announcementId,
            title: updated.title,
            userId: req.user?.userId,
            metadata: {
                reviewDueAt: parsed.data.reviewDueAt || null,
            },
        });

        await invalidateAnnouncementCaches().catch((err) => {
            console.error('Failed to invalidate caches after review SLA update:', err);
        });

        return res.json({ data: updated });
    } catch (error) {
        console.error('Announcement review SLA update error:', error);
        return res.status(500).json({ error: 'Failed to update review SLA' });
    }
});

/**
 * GET /api/admin/announcements/export/csv
 * Export announcements (admin view) as CSV
 */
announcementsRouter.get('/announcements/export/csv', requirePermission('announcements:read'), async (req, res) => {
    try {
        const parseResult = adminExportQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            return res.status(400).json({
                error: 'Validation failed',
                details: parseResult.error.flatten().fieldErrors
            });
        }

        const data = parseResult.data;

        const announcements = await AnnouncementModelMongo.findAllAdmin({
            limit: 2000,
            includeInactive: data.includeInactive ?? true,
            status: data.status && data.status !== 'all' ? data.status : undefined,
            type: data.type,
        });

        const headers = [
            'ID',
            'Title',
            'Type',
            'Category',
            'Organization',
            'Location',
            'Deadline',
            'Status',
            'PublishAt',
            'ApprovedAt',
            'ApprovedBy',
            'Views',
            'Active',
            'UpdatedAt',
            'ExternalLink',
        ];

        const rows = announcements.map(item => [
            item.id,
            `"${(item.title || '').replace(/"/g, '""')}"`,
            item.type,
            `"${(item.category || '').replace(/"/g, '""')}"`,
            `"${(item.organization || '').replace(/"/g, '""')}"`,
            `"${(item.location || '').replace(/"/g, '""')}"`,
            item.deadline || '',
            item.status || '',
            item.publishAt || '',
            item.approvedAt || '',
            item.approvedBy || '',
            item.viewCount ?? 0,
            item.isActive ? 'true' : 'false',
            item.updatedAt || '',
            item.externalLink || ''
        ].join(','));

        const csv = [headers.join(','), ...rows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="admin-announcements-${new Date().toISOString().split('T')[0]}.csv"`);

        return res.send(csv);
    } catch (error) {
        console.error('Admin announcements export error:', error);
        return res.status(500).json({ error: 'Failed to export announcements' });
    }
});

async function validateForPublish(data: any, announcementId?: string, isApproveGate: boolean = false): Promise<string | null> {
    const isStrictType = ['job', 'result', 'admit-card'].includes(data.type);
    const normalizedTypeDetails = data.typeDetails && typeof data.typeDetails === 'object' ? data.typeDetails : {};
    const normalizedJobDetails = data.jobDetails && typeof data.jobDetails === 'object' ? data.jobDetails : normalizedTypeDetails;

    // Ticket 1: Enforce review gates. Jobs, Results, and Admit Cards must require approval.
    if (isStrictType && !isApproveGate && (!data.approvedBy || !data.approvedAt)) {
        return 'MISSING_REVIEW_APPROVAL: Job/Result/Admit Card must go through the formal review and approval process.';
    }

    let attachedLinks: any[] = [];
    if (announcementId) {
        const linksCollection = getCollection<any>('link_records');
        attachedLinks = await linksCollection.find({ announcementId, status: 'active' }).toArray();
    }

    const hasInPayload = (keyword: string) => {
        const contentStr = (data.content || '').toLowerCase();
        if (contentStr.includes(keyword)) return true;

        const links = normalizedJobDetails?.importantLinks || [];
        if (links.some((l: any) => (l.label || '').toLowerCase().includes(keyword) || l.type === keyword)) return true;

        return false;
    };

    const hasInAttached = (keyword: string) => {
        return attachedLinks.some((l: any) => (l.label || '').toLowerCase().includes(keyword) || l.type === keyword);
    };

    if (data.type === 'job') {
        const hasApply = !!data.externalLink || hasInPayload('apply') || hasInAttached('apply');
        if (!hasApply) return 'MISSING_REQUIRED_LINK: Apply Online link is required for Job posts.';

        const hasNotif = hasInPayload('notification') || hasInAttached('notification') || hasInAttached('pdf');
        if (!hasNotif) return 'MISSING_REQUIRED_LINK: Notification PDF link is required for Job posts.';

        const hasDates = (normalizedJobDetails?.importantDates?.length > 0) || (data.importantDates?.length > 0) || (data.content || '').toLowerCase().includes('important dates');
        if (!hasDates) return 'MISSING_REQUIRED_FIELD: Important Dates are required for Job posts.';

        if (!data.deadline) return 'MISSING_REQUIRED_FIELD: Deadline is required for Job posts.';

        const hasEligibility = data.minQualification || normalizedJobDetails?.eligibility?.education || normalizedJobDetails?.eligibility || hasInPayload('eligibility') || hasInPayload('qualification');
        if (!hasEligibility) return 'MISSING_REQUIRED_FIELD: Eligibility / Qualification details are required for Job posts.';
    } else if (data.type === 'result') {
        const hasResultLink = !!data.externalLink || hasInPayload('result') || hasInAttached('result') || hasInAttached('pdf');
        if (!hasResultLink) return 'MISSING_REQUIRED_LINK: Result Download link or PDF is required.';
    } else if (data.type === 'admit-card') {
        const hasAdmitLink = !!data.externalLink || hasInPayload('admit') || hasInAttached('admit') || hasInAttached('pdf');
        if (!hasAdmitLink) return 'MISSING_REQUIRED_LINK: Admit Card Download link is required.';
    }

    // Ticket 3: Block publishing when critical attached links are broken
    if (announcementId) {
        const linksCollection = getCollection<any>('link_records');
        const brokenLinks = await linksCollection.find({ announcementId, status: 'broken' }).toArray();
        if (brokenLinks.length > 0) {
            const brokenLabels = brokenLinks.map((l: any) => l.label || l.url).slice(0, 3).join(', ');
            return `BROKEN_LINK_DETECTED: ${brokenLinks.length} broken link(s) found: ${brokenLabels}. Fix or remove them before publishing.`;
        }
    }

    return null;
}

/**
 * POST /api/admin/announcements
 * Create new announcement
 */
announcementsRouter.post('/announcements', requirePermission('announcements:write'), idempotency(), async (req, res) => {
    try {
        const parseResult = adminAnnouncementSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }

        const role = req.user?.role;
        const status = parseResult.data.status || 'draft';
        const note = typeof (parseResult.data as any).note === 'string'
            ? (parseResult.data as any).note.trim() || undefined
            : undefined;
        if (role === 'contributor' && status !== 'draft') {
            return res.status(403).json({ error: 'Contributors can only save drafts.' });
        }
        if (role === 'editor' && !['draft', 'pending'].includes(status)) {
            return res.status(403).json({ error: 'Editors cannot publish or schedule announcements.' });
        }
        if (['published', 'scheduled'].includes(status) && !(await hasEffectivePermission(role as any, 'announcements:approve'))) {
            return res.status(403).json({ error: 'Insufficient permissions to publish announcements.' });
        }

        if (['published', 'scheduled'].includes(status)) {
            const validationError = await validateForPublish(parseResult.data);
            if (validationError) {
                return res.status(400).json({ error: validationError });
            }
        }

        let approvalId: string | undefined;
        let approvalGate: ApprovalGateResult | undefined;
        if (status === 'published') {
            const hasStepUp = await ensureConditionalStepUp(req, res);
            if (!hasStepUp) return;

            approvalGate = await requireDualApproval(req, res, {
                actionType: 'announcement_publish',
                targetIds: ['new-announcement'],
                payload: parseResult.data as Record<string, any>,
                note,
            });
            if (!approvalGate.allowed) return;
            approvalId = approvalGate.approvalId;
        }

        const userId = req.user?.userId ?? 'system';
        const announcement = await AnnouncementModelMongo.create(parseResult.data as unknown as CreateAnnouncementDto, userId);
        audit(req, {
            action: 'create',
            announcementId: announcement.id,
            title: announcement.title,
            userId,
            note,
            metadata: {
                status: announcement.status,
                ...approvalGateAuditMetadata(approvalGate),
            },
        }).catch(console.error);
        await finalizeApprovalExecution(req, approvalId);
        await dispatchPublishNotifications([announcement]).catch((err) => {
            console.error('Failed to dispatch publish notifications after admin create:', err);
        });
        await invalidateAnnouncementCaches().catch(err => {
            console.error('Failed to invalidate caches after admin create:', err);
        });
        return res.status(201).json({ data: announcement });
    } catch (error) {
        console.error('Create announcement error:', error);
        return res.status(500).json({ error: 'Failed to create announcement' });
    }
});

/**
 * POST /api/admin/announcements/bulk/preview
 * Preview impact for bulk updates without mutating records.
 */
announcementsRouter.post('/announcements/bulk/preview', requirePermission('announcements:write'), async (req, res) => {
    try {
        const parseResult = bulkPreviewSchema.safeParse(req.body ?? {});
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }

        const { ids, data } = parseResult.data as {
            ids: string[];
            data: Partial<CreateAnnouncementDto> & { isActive?: boolean };
        };
        const docs = await AnnouncementModelMongo.findByIdsAdmin(ids);
        const missingIds = collectMissingIds(ids, docs);

        const affectedByStatus = docs.reduce<Record<string, number>>((acc, doc: any) => {
            const status = normalizeAnnouncementStatus(doc?.status);
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        const highTrafficPublished = docs.filter(
            (doc: any) => normalizeAnnouncementStatus(doc?.status) === 'published' && Number(doc?.viewCount || 0) >= 5000
        );
        const qaHeavy = docs.filter((doc: any) => getQaWarningCount(doc) >= 2);

        const warnings: string[] = [];
        if (highTrafficPublished.length > 0) {
            warnings.push(`${highTrafficPublished.length} high-traffic published listing(s) are included.`);
        }
        if (data.status === 'archived' || data.status === 'draft') {
            const publishedCount = affectedByStatus.published || 0;
            if (publishedCount > 0) {
                warnings.push(`${publishedCount} currently published listing(s) will leave the live surface.`);
            }
        }
        if (data.status === 'published' && data.publishAt) {
            warnings.push('Publish status with publishAt provided: publishAt will be normalized to immediate publish.');
        }
        if (qaHeavy.length > 0) {
            warnings.push(`${qaHeavy.length} selected listing(s) have multiple QA warnings.`);
        }
        if (missingIds.length > 0) {
            warnings.push(`${missingIds.length} requested id(s) were not found.`);
        }

        return res.json({
            data: {
                totalTargets: docs.length,
                affectedByStatus,
                warnings,
                missingIds,
            },
        });
    } catch (error) {
        console.error('Bulk preview error:', error);
        return res.status(500).json({ error: 'Failed to preview bulk update' });
    }
});

/**
 * POST /api/admin/review/preview
 * Preview review queue bulk decisions before submission.
 */
announcementsRouter.post('/review/preview', requirePermission('announcements:approve'), async (req, res) => {
    try {
        const parseResult = reviewPreviewSchema.safeParse(req.body ?? {});
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }

        const { ids, action, scheduleAt } = parseResult.data;
        const docs = await AnnouncementModelMongo.findByIdsAdmin(ids);

        const eligibleIds: string[] = [];
        const blockedIds: Array<{ id: string; reason: string }> = [];

        const scheduleDate = scheduleAt ? parseDateParam(scheduleAt, 'start') : undefined;
        if (action === 'schedule' && !scheduleDate) {
            return res.status(400).json({ error: 'scheduleAt is required for schedule action.' });
        }

        for (const doc of docs as any[]) {
            const id = toAnnouncementId(doc);
            const status = normalizeAnnouncementStatus(doc?.status);
            if (!id) continue;

            if (action === 'approve') {
                if (status === 'pending' || status === 'scheduled' || status === 'draft') {
                    eligibleIds.push(id);
                } else {
                    blockedIds.push({ id, reason: `Cannot approve from status "${status}"` });
                }
                continue;
            }

            if (action === 'reject') {
                if (status === 'pending' || status === 'scheduled' || status === 'published') {
                    eligibleIds.push(id);
                } else {
                    blockedIds.push({ id, reason: `Cannot reject from status "${status}"` });
                }
                continue;
            }

            if (action === 'schedule') {
                if (status === 'pending' || status === 'draft') {
                    eligibleIds.push(id);
                } else {
                    blockedIds.push({ id, reason: `Cannot schedule from status "${status}"` });
                }
            }
        }

        const pendingDocs = docs.filter((doc: any) => normalizeAnnouncementStatus(doc?.status) === 'pending');
        const dueSoonCount = getDueSoonCount(docs);
        const warnings: string[] = [];
        if (dueSoonCount > 0) {
            warnings.push(`${dueSoonCount} selected listing(s) have deadlines in the next 7 days.`);
        }
        if (pendingDocs.length > 0 && action !== 'approve') {
            warnings.push(`${pendingDocs.length} pending listing(s) may remain unapproved after this action.`);
        }
        if (blockedIds.length > 0) {
            warnings.push(`${blockedIds.length} selected listing(s) are blocked for this action.`);
        }

        return res.json({
            data: {
                eligibleIds,
                blockedIds,
                warnings,
            },
        });
    } catch (error) {
        console.error('Review preview error:', error);
        return res.status(500).json({ error: 'Failed to preview review action' });
    }
});

/**
 * POST /api/admin/announcements/bulk
 * Bulk update announcements
 */
announcementsRouter.post('/announcements/bulk', requirePermission('announcements:write'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const parseResult = bulkUpdateSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }

        const { ids, data, dryRun } = parseResult.data as unknown as {
            ids: string[];
            dryRun: boolean;
            data: Partial<CreateAnnouncementDto> & { isActive?: boolean };
        };
        const existingDocs = await AnnouncementModelMongo.findByIdsAdmin(ids);
        if (dryRun) {
            return res.json({
                data: {
                    dryRun: true,
                    preview: {
                        totalTargets: existingDocs.length,
                    },
                    missingIds: collectMissingIds(ids, existingDocs),
                },
            });
        }

        let publishTransitionIds: string[] = [];
        if (data.status === 'published' && !(await hasEffectivePermission(req.user?.role as any, 'announcements:approve'))) {
            return res.status(403).json({ error: 'Insufficient permissions to publish announcements.' });
        }
        let approvalId: string | undefined;
        let approvalGate: ApprovalGateResult | undefined;
        if (data.status === 'published') {
            for (const doc of existingDocs) {
                const validationData = { ...doc, ...data };
                const validationError = await validateForPublish(validationData, doc._id?.toString(), false);
                if (validationError) {
                    return res.status(400).json({ error: `Validation failed for "${doc.title}": ${validationError}` });
                }
            }
            publishTransitionIds = existingDocs
                .filter((doc) => !isPublishedStatus(doc.status as any))
                .map((doc) => doc._id?.toString())
                .filter(Boolean);
            approvalGate = await requireDualApproval(req, res, {
                actionType: 'announcement_bulk_publish',
                targetIds: ids,
                payload: data,
                note: typeof (data as any).note === 'string' ? (data as any).note : undefined,
            });
            if (!approvalGate.allowed) return;
            approvalId = approvalGate.approvalId;
        }

        const updates = ids.map(id => ({ id, data }));
        const result = await AnnouncementModelMongo.batchUpdate(updates, req.user?.userId);
        audit(req, {
            action: 'bulk_update',
            userId: req.user?.userId,
            metadata: {
                count: ids.length,
                status: data.status,
                ...approvalGateAuditMetadata(approvalGate),
            },
        }).catch(console.error);

        await finalizeApprovalExecution(req, approvalId);
        await dispatchPublishNotificationsByIds(publishTransitionIds).catch((err) => {
            console.error('Failed to dispatch publish notifications after admin bulk update:', err);
        });
        await invalidateAnnouncementCaches().catch(err => {
            console.error('Failed to invalidate caches after admin bulk update:', err);
        });
        return res.json({ data: result });
    } catch (error) {
        console.error('Bulk update error:', error);
        return res.status(500).json({ error: 'Failed to update announcements' });
    }
});

/**
 * POST /api/admin/announcements/bulk-approve
 * Bulk approve announcements
 */
announcementsRouter.post('/announcements/bulk-approve', requirePermission('announcements:approve'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const parseResult = bulkReviewSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }

        const { ids, note, dryRun } = parseResult.data;
        if (dryRun) {
            return res.json({
                data: {
                    dryRun: true,
                },
            });
        }
        const existingDocs = await AnnouncementModelMongo.findByIdsAdmin(ids);

        for (const doc of existingDocs) {
            const validationError = await validateForPublish(doc, doc._id?.toString(), true);
            if (validationError) {
                return res.status(400).json({ error: `Validation failed for "${doc.title}": ${validationError}` });
            }
        }

        const publishTransitionIds = existingDocs
            .filter((doc) => !isPublishedStatus(doc.status as any))
            .map((doc) => doc._id?.toString())
            .filter(Boolean);
        const approvalGate = await requireDualApproval(req, res, {
            actionType: 'announcement_bulk_publish',
            targetIds: ids,
            payload: { note: note?.trim() || undefined },
            note,
        });
        if (!approvalGate.allowed) return;

        const now = new Date().toISOString();
        const data = {
            status: 'published' as const,
            publishAt: now,
            approvedAt: now,
            approvedBy: req.user?.userId,
            note: note?.trim() || undefined,
        };

        const updates = ids.map(id => ({ id, data }));
        const result = await AnnouncementModelMongo.batchUpdate(updates, req.user?.userId);
        audit(req, {
            action: 'bulk_approve',
            userId: req.user?.userId,
            note: note?.trim() || undefined,
            metadata: {
                count: ids.length,
                ...approvalGateAuditMetadata(approvalGate),
            },
        }).catch(console.error);

        await finalizeApprovalExecution(req, approvalGate.approvalId);
        await dispatchPublishNotificationsByIds(publishTransitionIds).catch((err) => {
            console.error('Failed to dispatch publish notifications after admin bulk approve:', err);
        });
        await invalidateAnnouncementCaches().catch(err => {
            console.error('Failed to invalidate caches after admin bulk approve:', err);
        });
        return res.json({ data: result });
    } catch (error) {
        console.error('Bulk approve error:', error);
        return res.status(500).json({ error: 'Failed to bulk approve announcements' });
    }
});

/**
 * POST /api/admin/announcements/bulk-reject
 * Bulk reject announcements
 */
announcementsRouter.post('/announcements/bulk-reject', requirePermission('announcements:approve'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const parseResult = bulkReviewSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }

        const { ids, note, dryRun } = parseResult.data;
        if (dryRun) {
            return res.json({
                data: {
                    dryRun: true,
                },
            });
        }
        const data = {
            status: 'draft' as const,
            approvedAt: '',
            approvedBy: '',
            note: note?.trim() || undefined,
        };

        const updates = ids.map(id => ({ id, data }));
        const result = await AnnouncementModelMongo.batchUpdate(updates, req.user?.userId);
        audit(req, {
            action: 'bulk_reject',
            userId: req.user?.userId,
            note: note?.trim() || undefined,
            metadata: { count: ids.length },
        }).catch(console.error);

        await invalidateAnnouncementCaches().catch(err => {
            console.error('Failed to invalidate caches after admin bulk reject:', err);
        });
        return res.json({ data: result });
    } catch (error) {
        console.error('Bulk reject error:', error);
        return res.status(500).json({ error: 'Failed to bulk reject announcements' });
    }
});

/**
 * PUT /api/admin/announcements/:id
 * Update announcement
 */
announcementsRouter.put('/announcements/:id', requirePermission('announcements:write'), idempotency(), async (req, res) => {
    try {
        const announcementId = getPathParam(req.params.id);
        const updateSchema = adminAnnouncementPartialSchema;
        const parseResult = updateSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }

        const note = typeof (parseResult.data as any).note === 'string'
            ? (parseResult.data as any).note.trim() || undefined
            : undefined;
        const existing = await AnnouncementModelMongo.findById(announcementId);
        if (!existing) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        const role = req.user?.role;
        const newStatus = parseResult.data.status;
        const targetStatus = newStatus || existing.status;
        const isPublishTransition = targetStatus === 'published' && existing.status !== 'published';
        let approvalId: string | undefined;
        let approvalGate: ApprovalGateResult | undefined;

        if (role === 'contributor' && targetStatus !== 'draft') {
            return res.status(403).json({ error: 'Contributors can only work with drafts.' });
        }
        if (role === 'editor' && !['draft', 'pending'].includes(targetStatus)) {
            return res.status(403).json({ error: 'Editors cannot save or edit published announcements. Must be draft or pending.' });
        }
        if (newStatus && ['published', 'scheduled'].includes(newStatus) && !(await hasEffectivePermission(role as any, 'announcements:approve'))) {
            return res.status(403).json({
                error: 'insufficient_permissions',
                code: 'INSUFFICIENT_PERMISSIONS',
                message: 'Insufficient permissions to publish announcements.',
            });
        }

        if (isPublishTransition) {
            const hasStepUp = await ensureConditionalStepUp(req, res);
            if (!hasStepUp) return;

            approvalGate = await requireDualApproval(req, res, {
                actionType: 'announcement_publish',
                targetIds: [announcementId],
                payload: parseResult.data as Record<string, any>,
                note,
            });
            if (!approvalGate.allowed) return;
            approvalId = approvalGate.approvalId;
        }

        if (['published', 'scheduled'].includes(targetStatus)) {
            // merge data before testing (as partial updates might not contain the full data payload)
            const validationData = { ...existing, ...parseResult.data };
            const validationError = await validateForPublish(validationData, announcementId, isPublishTransition);
            if (validationError) {
                return res.status(400).json({ error: validationError });
            }
        }

        const updatePayload = {
            ...(parseResult.data as unknown as Partial<CreateAnnouncementDto> & { note?: string }),
        };
        if (isPublishTransition) {
            const now = new Date().toISOString();
            updatePayload.status = 'published';
            if (!updatePayload.publishAt || !String(updatePayload.publishAt).trim()) {
                updatePayload.publishAt = now;
            }
            updatePayload.approvedAt = now;
            updatePayload.approvedBy = req.user?.userId;
        }

        const announcement = await AnnouncementModelMongo.update(
            announcementId,
            updatePayload,
            req.user?.userId
        );
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        // Ticket 2: Determine the precise audit action based on status transition
        let auditAction = 'update';
        if (newStatus === 'pending' && existing.status !== 'pending') {
            auditAction = 'submit_review';
        } else if (existing.status === 'published' && newStatus && newStatus !== 'published') {
            auditAction = 'unpublish';
        } else if (newStatus === 'published' && existing.status !== 'published') {
            auditAction = 'publish';
        }

        audit(req, {
            action: auditAction,
            announcementId: announcement.id,
            title: announcement.title,
            userId: req.user?.userId,
            note,
            metadata: {
                fields: Object.keys(parseResult.data),
                previousStatus: existing.status,
                newStatus: targetStatus,
                ...approvalGateAuditMetadata(approvalGate),
            },
        }).catch(console.error);
        if (existing.status !== 'published' && announcement.status === 'published' && announcement.isActive) {
            await dispatchPublishNotifications([announcement]).catch((err) => {
                console.error('Failed to dispatch publish notifications after admin update:', err);
            });
        }
        await finalizeApprovalExecution(req, approvalId);
        await invalidateAnnouncementCaches().catch(err => {
            console.error('Failed to invalidate caches after admin update:', err);
        });
        return res.json({ data: announcement });
    } catch (error) {
        console.error('Update announcement error:', error);
        return res.status(500).json({ error: 'Failed to update announcement' });
    }
});

/**
 * POST /api/admin/announcements/:id/revert/:version
 * Revert announcement to a previous version
 */
announcementsRouter.post('/announcements/:id/revert/:version', requirePermission('announcements:write'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const announcementId = getPathParam(req.params.id);
        const version = parseInt(getPathParam(req.params.version), 10);
        const note = typeof req.body?.note === 'string'
            ? req.body.note.trim() || `Reverted to version ${version}`
            : `Reverted to version ${version}`;

        if (!(await hasEffectivePermission(req.user?.role as any, 'announcements:approve'))) {
            return res.status(403).json({
                error: 'insufficient_permissions',
                code: 'INSUFFICIENT_PERMISSIONS',
                message: 'Approval permissions are required to revert announcement versions.',
            });
        }

        const existing = await AnnouncementModelMongo.findById(announcementId);
        if (!existing) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        const targetVersion = (existing as any).versions?.find((v: any) => v.version === version);
        if (!targetVersion) {
            return res.status(404).json({ error: 'Version not found' });
        }

        const snapshot = targetVersion.snapshot as any;
        const rollbackPayload = buildRollbackPayloadFromSnapshot(snapshot, note);
        const rollbackStatus = normalizeAnnouncementStatus(snapshot?.status);
        let approvalId: string | undefined;
        let approvalGate: ApprovalGateResult | undefined;

        if (rollbackStatus === 'published') {
            const validationData = { ...existing, ...rollbackPayload, status: 'published' };
            const validationError = await validateForPublish(validationData, announcementId, true);
            if (validationError) {
                return res.status(400).json({ error: validationError });
            }

            approvalGate = await requireDualApproval(req, res, {
                actionType: 'announcement_publish',
                targetIds: [announcementId],
                payload: { version, note: rollbackPayload.note },
                note: rollbackPayload.note,
            });
            if (!approvalGate.allowed) return;
            approvalId = approvalGate.approvalId;

            const now = new Date().toISOString();
            rollbackPayload.status = 'published';
            if (!rollbackPayload.publishAt || !String(rollbackPayload.publishAt).trim()) {
                rollbackPayload.publishAt = now;
            }
            rollbackPayload.approvedAt = now;
            rollbackPayload.approvedBy = req.user?.userId;
        }

        const announcement = await AnnouncementModelMongo.update(
            announcementId,
            rollbackPayload,
            req.user?.userId
        );

        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        audit(req, {
            action: 'revert' as any,
            announcementId: announcement.id,
            title: announcement.title,
            userId: req.user?.userId,
            note: rollbackPayload.note,
            metadata: {
                revertedToVersion: version,
                targetStatus: rollbackStatus,
                ...approvalGateAuditMetadata(approvalGate),
            },
        }).catch(console.error);

        await finalizeApprovalExecution(req, approvalId);
        await invalidateAnnouncementCaches().catch(err => {
            console.error('Failed to invalidate caches after admin revert:', err);
        });
        return res.json({ data: announcement });
    } catch (error) {
        console.error('Revert announcement error:', error);
        return res.status(500).json({ error: 'Failed to revert announcement' });
    }
});

/**
 * POST /api/admin/announcements/:id/approve
 * Approve and publish an announcement
 */
announcementsRouter.post('/announcements/:id/approve', requirePermission('announcements:approve'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const announcementId = getPathParam(req.params.id);
        const note = typeof req.body?.note === 'string' ? req.body.note.trim() || undefined : undefined;
        const existing = await AnnouncementModelMongo.findById(announcementId);
        if (!existing) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        const approvalGate = await requireDualApproval(req, res, {
            actionType: 'announcement_publish',
            targetIds: [announcementId],
            payload: { note },
            note,
        });
        if (!approvalGate.allowed) return;

        const now = new Date().toISOString();

        const validationError = await validateForPublish(existing, announcementId, true);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const announcement = await AnnouncementModelMongo.update(
            announcementId,
            {
                status: 'published',
                publishAt: now,
                approvedAt: now,
                approvedBy: req.user?.userId,
                note,
            } as Partial<CreateAnnouncementDto>,
            req.user?.userId
        );
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        audit(req, {
            action: 'approve',
            announcementId: announcement.id,
            title: announcement.title,
            userId: req.user?.userId,
            note,
            metadata: {
                ...approvalGateAuditMetadata(approvalGate),
            },
        }).catch(console.error);
        if (existing.status !== 'published' && announcement.status === 'published' && announcement.isActive) {
            await dispatchPublishNotifications([announcement]).catch((err) => {
                console.error('Failed to dispatch publish notifications after admin approve:', err);
            });
        }
        await finalizeApprovalExecution(req, approvalGate.approvalId);
        await invalidateAnnouncementCaches().catch(err => {
            console.error('Failed to invalidate caches after admin approve:', err);
        });
        return res.json({ data: announcement });
    } catch (error) {
        console.error('Approve announcement error:', error);
        return res.status(500).json({ error: 'Failed to approve announcement' });
    }
});

/**
 * POST /api/admin/announcements/:id/reject
 * Reject an announcement back to draft
 */
announcementsRouter.post('/announcements/:id/reject', requirePermission('announcements:approve'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const announcementId = getPathParam(req.params.id);
        const note = typeof req.body?.note === 'string' ? req.body.note.trim() || undefined : undefined;
        const announcement = await AnnouncementModelMongo.update(
            announcementId,
            {
                status: 'draft',
                approvedAt: '',
                approvedBy: '',
                note,
            } as Partial<CreateAnnouncementDto>,
            req.user?.userId
        );
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        audit(req, {
            action: 'reject',
            announcementId: announcement.id,
            title: announcement.title,
            userId: req.user?.userId,
            note,
        }).catch(console.error);
        await invalidateAnnouncementCaches().catch(err => {
            console.error('Failed to invalidate caches after admin reject:', err);
        });
        return res.json({ data: announcement });
    } catch (error) {
        console.error('Reject announcement error:', error);
        return res.status(500).json({ error: 'Failed to reject announcement' });
    }
});

/**
 * POST /api/admin/announcements/:id/rollback
 * Rollback to a specific historical version snapshot.
 */
announcementsRouter.post('/announcements/:id/rollback', requirePermission('announcements:write'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const announcementId = getPathParam(req.params.id);
        const parsed = rollbackSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const announcement = await AnnouncementModelMongo.findById(announcementId);
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        const targetVersion = announcement.versions?.find((entry) => entry.version === parsed.data.version);
        if (!targetVersion?.snapshot) {
            return res.status(404).json({ error: 'Version snapshot not found' });
        }

        if (parsed.data.dryRun) {
            return res.json({
                data: {
                    dryRun: true,
                    targetVersion: parsed.data.version,
                },
            });
        }

        const snapshot = targetVersion.snapshot as any;
        const rollbackPayload = buildRollbackPayloadFromSnapshot(snapshot, parsed.data.note);
        const rollbackStatus = normalizeAnnouncementStatus(snapshot?.status);
        let approvalId: string | undefined;
        let approvalGate: ApprovalGateResult | undefined;

        if (rollbackStatus === 'published') {
            if (!(await hasEffectivePermission(req.user?.role as any, 'announcements:approve'))) {
                return res.status(403).json({
                    error: 'insufficient_permissions',
                    code: 'INSUFFICIENT_PERMISSIONS',
                    message: 'Approval permissions are required to rollback to a published version.',
                });
            }

            const validationData = { ...announcement, ...rollbackPayload, status: 'published' };
            const validationError = await validateForPublish(validationData, announcementId, true);
            if (validationError) {
                return res.status(400).json({ error: validationError });
            }

            approvalGate = await requireDualApproval(req, res, {
                actionType: 'announcement_publish',
                targetIds: [announcementId],
                payload: {
                    version: parsed.data.version,
                    note: rollbackPayload.note,
                },
                note: rollbackPayload.note,
            });
            if (!approvalGate.allowed) return;
            approvalId = approvalGate.approvalId;

            const now = new Date().toISOString();
            rollbackPayload.status = 'published';
            if (!rollbackPayload.publishAt || !String(rollbackPayload.publishAt).trim()) {
                rollbackPayload.publishAt = now;
            }
            rollbackPayload.approvedAt = now;
            rollbackPayload.approvedBy = req.user?.userId;
        }

        const updated = await AnnouncementModelMongo.update(announcementId, rollbackPayload, req.user?.userId);
        if (!updated) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        audit(req, {
            action: 'rollback',
            announcementId: updated.id,
            title: updated.title,
            userId: req.user?.userId,
            note: parsed.data.note?.trim() || undefined,
            metadata: {
                targetVersion: parsed.data.version,
                targetStatus: rollbackStatus,
                ...approvalGateAuditMetadata(approvalGate),
            },
        }).catch(console.error);

        await finalizeApprovalExecution(req, approvalId);
        await invalidateAnnouncementCaches().catch((err) => {
            console.error('Failed to invalidate caches after admin rollback:', err);
        });

        return res.json({ data: updated });
    } catch (error) {
        console.error('Rollback announcement error:', error);
        return res.status(500).json({ error: 'Failed to rollback announcement' });
    }
});

/**
 * DELETE /api/admin/announcements/:id
 * Delete announcement
 */
announcementsRouter.delete('/announcements/:id', requirePermission('announcements:delete'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const announcementId = getPathParam(req.params.id);
        const approvalGate = await requireDualApproval(req, res, {
            actionType: 'announcement_delete',
            targetIds: [announcementId],
            payload: {},
        });
        if (!approvalGate.allowed) return;

        const deleted = await AnnouncementModelMongo.delete(announcementId);
        if (!deleted) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        audit(req, {
            action: 'delete',
            announcementId,
            userId: req.user?.userId,
            metadata: {
                ...approvalGateAuditMetadata(approvalGate),
            },
        }).catch(console.error);
        await finalizeApprovalExecution(req, approvalGate.approvalId);
        await invalidateAnnouncementCaches().catch(err => {
            console.error('Failed to invalidate caches after admin delete:', err);
        });
        return res.json({ message: 'Announcement deleted' });
    } catch (error) {
        console.error('Delete announcement error:', error);
        return res.status(500).json({ error: 'Failed to delete announcement' });
    }
});


router.use(telemetryRouter);
router.use(contentRouter);
router.use(operationsRouter);
router.use(governanceRouter);
router.use(announcementsRouter);

export default router;


