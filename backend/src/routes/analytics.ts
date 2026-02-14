import { Router } from 'express';
import { z } from 'zod';

import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { AnnouncementModelMongo } from '../models/announcements.mongo.js';
import { getDailyRollups, getRollupSummary } from '../services/analytics.js';
import { getAnalyticsOverview } from '../services/analyticsOverview.js';
const POPULAR_CACHE_TTL_MS = 60 * 1000;

const popularCache: { data: any | null; expiresAt: number } = {
    data: null,
    expiresAt: 0,
};

// Input validation schemas
const analyticsQuerySchema = z.object({
    days: z.coerce.number().int().min(1).max(90).default(30),
    compareDays: z.coerce.number().int().min(1).max(90).optional(),
    nocache: z.string().optional().transform(val => val === '1')
});

const popularQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(10),
    nocache: z.string().optional().transform(val => val === '1')
});

const router = Router();

// All analytics routes require admin authentication
router.use(authenticateToken, requirePermission('analytics:read'));

/**
 * GET /api/analytics/overview
 * Get analytics overview stats
 */
router.get('/overview', async (req, res) => {
    try {
        const parseResult = analyticsQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            return res.status(400).json({ 
                error: 'Invalid query parameters',
                details: parseResult.error.flatten().fieldErrors
            });
        }
        
        const { days, compareDays, nocache: bypassCache } = parseResult.data;
        const { data, cached } = await getAnalyticsOverview(days, { bypassCache, compareDays });
        return res.json({ data, cached });
    } catch (error) {
        console.error('[Analytics] Overview error:', error);
        return res.status(500).json({ error: 'Failed to load analytics' });
    }
});

/**
 * GET /api/analytics/popular
 * Get popular content
 */
router.get('/popular', async (req, res) => {
    try {
        const parseResult = popularQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            return res.status(400).json({ 
                error: 'Invalid query parameters',
                details: parseResult.error.flatten().fieldErrors
            });
        }
        
        const { limit, nocache: bypassCache } = parseResult.data;
        
        if (!bypassCache && popularCache.data && popularCache.expiresAt > Date.now()) {
            return res.json({ data: popularCache.data, cached: true });
        }

        const announcements = await AnnouncementModelMongo.getTrending({ limit });

        const payload = announcements.map(a => ({
            id: a.id,
            title: a.title,
            type: a.type,
            category: a.category || '',
            viewCount: a.viewCount || 0,
            slug: a.slug,
            status: a.status,
            isActive: a.isActive,
        }));

        popularCache.data = payload;
        popularCache.expiresAt = Date.now() + POPULAR_CACHE_TTL_MS;

        return res.json({ data: payload });
    } catch (error) {
        console.error('Popular content error:', error);
        return res.status(500).json({ error: 'Failed to load popular content' });
    }
});

/**
 * GET /api/analytics/export/csv
 * Export analytics rollups as CSV
 */
router.get('/export/csv', async (req, res) => {
    try {
        const days = Math.min(60, Math.max(1, parseInt(req.query.days as string) || 30));
        const rollupSummary = await getRollupSummary(days);
        const dailyRollups = await getDailyRollups(days);
        const totalAnnouncementCount = dailyRollups.reduce((sum, row) => sum + (row.count || 0), 0);

        const headers = [
            'Date',
            'Announcements',
            'Views',
            'ListingViews',
            'CardClicks',
            'CategoryClicks',
            'FilterApplies',
            'Searches',
            'BookmarkAdds',
            'Registrations',
        ];

        const totalRow = [
            'TOTAL',
            totalAnnouncementCount,
            rollupSummary.viewCount,
            rollupSummary.listingViews,
            rollupSummary.cardClicks,
            rollupSummary.categoryClicks,
            rollupSummary.filterApplies,
            rollupSummary.searchCount,
            rollupSummary.bookmarkAdds,
            rollupSummary.registrations,
        ];

        const rows = dailyRollups.map(row => ([
            row.date,
            row.count,
            row.views,
            row.listingViews,
            row.cardClicks,
            row.categoryClicks,
            row.filterApplies,
            row.searches,
            row.bookmarkAdds,
            row.registrations,
        ]));

        const csv = [
            headers.join(','),
            totalRow.join(','),
            ...rows.map(values => values.join(',')),
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-rollups-${new Date().toISOString().split('T')[0]}.csv"`);
        return res.send(csv);
    } catch (error) {
        console.error('Analytics export error:', error);
        return res.status(500).json({ error: 'Failed to export analytics' });
    }
});

export default router;
