import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import announcementsRouter from '../routes/announcements.js';
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

describe('homepage announcement feed', () => {
    const app = express();
    app.use(express.json());
    app.use('/api/announcements', announcementsRouter);

    beforeEach(() => {
        invalidateCache();
        vi.clearAllMocks();
        recordAnalyticsEventMock.mockResolvedValue(undefined);
    });

    it('returns deduped latest items and cached section payloads for /homepage', async () => {
        const sectionResults = [
            {
                data: [
                    {
                        id: 'shared-1',
                        title: 'Shared Item',
                        slug: 'shared-item',
                        type: 'job',
                        category: 'Jobs',
                        organization: 'UPSC',
                        postedAt: '2026-03-01T00:00:00.000Z',
                    },
                ],
                nextCursor: null,
                hasMore: false,
            },
            {
                data: [
                    {
                        id: 'result-1',
                        title: 'Result Item',
                        slug: 'result-item',
                        type: 'result',
                        category: 'Results',
                        organization: 'SSC',
                        postedAt: '2026-03-03T00:00:00.000Z',
                    },
                ],
                nextCursor: null,
                hasMore: false,
            },
            {
                data: [
                    {
                        id: 'shared-1',
                        title: 'Shared Item',
                        slug: 'shared-item',
                        type: 'admit-card',
                        category: 'Admit',
                        organization: 'UPSC',
                        postedAt: '2026-03-02T00:00:00.000Z',
                    },
                ],
                nextCursor: null,
                hasMore: false,
            },
            { data: [], nextCursor: null, hasMore: false },
            { data: [], nextCursor: null, hasMore: false },
            { data: [], nextCursor: null, hasMore: false },
        ];

        for (const result of sectionResults) {
            findListingCardsMock.mockResolvedValueOnce(result);
        }

        const first = await request(app).get('/api/announcements/homepage');
        const second = await request(app).get('/api/announcements/homepage');

        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
        expect(first.headers['x-cache']).toBe('MISS');
        expect(String(second.headers['x-cache'] || '')).toContain('HIT');
        expect(findListingCardsMock).toHaveBeenCalledTimes(6);

        expect(first.body.data.sections.job).toHaveLength(1);
        expect(first.body.data.sections.result).toHaveLength(1);
        expect(first.body.data.sections['admit-card']).toHaveLength(1);
        expect(first.body.data.sections['answer-key']).toEqual([]);
        expect(first.body.data.sections.syllabus).toEqual([]);
        expect(first.body.data.sections.admission).toEqual([]);
        expect(first.body.data.latest.map((entry: { id: string }) => entry.id)).toEqual(['result-1', 'shared-1']);
        expect(typeof first.body.data.generatedAt).toBe('string');

        await new Promise((resolve) => setTimeout(resolve, 0));

        const listingViewCalls = recordAnalyticsEventMock.mock.calls
            .map(([arg]) => arg)
            .filter((entry: any) => entry?.type === 'listing_view');

        expect(listingViewCalls.length).toBeGreaterThanOrEqual(2);
        expect(listingViewCalls[0]?.metadata?.source).toBe('home_feed');
        expect(listingViewCalls[0]?.metadata?.count).toBe(2);
    });

    it('returns stable empty arrays for every homepage section when no content exists', async () => {
        for (let index = 0; index < 6; index += 1) {
            findListingCardsMock.mockResolvedValueOnce({
                data: [],
                nextCursor: null,
                hasMore: false,
            });
        }

        const response = await request(app).get('/api/announcements/homepage');

        expect(response.status).toBe(200);
        expect(response.body.data.latest).toEqual([]);
        expect(response.body.data.sections).toEqual({
            job: [],
            result: [],
            'admit-card': [],
            'answer-key': [],
            syllabus: [],
            admission: [],
        });
    });

    it('returns partial homepage data when one section lookup fails', async () => {
        findListingCardsMock
            .mockResolvedValueOnce({
                data: [
                    {
                        id: 'job-1',
                        title: 'Job Item',
                        slug: 'job-item',
                        type: 'job',
                        category: 'Jobs',
                        organization: 'UPSC',
                        postedAt: '2026-03-03T00:00:00.000Z',
                    },
                ],
                nextCursor: null,
                hasMore: false,
            })
            .mockRejectedValueOnce(new Error('result lookup failed'))
            .mockResolvedValueOnce({
                data: [
                    {
                        id: 'admit-1',
                        title: 'Admit Item',
                        slug: 'admit-item',
                        type: 'admit-card',
                        category: 'Admit',
                        organization: 'SSC',
                        postedAt: '2026-03-02T00:00:00.000Z',
                    },
                ],
                nextCursor: null,
                hasMore: false,
            })
            .mockResolvedValueOnce({ data: [], nextCursor: null, hasMore: false })
            .mockResolvedValueOnce({ data: [], nextCursor: null, hasMore: false })
            .mockResolvedValueOnce({ data: [], nextCursor: null, hasMore: false });

        const response = await request(app).get('/api/announcements/homepage');

        expect(response.status).toBe(200);
        expect(findListingCardsMock).toHaveBeenCalledTimes(6);
        expect(response.body.data.sections.job).toHaveLength(1);
        expect(response.body.data.sections.result).toEqual([]);
        expect(response.body.data.sections['admit-card']).toHaveLength(1);
        expect(response.body.data.latest.map((entry: { id: string }) => entry.id)).toEqual(['job-1', 'admit-1']);
    });
});
