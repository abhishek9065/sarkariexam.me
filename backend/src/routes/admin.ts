import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { SecurityLogger } from '../services/securityLogger.js';
import { ContentType, CreateAnnouncementDto } from '../types.js';
import { AnnouncementModelMongo } from '../models/announcements.mongo.js';
import { getDailyRollups } from '../services/analytics.js';

const router = Router();

const adminAnnouncementSchema = z.object({
    title: z.string().min(10).max(500),
    type: z.enum(['job', 'result', 'admit-card', 'syllabus', 'answer-key', 'admission'] as [ContentType, ...ContentType[]]),
    category: z.string().min(3).max(255),
    organization: z.string().min(2).max(255),
    content: z.string().optional(),
    externalLink: z.string().url().optional().or(z.literal('')),
    location: z.string().optional().or(z.literal('')),
    deadline: z.string().datetime().optional().or(z.literal('')).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    minQualification: z.string().optional().or(z.literal('')),
    ageLimit: z.string().optional().or(z.literal('')),
    applicationFee: z.string().optional().or(z.literal('')),
    totalPosts: z.number().int().positive().optional(),
    tags: z.array(z.string()).optional(),
    importantDates: z.array(z.object({
        eventName: z.string(),
        eventDate: z.string(),
        description: z.string().optional(),
    })).optional(),
    jobDetails: z.any().optional(),
});


// All admin dashboard routes require admin authentication
router.use(authenticateToken, requireAdmin);

/**
 * GET /api/admin/dashboard
 * Get complete dashboard overview - returns all data that AdminDashboard.tsx expects
 */
router.get('/dashboard', async (_req, res) => {
    try {
        // Get all announcements for stats
        const announcements = await AnnouncementModelMongo.findAll({ limit: 1000 });
        const total = announcements.length;
        const totalViews = announcements.reduce((sum, a) => sum + (a.viewCount || 0), 0);

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
                    totalUsers: 0,
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
                    totalUsers: 0,
                    newToday: 0,
                    newThisWeek: 0,
                    activeSubscribers: 0
                }
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        return res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

/**
 * GET /api/admin/stats
 * Get quick stats overview
 */
router.get('/stats', async (_req, res) => {
    try {
        const announcements = await AnnouncementModelMongo.findAll({ limit: 1000 });
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
router.get('/security', async (req, res) => {
    try {
        const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
        const logs = SecurityLogger.getRecentLogs(limit);
        return res.json({ data: logs });
    } catch (error) {
        console.error('Security logs error:', error);
        return res.status(500).json({ error: 'Failed to load security logs' });
    }
});

/**
 * GET /api/admin/security/logs
 * Get security logs (alias)
 */
router.get('/security/logs', async (req, res) => {
    try {
        const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
        const logs = SecurityLogger.getRecentLogs(limit);
        return res.json({ data: logs });
    } catch (error) {
        console.error('Security logs error:', error);
        return res.status(500).json({ error: 'Failed to load security logs' });
    }
});

/**
 * GET /api/admin/announcements
 * Get all announcements for admin management
 */
router.get('/announcements', async (req, res) => {
    try {
        const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
        const offset = parseInt(req.query.offset as string) || 0;

        const announcements = await AnnouncementModelMongo.findAll({ limit, offset });

        return res.json({ data: announcements });
    } catch (error) {
        console.error('Admin announcements error:', error);
        return res.status(500).json({ error: 'Failed to load announcements' });
    }
});

/**
 * POST /api/admin/announcements
 * Create new announcement
 */
router.post('/announcements', async (req, res) => {
    try {
        const parseResult = adminAnnouncementSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }

        const userId = req.user?.userId ?? 'system';
        const announcement = await AnnouncementModelMongo.create(parseResult.data as unknown as CreateAnnouncementDto, userId);
        return res.status(201).json({ data: announcement });
    } catch (error) {
        console.error('Create announcement error:', error);
        return res.status(500).json({ error: 'Failed to create announcement' });
    }
});

/**
 * PUT /api/admin/announcements/:id
 * Update announcement
 */
router.put('/announcements/:id', async (req, res) => {
    try {
        const updateSchema = adminAnnouncementSchema.partial();
        const parseResult = updateSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }

        const announcement = await AnnouncementModelMongo.update(req.params.id, parseResult.data as unknown as Partial<CreateAnnouncementDto>);
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        return res.json({ data: announcement });
    } catch (error) {
        console.error('Update announcement error:', error);
        return res.status(500).json({ error: 'Failed to update announcement' });
    }
});

/**
 * DELETE /api/admin/announcements/:id
 * Delete announcement
 */
router.delete('/announcements/:id', async (req, res) => {
    try {
        const deleted = await AnnouncementModelMongo.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        return res.json({ message: 'Announcement deleted' });
    } catch (error) {
        console.error('Delete announcement error:', error);
        return res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

export default router;
