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

describe('analytics overview funnel semantics', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        findAllMock.mockResolvedValue([
            { type: 'job', category: 'Central Government', viewCount: 12 },
        ]);
        getRollupSummaryMock.mockResolvedValue(createRollupSummary({
            viewCount: 200,
            listingViews: 120,
            cardClicks: 60,
            lastUpdatedAt: new Date().toISOString(),
        }));
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

    it('uses in-app-attributed detail views for funnel detail stage', async () => {
        getFunnelAttributionSplitMock.mockResolvedValue({
            totalCardClicks: 80,
            cardClicksInApp: 25,
            detailViewsDirect: 120,
            detailViewsUnattributed: 60,
        });

        const { data } = await getAnalyticsOverview(30, { bypassCache: true });

        expect(data.funnel.cardClicks).toBe(25);
        expect(data.funnel.detailViewsRaw).toBe(200);
        expect(data.funnel.detailViewsDirect).toBe(120);
        expect(data.funnel.detailViewsUnattributed).toBe(60);
        expect(data.funnel.detailViews).toBe(20);
        expect(data.funnel.detailViewsAdjusted).toBe(20);
        expect(data.funnel.detailViews).toBeLessThanOrEqual(data.funnel.cardClicks);
        expect(data.insights.healthFlags.inAppClickCollapse).toBe(false);
    });
});
