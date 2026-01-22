import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { AnnouncementModelMongo } from '../models/announcements.mongo.js';
import { getDailyRollups, getRollupSummary } from '../services/analytics.js';
import { getCollection } from '../services/cosmosdb.js';

interface SubscriptionDoc {
    isActive: boolean;
    verified: boolean;
}

const router = Router();

// All analytics routes require admin authentication
router.use(authenticateToken, requireAdmin);

/**
 * GET /api/analytics/overview
 * Get analytics overview stats
 */
router.get('/overview', async (_req, res) => {
    try {
        const announcements = await AnnouncementModelMongo.findAll({ limit: 1000 });
        const rollupSummary = await getRollupSummary(30);
        const dailyRollups = await getDailyRollups(14);

        let totalEmailSubscribers = 0;
        let totalPushSubscribers = 0;
        try {
            const subscriptions = getCollection<SubscriptionDoc>('subscriptions');
            totalEmailSubscribers = await subscriptions.countDocuments({ isActive: true, verified: true });
        } catch (error) {
            console.error('[Analytics] Failed to load subscription count:', error);
        }

        try {
            const pushSubs = getCollection('push_subscriptions');
            totalPushSubscribers = await pushSubs.countDocuments({});
        } catch (error) {
            console.error('[Analytics] Failed to load push subscription count:', error);
        }

        // Calculate stats
        const total = announcements.length;
        const totalViews = announcements.reduce((sum, a) => sum + (a.viewCount || 0), 0);
        const byType: Record<string, number> = {};
        const byCategory: Record<string, number> = {};

        for (const a of announcements) {
            byType[a.type] = (byType[a.type] || 0) + 1;
            if (a.category) {
                byCategory[a.category] = (byCategory[a.category] || 0) + 1;
            }
        }

        // Convert to array format expected by frontend
        const typeBreakdown = Object.entries(byType).map(([type, count]) => ({ type, count }));
        const categoryBreakdown = Object.entries(byCategory).map(([category, count]) => ({ category, count }));

        return res.json({
            data: {
                totalAnnouncements: total,
                totalViews,
                totalEmailSubscribers,
                totalPushSubscribers,
                totalSearches: rollupSummary.searchCount,
                totalBookmarks: rollupSummary.bookmarkAdds,
                totalRegistrations: rollupSummary.registrations,
                totalSubscriptionsVerified: rollupSummary.subscriptionsVerified,
                totalSubscriptionsUnsubscribed: rollupSummary.subscriptionsUnsubscribed,
                totalListingViews: rollupSummary.listingViews,
                totalCardClicks: rollupSummary.cardClicks,
                totalCategoryClicks: rollupSummary.categoryClicks,
                totalFilterApplies: rollupSummary.filterApplies,
                engagementWindowDays: rollupSummary.days,
                rollupLastUpdatedAt: rollupSummary.lastUpdatedAt,
                dailyRollups,
                typeBreakdown,
                categoryBreakdown,
                lastUpdated: new Date().toISOString()
            }
        });
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
        const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
        const announcements = await AnnouncementModelMongo.getTrending({ limit });

        return res.json({
            data: announcements.map(a => ({
                id: a.id,
                title: a.title,
                type: a.type,
                category: a.category || '',
                viewCount: a.viewCount || 0
            }))
        });
    } catch (error) {
        console.error('Popular content error:', error);
        return res.status(500).json({ error: 'Failed to load popular content' });
    }
});

export default router;
