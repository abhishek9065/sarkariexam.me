import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { invalidateCache } from '../utils/cache.js';

const {
    findListingCardsMock,
    recordAnalyticsEventMock,
} = vi.hoisted(() => ({
    findListingCardsMock: vi.fn(),
    recordAnalyticsEventMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../models/announcements.mongo.js', () => ({
    AnnouncementModelMongo: {
        findListingCards: findListingCardsMock,
    },
}));

vi.mock('../services/analytics.js', () => ({
    getTopSearches: vi.fn().mockResolvedValue([]),
    recordAnnouncementView: vi.fn().mockResolvedValue(undefined),
    recordAnalyticsEvent: recordAnalyticsEventMock,
}));

vi.mock('../middleware/auth.js', () => ({
    authenticateToken: (_req: any, _res: any, next: any) => next(),
    requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../services/cacheInvalidation.js', () => ({
    invalidateAnnouncementCaches: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/subscriberDispatch.js', () => ({
    dispatchAnnouncementToSubscribers: vi.fn().mockResolvedValue({
        matched: 0,
        sent: 0,
        skipped: 0,
        frequency: 'instant',
    }),
}));

vi.mock('../services/telegram.js', () => ({
    sendAnnouncementNotification: vi.fn().mockResolvedValue(false),
}));

import announcementsRouter from '../routes/announcements.js';

describe('announcements v3 cards cache analytics', () => {
    const app = express();
    app.use(express.json());
    app.use('/api/announcements', announcementsRouter);

    beforeEach(() => {
        invalidateCache();
        vi.clearAllMocks();
        recordAnalyticsEventMock.mockResolvedValue(undefined);
        findListingCardsMock.mockResolvedValue({
            data: [
                {
                    id: 'a1',
                    title: 'UPSC Recruitment 2026',
                    slug: 'upsc-recruitment-2026',
                    type: 'job',
                    category: 'Central Government',
                    organization: 'UPSC',
                },
            ],
            nextCursor: null,
            hasMore: false,
        });
    });

    it('emits listing analytics on cache misses and cache hits for /v3/cards', async () => {
        const first = await request(app).get('/api/announcements/v3/cards?type=job&source=home');
        const second = await request(app).get('/api/announcements/v3/cards?type=job&source=home');

        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
        expect(first.headers['x-cache']).toBe('MISS');
        expect(String(second.headers['x-cache'] || '')).toContain('HIT');
        expect(findListingCardsMock).toHaveBeenCalledTimes(1);

        // onHit analytics are scheduled async by cache middleware.
        await new Promise((resolve) => setTimeout(resolve, 0));

        const listingViewCalls = recordAnalyticsEventMock.mock.calls
            .map(([arg]) => arg)
            .filter((entry: any) => entry?.type === 'listing_view');

        expect(listingViewCalls.length).toBeGreaterThanOrEqual(2);
        expect(listingViewCalls[0]?.metadata?.count).toBe(1);
        expect(listingViewCalls[1]?.metadata?.count).toBe(1);
    });
});
