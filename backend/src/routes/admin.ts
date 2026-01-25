import { Router } from 'express';
import { z } from 'zod';

import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { idempotency } from '../middleware/idempotency.js';
import { AnnouncementModelMongo } from '../models/announcements.mongo.js';
import { getActiveUsersStats } from '../services/activeUsers.js';
import { getAdminAuditLogsPaged, recordAdminAudit } from '../services/adminAudit.js';
import { getDailyRollups } from '../services/analytics.js';
import { getCollection } from '../services/cosmosdb.js';
import { SecurityLogger } from '../services/securityLogger.js';
import { AnnouncementStatus, ContentType, CreateAnnouncementDto } from '../types.js';

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
        const stats = getActiveUsersStats(windowMinutes);
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
        const limit = Math.min(200, parseInt(req.query.limit as string) || 20);
        const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
        const logs = SecurityLogger.getRecentLogs(limit, offset);
        return res.json({
            data: logs,
            meta: {
                total: SecurityLogger.getTotalLogs(),
                limit,
                offset,
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
        const limit = Math.min(200, parseInt(req.query.limit as string) || 20);
        const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
        const logs = SecurityLogger.getRecentLogs(limit, offset);
        return res.json({
            data: logs,
            meta: {
                total: SecurityLogger.getTotalLogs(),
                limit,
                offset,
            },
        });
    } catch (error) {
        console.error('Security logs error:', error);
        return res.status(500).json({ error: 'Failed to load security logs' });
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
            return res.status(400).json({ error: parseResult.error.flatten() });
        }

        const filters = parseResult.data;
        const announcements = await AnnouncementModelMongo.findAllAdmin({
            limit: 2000,
            includeInactive: filters.includeInactive ?? true,
            status: filters.status && filters.status !== 'all' ? filters.status : undefined,
            type: filters.type,
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
router.post('/announcements/bulk', requirePermission('announcements:write'), idempotency(), async (req, res) => {
    try {
        const parseResult = bulkUpdateSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }

        const { ids, data } = parseResult.data as unknown as {
            ids: string[];
            data: Partial<CreateAnnouncementDto> & { isActive?: boolean };
        };
        const updates = ids.map(id => ({ id, data }));
        const result = await AnnouncementModelMongo.batchUpdate(updates, req.user?.userId);
        recordAdminAudit({
            action: 'bulk_update',
            userId: req.user?.userId,
            metadata: { count: ids.length, status: data.status },
        }).catch(console.error);

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
router.post('/announcements/bulk-approve', requirePermission('announcements:approve'), idempotency(), async (req, res) => {
    try {
        const parseResult = bulkReviewSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }

        const { ids, note } = parseResult.data;
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
router.post('/announcements/bulk-reject', requirePermission('announcements:approve'), idempotency(), async (req, res) => {
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
router.post('/announcements/:id/approve', requirePermission('announcements:approve'), idempotency(), async (req, res) => {
    try {
        const now = new Date().toISOString();
        const note = typeof req.body?.note === 'string' ? req.body.note.trim() || undefined : undefined;
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
router.post('/announcements/:id/reject', requirePermission('announcements:approve'), idempotency(), async (req, res) => {
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
router.delete('/announcements/:id', requirePermission('announcements:delete'), idempotency(), async (req, res) => {
    try {
        const deleted = await AnnouncementModelMongo.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        recordAdminAudit({
            action: 'delete',
            announcementId: req.params.id,
            userId: req.user?.userId,
        }).catch(console.error);
        return res.json({ message: 'Announcement deleted' });
    } catch (error) {
        console.error('Delete announcement error:', error);
        return res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

export default router;
