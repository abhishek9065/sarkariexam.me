import { AnnouncementModelMongo } from '../models/announcements.mongo.js';
import { getDailyRollups, getRollupSummary, getCtrByType, getDigestClickStats, getDeepLinkAttribution } from './analytics.js';
import { getCollection } from './cosmosdb.js';

interface SubscriptionDoc {
    isActive: boolean;
    verified: boolean;
}

const OVERVIEW_CACHE_TTL_MS = 60 * 1000;
const MAX_DAYS = 90;

const overviewCache = new Map<number, { data: any; expiresAt: number }>();

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export async function getAnalyticsOverview(
    days: number = 30,
    options?: { bypassCache?: boolean }
): Promise<{ data: any; cached: boolean }> {
    const clampedDays = Math.max(1, Math.min(MAX_DAYS, Math.round(days)));
    if (!options?.bypassCache) {
        const cachedEntry = overviewCache.get(clampedDays);
        if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
            return { data: cachedEntry.data, cached: true };
        }
    }

    const [
        announcements,
        rollupSummary,
        dailyRollups,
        ctrByType,
        digestClicks,
        deepLinkAttribution,
        totalEmailSubscribers,
        totalPushSubscribers,
    ] = await Promise.all([
        AnnouncementModelMongo.findAll({ limit: 1000 }),
        getRollupSummary(clampedDays),
        getDailyRollups(Math.min(clampedDays, MAX_DAYS)),
        getCtrByType(clampedDays),
        getDigestClickStats(clampedDays),
        getDeepLinkAttribution(clampedDays),
        (async () => {
            try {
                const subscriptions = getCollection<SubscriptionDoc>('subscriptions');
                return await subscriptions.countDocuments({ isActive: true, verified: true });
            } catch (error) {
                console.error('[Analytics] Failed to load subscription count:', error);
                return 0;
            }
        })(),
        (async () => {
            try {
                const pushSubs = getCollection('push_subscriptions');
                return await pushSubs.countDocuments({});
            } catch (error) {
                console.error('[Analytics] Failed to load push subscription count:', error);
                return 0;
            }
        })(),
    ]);

    const totalAnnouncements = announcements.length;
    const totalViews = announcements.reduce((total, item) => total + (item.viewCount || 0), 0);
    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const announcement of announcements) {
        byType[announcement.type] = (byType[announcement.type] || 0) + 1;
        if (announcement.category) {
            byCategory[announcement.category] = (byCategory[announcement.category] || 0) + 1;
        }
    }

    const typeBreakdown = Object.entries(byType).map(([type, count]) => ({ type, count }));
    const categoryBreakdown = Object.entries(byCategory).map(([category, count]) => ({ category, count }));

    const detailViewsRaw = rollupSummary.viewCount;
    const detailViewsAdjusted = Math.min(detailViewsRaw, rollupSummary.cardClicks || detailViewsRaw);
    const hasAnomaly = rollupSummary.cardClicks > 0 && detailViewsRaw > rollupSummary.cardClicks;

    const sortedTypes = [...typeBreakdown].sort((a, b) => b.count - a.count);
    const sortedCategories = [...categoryBreakdown].sort((a, b) => b.count - a.count);
    const last7 = dailyRollups.slice(-7);
    const previous7 = dailyRollups.slice(0, Math.max(0, dailyRollups.length - 7));
    const last7Views = sum(last7.map((row) => row.views ?? 0));
    const prev7Views = sum(previous7.map((row) => row.views ?? 0));
    const viewTrendPct = prev7Views > 0
        ? Math.round(((last7Views - prev7Views) / prev7Views) * 1000) / 10
        : last7Views > 0 ? 100 : 0;
    const viewTrendDirection = viewTrendPct > 2 ? 'up' : viewTrendPct < -2 ? 'down' : 'flat';

    const clickThroughRate = rollupSummary.listingViews > 0
        ? Math.round((rollupSummary.cardClicks / rollupSummary.listingViews) * 100)
        : 0;
    const funnelDropRate = rollupSummary.listingViews > 0
        ? Math.round(((rollupSummary.listingViews - rollupSummary.cardClicks) / rollupSummary.listingViews) * 100)
        : 0;
    const listingCoverage = totalViews > 0
        ? Math.round((rollupSummary.listingViews / totalViews) * 100)
        : 0;

    const rollupAgeMinutes = rollupSummary.lastUpdatedAt
        ? Math.max(0, Math.round((Date.now() - new Date(rollupSummary.lastUpdatedAt).getTime()) / 60000))
        : null;

    const payload = {
        totalAnnouncements,
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
        totalDigestClicks: rollupSummary.digestClicks,
        totalDeepLinkClicks: rollupSummary.deepLinkClicks,
        engagementWindowDays: rollupSummary.days,
        rollupLastUpdatedAt: rollupSummary.lastUpdatedAt,
        dailyRollups,
        funnel: {
            listingViews: rollupSummary.listingViews,
            cardClicks: rollupSummary.cardClicks,
            detailViews: detailViewsAdjusted,
            detailViewsRaw,
            detailViewsAdjusted,
            hasAnomaly,
            bookmarkAdds: rollupSummary.bookmarkAdds,
            subscriptionsVerified: rollupSummary.subscriptionsVerified,
        },
        ctrByType,
        digestClicks,
        deepLinkAttribution,
        typeBreakdown,
        categoryBreakdown,
        insights: {
            viewTrendPct,
            viewTrendDirection,
            clickThroughRate,
            funnelDropRate,
            listingCoverage,
            topType: sortedTypes[0]
                ? { ...sortedTypes[0], share: totalAnnouncements ? Math.round((sortedTypes[0].count / totalAnnouncements) * 100) : 0 }
                : null,
            topCategory: sortedCategories[0]
                ? { ...sortedCategories[0], share: totalAnnouncements ? Math.round((sortedCategories[0].count / totalAnnouncements) * 100) : 0 }
                : null,
            anomaly: hasAnomaly,
            rollupAgeMinutes,
        },
        lastUpdated: new Date().toISOString(),
    };

    overviewCache.set(clampedDays, { data: payload, expiresAt: Date.now() + OVERVIEW_CACHE_TTL_MS });

    return { data: payload, cached: false };
}
