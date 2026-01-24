import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { AnnouncementModelMongo } from '../models/announcements.mongo.js';
import { getDailyRollups, getRollupSummary } from '../services/analytics.js';
import { getAnalyticsOverview } from '../services/analyticsOverview.js';
const POPULAR_CACHE_TTL_MS = 60 * 1000;

const popularCache: { data: any | null; expiresAt: number } = {
    data: null,
    expiresAt: 0,
};

const router = Router();

// All analytics routes require admin authentication
router.use(authenticateToken, requirePermission('analytics:read'));

/**
 * GET /api/analytics/overview
 * Get analytics overview stats
 */
router.get('/overview', async (req, res) => {
    try {
        const daysParam = parseInt(req.query.days as string, 10);
        const days = Number.isFinite(daysParam) ? Math.min(90, Math.max(1, daysParam)) : 30;
        const bypassCache = req.query.nocache === '1';
        const { data, cached } = await getAnalyticsOverview(days, { bypassCache });
        return res.json({ data, cached });
    } catch (error) {
        console.error('Analytics overview error:', error);
        return res.status(500).json({ error: 'Failed to load analytics' });
    }
});

/**
 * GET /api/analytics/popular
 * Get popular content
 */
router.get('/popular', async (req, res) => {
    try {
        if (!req.query.nocache && popularCache.data && popularCache.expiresAt > Date.now()) {
            return res.json({ data: popularCache.data, cached: true });
        }

        const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
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
