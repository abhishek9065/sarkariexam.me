import { AnnouncementModelMongo } from '../models/announcements.mongo.js';

import {
    getDailyRollups,
    getRollupSummary,
    getCtrByType,
    getDigestClickStats,
    getDeepLinkAttribution,
    getTopSearches,
    getFunnelAttributionSplit,
    getPushSubscriptionStats,
} from './analytics.js';
import { getCollection } from './cosmosdb.js';

interface SubscriptionDoc {
    isActive: boolean;
    verified: boolean;
}

const OVERVIEW_CACHE_TTL_MS = 60 * 1000;
const MAX_DAYS = 90;
const STALE_ROLLUP_THRESHOLD_MINUTES = 45;
const IN_APP_CLICK_COLLAPSE_OVERAGE_RATIO = 0.35;
const IN_APP_CLICK_COLLAPSE_UNATTRIBUTED_SHARE = 0.2;

const overviewCache = new Map<string, { data: any; expiresAt: number }>();

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10;
const clampPercentage = (value: number): number => Math.max(0, Math.min(100, value));
const toDeltaPct = (current: number, previous: number): number => {
    if (!Number.isFinite(current)) return 0;
    if (!Number.isFinite(previous) || previous <= 0) return current > 0 ? 100 : 0;
    return roundToOneDecimal(((current - previous) / previous) * 100);
};

const getWindowMetrics = (rows: Array<{ views?: number; searches?: number; listingViews?: number; cardClicks?: number }>) => {
    const views = sum(rows.map((row) => row.views ?? 0));
    const searches = sum(rows.map((row) => row.searches ?? 0));
    const listingViews = sum(rows.map((row) => row.listingViews ?? 0));
    const cardClicks = sum(rows.map((row) => row.cardClicks ?? 0));
    const ctr = listingViews > 0 ? roundToOneDecimal((cardClicks / listingViews) * 100) : 0;
    const dropOff = listingViews > 0 ? roundToOneDecimal(((listingViews - cardClicks) / listingViews) * 100) : 0;
    return { views, searches, ctr, dropOff };
};

export async function getAnalyticsOverview(
    days: number = 30,
    options?: { bypassCache?: boolean; compareDays?: number }
): Promise<{ data: any; cached: boolean }> {
    const clampedDays = Math.max(1, Math.min(MAX_DAYS, Math.round(days)));
    const comparisonWindow = Math.max(
        1,
        Math.min(MAX_DAYS, Math.round(options?.compareDays ?? clampedDays))
    );
    const cacheKey = `${clampedDays}:${comparisonWindow}`;
    if (!options?.bypassCache) {
        const cachedEntry = overviewCache.get(cacheKey);
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
        topSearches,
        funnelSplit,
        pushSubscriptionStats,
        totalEmailSubscribers,
        totalPushSubscribers,
    ] = await Promise.all([
        AnnouncementModelMongo.findAll({ limit: 1000 }),
        getRollupSummary(clampedDays),
        getDailyRollups(Math.min(clampedDays, MAX_DAYS)),
        getCtrByType(clampedDays),
        getDigestClickStats(clampedDays),
        getDeepLinkAttribution(clampedDays),
        getTopSearches(clampedDays, 12),
        getFunnelAttributionSplit(clampedDays),
        getPushSubscriptionStats(clampedDays),
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
    const cardClicksInApp = funnelSplit.cardClicksInApp;
    const detailViewsDirect = funnelSplit.detailViewsDirect;
    const detailViewsUnattributed = funnelSplit.detailViewsUnattributed;
    const detailViewsInApp = Math.max(0, detailViewsRaw - detailViewsDirect - detailViewsUnattributed);
    const detailViewsAdjusted = detailViewsInApp;
    const inAppDetailDelta = detailViewsInApp - cardClicksInApp;
    const overageRatio = cardClicksInApp > 0 ? inAppDetailDelta / cardClicksInApp : 0;
    const unattributedShare = detailViewsRaw > 0 ? detailViewsUnattributed / detailViewsRaw : 0;
    const hasAnomaly = detailViewsInApp > 0 && (
        cardClicksInApp === 0
        || (
            detailViewsUnattributed > 0
            && overageRatio > IN_APP_CLICK_COLLAPSE_OVERAGE_RATIO
            && unattributedShare > IN_APP_CLICK_COLLAPSE_UNATTRIBUTED_SHARE
        )
    );

    const sortedTypes = [...typeBreakdown].sort((a, b) => b.count - a.count);
    const sortedCategories = [...categoryBreakdown].sort((a, b) => b.count - a.count);
    const last7 = dailyRollups.slice(-7);
    // Fix: Compare last 7 days with the 7 days IMMEDIATELY preceding them, not all history
    const prevStart = Math.max(0, dailyRollups.length - 14);
    const prevEnd = Math.max(0, dailyRollups.length - 7);
    const previous7 = dailyRollups.slice(prevStart, prevEnd);
    const last7Views = sum(last7.map((row) => row.views ?? 0));
    const prev7Views = sum(previous7.map((row) => row.views ?? 0));
    const viewTrendMode: 'normal' | 'baseline' = prev7Views <= 0 && last7Views > 0 ? 'baseline' : 'normal';
    const viewTrendPct = prev7Views > 0
        ? Math.round(((last7Views - prev7Views) / prev7Views) * 1000) / 10
        : last7Views > 0 ? 100 : 0;
    const viewTrendDirection = viewTrendPct > 2 ? 'up' : viewTrendPct < -2 ? 'down' : 'flat';

    const clickThroughRate = rollupSummary.listingViews > 0
        ? Math.round((cardClicksInApp / rollupSummary.listingViews) * 100)
        : 0;
    const funnelDropRate = rollupSummary.listingViews > 0
        ? Math.round(((rollupSummary.listingViews - cardClicksInApp) / rollupSummary.listingViews) * 100)
        : 0;
    const listingCoverageWindowPct = rollupSummary.viewCount > 0
        ? roundToOneDecimal((rollupSummary.listingViews / rollupSummary.viewCount) * 100)
        : 0;
    const listingCoverageAllTimePct = totalViews > 0
        ? roundToOneDecimal((rollupSummary.listingViews / totalViews) * 100)
        : 0;
    const attributionCoveragePct = detailViewsRaw > 0
        ? clampPercentage(roundToOneDecimal(((detailViewsRaw - detailViewsUnattributed) / detailViewsRaw) * 100))
        : 0;

    const rollupAgeMinutes = rollupSummary.lastUpdatedAt
        ? Math.max(0, Math.round((Date.now() - new Date(rollupSummary.lastUpdatedAt).getTime()) / 60000))
        : null;
    const zeroListingEvents = rollupSummary.listingViews === 0;
    const staleRollups = rollupAgeMinutes === null || rollupAgeMinutes > STALE_ROLLUP_THRESHOLD_MINUTES;
    const inAppClickCollapse = rollupSummary.listingViews > 0 && hasAnomaly;

    const currentRows = dailyRollups.slice(-comparisonWindow);
    const previousRows = dailyRollups.slice(
        Math.max(0, dailyRollups.length - comparisonWindow * 2),
        Math.max(0, dailyRollups.length - comparisonWindow)
    );
    const currentMetrics = getWindowMetrics(currentRows);
    const previousMetrics = getWindowMetrics(previousRows);

    const comparison = {
        viewsDeltaPct: toDeltaPct(currentMetrics.views, previousMetrics.views),
        searchesDeltaPct: toDeltaPct(currentMetrics.searches, previousMetrics.searches),
        ctrDeltaPct: toDeltaPct(currentMetrics.ctr, previousMetrics.ctr),
        dropOffDeltaPct: toDeltaPct(currentMetrics.dropOff, previousMetrics.dropOff),
        compareDays: comparisonWindow,
    };

    const anomalies: Array<{
        key: string;
        severity: 'low' | 'medium' | 'high';
        message: string;
        targetQuery?: Record<string, string>;
    }> = [];

    const lowCtrTypes = ctrByType
        .filter((entry) => (entry.listingViews ?? 0) >= 80 && (entry.ctr ?? 0) <= 2)
        .sort((a, b) => (a.ctr ?? 0) - (b.ctr ?? 0))
        .slice(0, 3);

    for (const entry of lowCtrTypes) {
        anomalies.push({
            key: `low_ctr_${entry.type}`,
            severity: (entry.ctr ?? 0) < 1 ? 'high' : 'medium',
            message: `${entry.type} CTR is low (${entry.ctr}%) on ${(entry.listingViews ?? 0).toLocaleString('en-IN')} listing views.`,
            targetQuery: {
                tab: 'list',
                type: String(entry.type),
                status: 'published',
                sort: 'views',
                q: '',
                mode: 'low_ctr',
            },
        });
    }

    if (funnelDropRate >= 70) {
        anomalies.push({
            key: 'drop_off_spike',
            severity: funnelDropRate >= 85 ? 'high' : 'medium',
            message: `Drop-off rate is elevated (${funnelDropRate}%). Review listing card quality and relevance.`,
            targetQuery: {
                tab: 'list',
                status: 'published',
                sort: 'views',
                mode: 'drop_off',
            },
        });
    }

    if (listingCoverageWindowPct > 0 && listingCoverageWindowPct < 40) {
        anomalies.push({
            key: 'tracking_coverage_low',
            severity: listingCoverageWindowPct < 25 ? 'high' : 'medium',
            message: `Tracking coverage is low (${listingCoverageWindowPct}%). Check listing view event capture.`,
            targetQuery: {
                tab: 'analytics',
                focus: 'tracking',
                mode: 'coverage',
            },
        });
    }

    if (staleRollups) {
        anomalies.push({
            key: 'rollups_stale',
            severity: 'high',
            message: `Rollups are stale (${rollupAgeMinutes ?? 'unknown'} min). Refresh analytics pipeline health.`,
            targetQuery: {
                tab: 'analytics',
                focus: 'rollups',
                mode: 'stale',
            },
        });
    }

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
        totalCardClicksInApp: cardClicksInApp,
        totalCategoryClicks: rollupSummary.categoryClicks,
        totalFilterApplies: rollupSummary.filterApplies,
        totalDigestClicks: rollupSummary.digestClicks,
        totalDeepLinkClicks: rollupSummary.deepLinkClicks,
        pushConversion: {
            attempts: pushSubscriptionStats.attempts,
            successes: pushSubscriptionStats.successes,
            failures: pushSubscriptionStats.failures,
            successRate: pushSubscriptionStats.attempts > 0
                ? roundToOneDecimal((pushSubscriptionStats.successes / pushSubscriptionStats.attempts) * 100)
                : 0,
            bySource: pushSubscriptionStats.bySource,
        },
        engagementWindowDays: rollupSummary.days,
        rollupLastUpdatedAt: rollupSummary.lastUpdatedAt,
        dailyRollups,
        topSearches,
        funnel: {
            listingViews: rollupSummary.listingViews,
            cardClicks: cardClicksInApp,
            cardClicksRaw: rollupSummary.cardClicks,
            cardClicksInApp,
            detailViews: detailViewsInApp,
            detailViewsRaw,
            detailViewsAdjusted,
            detailViewsDirect,
            detailViewsUnattributed,
            hasAnomaly,
            bookmarkAdds: rollupSummary.bookmarkAdds,
            subscriptionsVerified: rollupSummary.subscriptionsVerified,
        },
        ctrByType,
        digestClicks,
        deepLinkAttribution,
        comparison,
        anomalies,
        typeBreakdown,
        categoryBreakdown,
        insights: {
            viewTrendPct,
            viewTrendDirection,
            viewTrendMode,
            clickThroughRate,
            funnelDropRate,
            listingCoverage: listingCoverageWindowPct,
            listingCoverageWindowPct,
            listingCoverageAllTimePct,
            attributionCoveragePct,
            topType: sortedTypes[0]
                ? { ...sortedTypes[0], share: totalAnnouncements ? Math.round((sortedTypes[0].count / totalAnnouncements) * 100) : 0 }
                : null,
            topCategory: sortedCategories[0]
                ? { ...sortedCategories[0], share: totalAnnouncements ? Math.round((sortedCategories[0].count / totalAnnouncements) * 100) : 0 }
                : null,
            anomaly: hasAnomaly,
            rollupAgeMinutes,
            healthFlags: {
                zeroListingEvents,
                staleRollups,
                inAppClickCollapse,
                staleThresholdMinutes: STALE_ROLLUP_THRESHOLD_MINUTES,
            },
        },
        lastUpdated: new Date().toISOString(),
    };

    overviewCache.set(cacheKey, { data: payload, expiresAt: Date.now() + OVERVIEW_CACHE_TTL_MS });

    return { data: payload, cached: false };
}
