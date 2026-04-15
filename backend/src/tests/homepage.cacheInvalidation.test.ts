import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import announcementsRouter from '../routes/announcements.js';
import { invalidateAnnouncementCaches } from '../services/cacheInvalidation.js';
import { invalidateCache } from '../utils/cache.js';

const {
    findListingCardsMock,
    recordAnalyticsEventMock,
} = vi.hoisted(() => ({
    findListingCardsMock: vi.fn(),
    recordAnalyticsEventMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../models/announcements.postgres.js', () => ({
    default: {
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

function makeHomepageSection(version: string, type: string, postedAt: string) {
    return {
        data: [
            {
                id: `${version}-${type}`,
                title: `${version.toUpperCase()} ${type} item`,
                slug: `${version}-${type}-item`,
                type,
                category: type,
                organization: 'Mock Board',
                postedAt,
            },
        ],
        nextCursor: null,
        hasMore: false,
    };
}

describe('homepage feed cache invalidation', () => {
    const app = express();
    app.use(express.json());
    app.use('/api/announcements', announcementsRouter);

    beforeEach(() => {
        invalidateCache();
        vi.clearAllMocks();
        recordAnalyticsEventMock.mockResolvedValue(undefined);

        const versionOne = [
            makeHomepageSection('v1', 'job', '2026-03-01T00:00:00.000Z'),
            makeHomepageSection('v1', 'result', '2026-03-02T00:00:00.000Z'),
            makeHomepageSection('v1', 'admit-card', '2026-03-03T00:00:00.000Z'),
            makeHomepageSection('v1', 'answer-key', '2026-03-04T00:00:00.000Z'),
            makeHomepageSection('v1', 'syllabus', '2026-03-05T00:00:00.000Z'),
            makeHomepageSection('v1', 'admission', '2026-03-06T00:00:00.000Z'),
        ];
        const versionTwo = [
            makeHomepageSection('v2', 'job', '2026-03-07T00:00:00.000Z'),
            makeHomepageSection('v2', 'result', '2026-03-08T00:00:00.000Z'),
            makeHomepageSection('v2', 'admit-card', '2026-03-09T00:00:00.000Z'),
            makeHomepageSection('v2', 'answer-key', '2026-03-10T00:00:00.000Z'),
            makeHomepageSection('v2', 'syllabus', '2026-03-11T00:00:00.000Z'),
            makeHomepageSection('v2', 'admission', '2026-03-12T00:00:00.000Z'),
        ];

        for (const result of [...versionOne, ...versionTwo]) {
            findListingCardsMock.mockResolvedValueOnce(result);
        }
    });

    it('serves fresh homepage data immediately after announcement cache invalidation', async () => {
        const first = await request(app).get('/api/announcements/homepage');
        const cached = await request(app).get('/api/announcements/homepage');

        expect(first.status).toBe(200);
        expect(first.headers['x-cache']).toBe('MISS');
        expect(first.body.data.latest[0].title).toBe('V1 admission item');

        expect(cached.status).toBe(200);
        expect(String(cached.headers['x-cache'] || '')).toContain('HIT');
        expect(cached.body.data.latest[0].title).toBe('V1 admission item');
        expect(findListingCardsMock).toHaveBeenCalledTimes(6);

        await invalidateAnnouncementCaches();

        const refreshed = await request(app).get('/api/announcements/homepage');

        expect(refreshed.status).toBe(200);
        expect(refreshed.headers['x-cache']).toBe('MISS');
        expect(refreshed.body.data.latest[0].title).toBe('V2 admission item');
        expect(findListingCardsMock).toHaveBeenCalledTimes(12);
        expect(refreshed.headers['x-cache-key']).not.toBe(first.headers['x-cache-key']);
    });
});
