import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    findAllMock,
    getRollupSummaryMock,
    getDailyRollupsMock,
    getCtrByTypeMock,
    getDigestClickStatsMock,
    getDeepLinkAttributionMock,
    getTopSearchesMock,
    getFunnelAttributionSplitMock,
    getPushSubscriptionStatsMock,
    getCollectionMock,
    subscriptionsCountMock,
    pushSubscriptionsCountMock,
} = vi.hoisted(() => ({
    findAllMock: vi.fn(),
    getRollupSummaryMock: vi.fn(),
    getDailyRollupsMock: vi.fn(),
    getCtrByTypeMock: vi.fn(),
    getDigestClickStatsMock: vi.fn(),
    getDeepLinkAttributionMock: vi.fn(),
    getTopSearchesMock: vi.fn(),
    getFunnelAttributionSplitMock: vi.fn(),
    getPushSubscriptionStatsMock: vi.fn(),
    getCollectionMock: vi.fn(),
    subscriptionsCountMock: vi.fn(),
    pushSubscriptionsCountMock: vi.fn(),
}));

vi.mock('../models/announcements.mongo.js', () => ({
    AnnouncementModelMongo: {
        findAll: findAllMock,
    },
}));

vi.mock('../services/analytics.js', () => ({
    getRollupSummary: getRollupSummaryMock,
    getDailyRollups: getDailyRollupsMock,
    getCtrByType: getCtrByTypeMock,
    getDigestClickStats: getDigestClickStatsMock,
    getDeepLinkAttribution: getDeepLinkAttributionMock,
    getTopSearches: getTopSearchesMock,
    getFunnelAttributionSplit: getFunnelAttributionSplitMock,
    getPushSubscriptionStats: getPushSubscriptionStatsMock,
}));

vi.mock('../services/cosmosdb.js', () => ({
    getCollection: getCollectionMock,
}));

import { getAnalyticsOverview } from '../services/analyticsOverview.js';

const createRollupSummary = (overrides: Partial<Record<string, unknown>> = {}) => ({
    days: 30,
    lastUpdatedAt: new Date().toISOString(),
    viewCount: 0,
    listingViews: 0,
    cardClicks: 0,
    categoryClicks: 0,
    filterApplies: 0,
    searchCount: 0,
    bookmarkAdds: 0,
    bookmarkRemoves: 0,
    registrations: 0,
    subscriptionsVerified: 0,
    subscriptionsUnsubscribed: 0,
    savedSearches: 0,
    digestPreviews: 0,
    digestClicks: 0,
    deepLinkClicks: 0,
    alertsViewed: 0,
    pushSubscribeAttempts: 0,
    pushSubscribeSuccesses: 0,
    pushSubscribeFailures: 0,
    ...overrides,
});

const createDailyRollups = (days: number, viewResolver: (index: number) => number) => {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);
    return Array.from({ length: days }).map((_, index) => {
        const date = new Date(start);
        date.setUTCDate(start.getUTCDate() + index);
        return {
            date: date.toISOString().slice(0, 10),
            count: 0,
            views: viewResolver(index),
            listingViews: 0,
            cardClicks: 0,
            categoryClicks: 0,
            filterApplies: 0,
            searches: 0,
            bookmarkAdds: 0,
            registrations: 0,
        };
    });
};

describe('analytics overview health flags', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        findAllMock.mockResolvedValue([
            { type: 'job', category: 'Central Government', viewCount: 12 },
        ]);
        getDailyRollupsMock.mockResolvedValue([]);
        getCtrByTypeMock.mockResolvedValue([]);
        getDigestClickStatsMock.mockResolvedValue({
            total: 0,
            variants: [],
            frequencies: [],
            campaigns: [],
        });
        getDeepLinkAttributionMock.mockResolvedValue({
            total: 0,
            sources: [],
            mediums: [],
            campaigns: [],
        });
        getTopSearchesMock.mockResolvedValue([]);
        getFunnelAttributionSplitMock.mockResolvedValue({
            totalCardClicks: 0,
            cardClicksInApp: 0,
            detailViewsDirect: 0,
            detailViewsUnattributed: 0,
        });
        getPushSubscriptionStatsMock.mockResolvedValue({
            attempts: 0,
            successes: 0,
            failures: 0,
            bySource: [],
        });
        subscriptionsCountMock.mockResolvedValue(0);
        pushSubscriptionsCountMock.mockResolvedValue(0);
        getCollectionMock.mockImplementation((name: string) => {
            if (name === 'subscriptions') {
                return { countDocuments: subscriptionsCountMock };
            }
            if (name === 'push_subscriptions') {
                return { countDocuments: pushSubscriptionsCountMock };
            }
            return { countDocuments: vi.fn().mockResolvedValue(0) };
        });
    });

    it('sets zeroListingEvents when listing views are zero and keeps compatibility fields', async () => {
        getRollupSummaryMock.mockResolvedValue(createRollupSummary({
            viewCount: 25,
            listingViews: 0,
            lastUpdatedAt: new Date().toISOString(),
        }));

        const { data } = await getAnalyticsOverview(30, { bypassCache: true });
        const healthFlags = data.insights.healthFlags;

        expect(healthFlags.zeroListingEvents).toBe(true);
        expect(healthFlags.staleRollups).toBe(false);
        expect(healthFlags.inAppClickCollapse).toBe(false);
        expect(healthFlags.staleThresholdMinutes).toBe(45);

        // Backward compatibility fields remain present.
        expect(typeof data.insights.listingCoverageWindowPct).toBe('number');
        expect(typeof data.insights.listingCoverageAllTimePct).toBe('number');
        expect(typeof data.insights.attributionCoveragePct).toBe('number');
        expect(typeof data.insights.viewTrendMode).toBe('string');
        expect(typeof data.funnel.cardClicksInApp).toBe('number');
        expect(typeof data.funnel.detailViewsDirect).toBe('number');
    });

    it('sets staleRollups when rollups are older than the threshold', async () => {
        const staleTime = new Date(Date.now() - (120 * 60 * 1000)).toISOString();
        getRollupSummaryMock.mockResolvedValue(createRollupSummary({
            viewCount: 40,
            listingViews: 15,
            lastUpdatedAt: staleTime,
        }));

        const { data } = await getAnalyticsOverview(31, { bypassCache: true });
        expect(data.insights.healthFlags.staleRollups).toBe(true);
        expect(data.insights.rollupAgeMinutes).toBeGreaterThan(45);
    });

    it('sets inAppClickCollapse on detail-view overage with unattributed traffic', async () => {
        getRollupSummaryMock.mockResolvedValue(createRollupSummary({
            viewCount: 200,
            listingViews: 120,
            lastUpdatedAt: new Date().toISOString(),
        }));
        getFunnelAttributionSplitMock.mockResolvedValue({
            totalCardClicks: 150,
            cardClicksInApp: 30,
            detailViewsDirect: 0,
            detailViewsUnattributed: 120,
        });

        const { data } = await getAnalyticsOverview(32, { bypassCache: true });

        expect(data.insights.anomaly).toBe(true);
        expect(data.insights.healthFlags.inAppClickCollapse).toBe(true);
    });

    it('does not set inAppClickCollapse for direct-heavy detail traffic with no in-app flow', async () => {
        getRollupSummaryMock.mockResolvedValue(createRollupSummary({
            viewCount: 200,
            listingViews: 120,
            lastUpdatedAt: new Date().toISOString(),
        }));
        getFunnelAttributionSplitMock.mockResolvedValue({
            totalCardClicks: 10,
            cardClicksInApp: 0,
            detailViewsDirect: 180,
            detailViewsUnattributed: 20,
        });

        const { data } = await getAnalyticsOverview(30, { bypassCache: true });

        expect(data.insights.anomaly).toBe(false);
        expect(data.insights.healthFlags.inAppClickCollapse).toBe(false);
        expect(data.funnel.detailViews).toBe(0);
        expect(data.funnel.detailViewsAdjusted).toBe(0);
        expect(data.funnel.detailViewsDirect).toBe(180);
    });

    it('sets viewTrendMode to baseline when previous window has zero views', async () => {
        getDailyRollupsMock.mockResolvedValue(
            createDailyRollups(14, (index) => (index < 7 ? 0 : 3))
        );
        getRollupSummaryMock.mockResolvedValue(createRollupSummary({
            viewCount: 21,
            listingViews: 12,
            lastUpdatedAt: new Date().toISOString(),
        }));

        const { data } = await getAnalyticsOverview(30, { bypassCache: true });

        expect(data.insights.viewTrendMode).toBe('baseline');
        expect(data.insights.viewTrendPct).toBe(100);
    });
});
