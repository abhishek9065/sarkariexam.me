import { Router } from 'express';
import { z } from 'zod';

import { authenticateToken, requireAdminStepUp, requirePermission } from '../middleware/auth.js';
import { idempotency } from '../middleware/idempotency.js';
import { AnnouncementModelMongo } from '../models/announcements.mongo.js';
import { getActiveUsersStats } from '../services/activeUsers.js';
import {
    approveAdminApprovalRequest,
    createAdminApprovalRequest,
    listAdminApprovalRequests,
    markAdminApprovalExecuted,
    rejectAdminApprovalRequest,
    validateApprovalForExecution,
    type AdminApprovalActionType,
} from '../services/adminApprovals.js';
import { evaluateAdminApprovalRequirement } from '../services/adminApprovalPolicy.js';
import { getAdminAuditLogsPaged, recordAdminAudit } from '../services/adminAudit.js';
import { getDailyRollups } from '../services/analytics.js';
import { getCollection } from '../services/cosmosdb.js';
import { hasPermission } from '../services/rbac.js';
import { SecurityLogger } from '../services/securityLogger.js';
import { getAdminSession, listAdminSessions, mapSessionForClient, terminateAdminSession, terminateOtherSessions } from '../services/adminSessions.js';
import { ContentType, CreateAnnouncementDto } from '../types.js';

const router = Router();

interface UserDoc {
    createdAt: Date;
    isActive: boolean;
}

interface SubscriptionDoc {
    createdAt: Date;
    isActive: boolean;
    verified: boolean;
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
});

const bulkUpdateSchema = z.object({
    ids: z.array(z.string().min(1)).min(1),
    data: adminAnnouncementPartialSchema,
});

const bulkReviewSchema = z.object({
    ids: z.array(z.string().min(1)).min(1),
    note: z.string().max(500).optional().or(z.literal('')),
});

const auditQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    userId: z.string().trim().optional(),
    action: z.string().trim().optional(),
    start: z.string().trim().optional(),
    end: z.string().trim().optional(),
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

const getEndpointPath = (url: string) => url.split('?')[0];

const requireDualApproval = async (
    req: any,
    res: any,
    input: {
        actionType: AdminApprovalActionType;
        targetIds: string[];
        payload?: Record<string, any>;
        note?: string;
    }
): Promise<{ allowed: boolean; approvalId?: string }> => {
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
    const approvalIdHeader = req.get('x-admin-approval-id');
    const payload = input.payload ?? {};

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
            requiresApproval: true,
            approvalId: approval.id,
            message: 'Action queued for secondary approval.',
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
        res.status(409).json({
            error: 'approval_invalid',
            reason: validation.reason,
            message: 'Approval is missing, expired, or does not match this action.',
        });
        return { allowed: false };
    }

    return { allowed: true, approvalId: approvalIdHeader };
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
// All admin dashboard routes require admin-level read access
router.use(authenticateToken, requirePermission('admin:read'));

/**
 * GET /api/admin/dashboard
 * Get complete dashboard overview - returns all data that AdminDashboard.tsx expects
 */
router.get('/dashboard', async (_req, res) => {
    try {
        // Get all announcements for stats
        const announcements = await AnnouncementModelMongo.findAllAdmin({ limit: 1000, includeInactive: true });
        const total = announcements.length;
        const totalViews = announcements.reduce((sum, a) => sum + (a.viewCount || 0), 0);

        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(startOfWeek.getDate() - 7);
        startOfWeek.setHours(0, 0, 0, 0);

        const usersCollection = getCollection<UserDoc>('users');
        const subscriptionsCollection = getCollection<SubscriptionDoc>('subscriptions');

        const [totalUsers, newToday, newThisWeek, activeSubscribers] = await Promise.all([
            usersCollection.countDocuments({ isActive: true }),
            usersCollection.countDocuments({ isActive: true, createdAt: { $gte: startOfDay } }),
            usersCollection.countDocuments({ isActive: true, createdAt: { $gte: startOfWeek } }),
            subscriptionsCollection.countDocuments({ isActive: true, verified: true }),
        ]);

        // Calculate category stats
        const categoryMap: Record<string, { count: number; views: number }> = {};
        for (const a of announcements) {
            if (!categoryMap[a.type]) {
                categoryMap[a.type] = { count: 0, views: 0 };
            }
            categoryMap[a.type].count++;
            categoryMap[a.type].views += a.viewCount || 0;
        }
        const categories = Object.entries(categoryMap).map(([type, stats]) => ({
            type,
            count: stats.count,
            views: stats.views
        }));
        const trends = await getDailyRollups(14);

        const topContent = announcements
            .slice()
            .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
            .slice(0, 10)
            .map(a => ({
                id: a.id,
                title: a.title,
                type: a.type,
                views: a.viewCount || 0,
                organization: a.organization || 'Unknown'
            }));

        return res.json({
            data: {
                overview: {
                    totalAnnouncements: total,
                    totalUsers,
                    totalViews,
                    totalBookmarks: 0,
                    activeJobs: categoryMap['job']?.count || 0,
                    expiringSoon: 0,
                    newToday: 0,
                    newThisWeek: Math.min(total, 10)
                },
                categories,
                trends,
                topContent,
                users: {
                    totalUsers,
                    newToday,
                    newThisWeek,
                    activeSubscribers
                }
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        return res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

/**
 * GET /api/admin/active-users
 * Get active user counts in the last N minutes
 */
router.get('/active-users', async (req, res) => {
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
router.get('/stats', async (_req, res) => {
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
 * GET /api/admin/security
 * Get security logs
 */
router.get('/security', requirePermission('security:read'), async (req, res) => {
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
router.get('/security/logs', requirePermission('security:read'), async (req, res) => {
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
 * GET /api/admin/sessions
 * List active admin sessions.
 */
router.get('/sessions', requirePermission('security:read'), async (req, res) => {
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
router.get('/session', requirePermission('security:read'), async (req, res) => {
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
router.post('/sessions/terminate', requirePermission('security:read'), requireAdminStepUp, async (req, res) => {
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
router.post('/sessions/terminate-others', requirePermission('security:read'), requireAdminStepUp, async (req, res) => {
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
router.get('/approvals', requirePermission('announcements:approve'), async (req, res) => {
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
 * POST /api/admin/approvals/:id/approve
 * Approve a pending high-risk action.
 */
router.post('/approvals/:id/approve', requirePermission('announcements:approve'), requireAdminStepUp, async (req, res) => {
    try {
        const parsed = adminApprovalResolveSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const approved = await approveAdminApprovalRequest({
            id: req.params.id,
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
            metadata: { approvalId: req.params.id, approvedBy: req.user?.email },
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
router.post('/approvals/:id/reject', requirePermission('announcements:approve'), requireAdminStepUp, async (req, res) => {
    try {
        const parsed = adminApprovalResolveSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }

        const rejected = await rejectAdminApprovalRequest({
            id: req.params.id,
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
            metadata: { approvalId: req.params.id, rejectedBy: req.user?.email },
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
router.get('/audit-log', requirePermission('audit:read'), async (req, res) => {
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
 * GET /api/admin/announcements
 * Get all announcements for admin management
 */
router.get('/announcements', requirePermission('announcements:read'), async (req, res) => {
    try {
        const parseResult = adminListQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }

        const filters = parseResult.data;
        const [announcements, total] = await Promise.all([
            AnnouncementModelMongo.findAllAdmin({
                limit: filters.limit,
                offset: filters.offset,
                status: filters.status,
                type: filters.type,
                search: filters.search,
                includeInactive: filters.includeInactive,
                sort: filters.sort,
            }),
            AnnouncementModelMongo.countAdmin({
                status: filters.status,
                type: filters.type,
                search: filters.search,
                includeInactive: filters.includeInactive,
            }),
        ]);

        return res.json({
            data: announcements,
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
router.get('/announcements/summary', requirePermission('announcements:read'), async (req, res) => {
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

/**
 * GET /api/admin/announcements/export/csv
 * Export announcements (admin view) as CSV
 */
router.get('/announcements/export/csv', requirePermission('announcements:read'), async (req, res) => {
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

/**
 * POST /api/admin/announcements
 * Create new announcement
 */
router.post('/announcements', requirePermission('announcements:write'), idempotency(), async (req, res) => {
    try {
        const parseResult = adminAnnouncementSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }

        const userId = req.user?.userId ?? 'system';
        const announcement = await AnnouncementModelMongo.create(parseResult.data as unknown as CreateAnnouncementDto, userId);
        recordAdminAudit({
            action: 'create',
            announcementId: announcement.id,
            title: announcement.title,
            userId,
            metadata: { status: announcement.status },
        }).catch(console.error);
        return res.status(201).json({ data: announcement });
    } catch (error) {
        console.error('Create announcement error:', error);
        return res.status(500).json({ error: 'Failed to create announcement' });
    }
});

/**
 * POST /api/admin/announcements/bulk
 * Bulk update announcements
 */
router.post('/announcements/bulk', requirePermission('announcements:write'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const parseResult = bulkUpdateSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }

        const { ids, data } = parseResult.data as unknown as {
            ids: string[];
            data: Partial<CreateAnnouncementDto> & { isActive?: boolean };
        };
        if (data.status === 'published' && !hasPermission(req.user?.role as any, 'announcements:approve')) {
            return res.status(403).json({ error: 'Insufficient permissions to publish announcements.' });
        }
        let approvalId: string | undefined;
        if (data.status === 'published') {
            const approvalGate = await requireDualApproval(req, res, {
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
        recordAdminAudit({
            action: 'bulk_update',
            userId: req.user?.userId,
            metadata: { count: ids.length, status: data.status },
        }).catch(console.error);

        await finalizeApprovalExecution(req, approvalId);
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
router.post('/announcements/bulk-approve', requirePermission('announcements:approve'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const parseResult = bulkReviewSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }

        const { ids, note } = parseResult.data;
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
        recordAdminAudit({
            action: 'bulk_approve',
            userId: req.user?.userId,
            note: note?.trim() || undefined,
            metadata: { count: ids.length },
        }).catch(console.error);

        await finalizeApprovalExecution(req, approvalGate.approvalId);
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
router.post('/announcements/bulk-reject', requirePermission('announcements:approve'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const parseResult = bulkReviewSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }

        const { ids, note } = parseResult.data;
        const data = {
            status: 'draft' as const,
            approvedAt: '',
            approvedBy: '',
            note: note?.trim() || undefined,
        };

        const updates = ids.map(id => ({ id, data }));
        const result = await AnnouncementModelMongo.batchUpdate(updates, req.user?.userId);
        recordAdminAudit({
            action: 'bulk_reject',
            userId: req.user?.userId,
            note: note?.trim() || undefined,
            metadata: { count: ids.length },
        }).catch(console.error);

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
router.put('/announcements/:id', requirePermission('announcements:write'), idempotency(), async (req, res) => {
    try {
        const updateSchema = adminAnnouncementPartialSchema;
        const parseResult = updateSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }

        const note = typeof (parseResult.data as any).note === 'string'
            ? (parseResult.data as any).note.trim() || undefined
            : undefined;
        const announcement = await AnnouncementModelMongo.update(
            req.params.id,
            parseResult.data as unknown as Partial<CreateAnnouncementDto> & { note?: string },
            req.user?.userId
        );
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        recordAdminAudit({
            action: 'update',
            announcementId: announcement.id,
            title: announcement.title,
            userId: req.user?.userId,
            note,
            metadata: { fields: Object.keys(parseResult.data) },
        }).catch(console.error);
        return res.json({ data: announcement });
    } catch (error) {
        console.error('Update announcement error:', error);
        return res.status(500).json({ error: 'Failed to update announcement' });
    }
});

/**
 * POST /api/admin/announcements/:id/approve
 * Approve and publish an announcement
 */
router.post('/announcements/:id/approve', requirePermission('announcements:approve'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const note = typeof req.body?.note === 'string' ? req.body.note.trim() || undefined : undefined;
        const approvalGate = await requireDualApproval(req, res, {
            actionType: 'announcement_publish',
            targetIds: [req.params.id],
            payload: { note },
            note,
        });
        if (!approvalGate.allowed) return;

        const now = new Date().toISOString();
        const announcement = await AnnouncementModelMongo.update(
            req.params.id,
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
        recordAdminAudit({
            action: 'approve',
            announcementId: announcement.id,
            title: announcement.title,
            userId: req.user?.userId,
            note,
        }).catch(console.error);
        await finalizeApprovalExecution(req, approvalGate.approvalId);
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
router.post('/announcements/:id/reject', requirePermission('announcements:approve'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const note = typeof req.body?.note === 'string' ? req.body.note.trim() || undefined : undefined;
        const announcement = await AnnouncementModelMongo.update(
            req.params.id,
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
        recordAdminAudit({
            action: 'reject',
            announcementId: announcement.id,
            title: announcement.title,
            userId: req.user?.userId,
            note,
        }).catch(console.error);
        return res.json({ data: announcement });
    } catch (error) {
        console.error('Reject announcement error:', error);
        return res.status(500).json({ error: 'Failed to reject announcement' });
    }
});

/**
 * DELETE /api/admin/announcements/:id
 * Delete announcement
 */
router.delete('/announcements/:id', requirePermission('announcements:delete'), requireAdminStepUp, idempotency(), async (req, res) => {
    try {
        const approvalGate = await requireDualApproval(req, res, {
            actionType: 'announcement_delete',
            targetIds: [req.params.id],
            payload: {},
        });
        if (!approvalGate.allowed) return;

        const deleted = await AnnouncementModelMongo.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        recordAdminAudit({
            action: 'delete',
            announcementId: req.params.id,
            userId: req.user?.userId,
        }).catch(console.error);
        await finalizeApprovalExecution(req, approvalGate.approvalId);
        return res.json({ message: 'Announcement deleted' });
    } catch (error) {
        console.error('Delete announcement error:', error);
        return res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

export default router;
