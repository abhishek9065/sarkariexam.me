import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { invalidateCache } from '../utils/cache.js';

const {
    findBySlugMock,
    incrementViewCountMock,
    recordAnnouncementViewMock,
    recordAnalyticsEventMock,
} = vi.hoisted(() => ({
    findBySlugMock: vi.fn(),
    incrementViewCountMock: vi.fn().mockResolvedValue(undefined),
    recordAnnouncementViewMock: vi.fn().mockResolvedValue(undefined),
    recordAnalyticsEventMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../models/announcements.mongo.js', () => ({
    AnnouncementModelMongo: {
        findBySlug: findBySlugMock,
        incrementViewCount: incrementViewCountMock,
    },
}));

vi.mock('../services/analytics.js', () => ({
    getTopSearches: vi.fn().mockResolvedValue([]),
    recordAnnouncementView: recordAnnouncementViewMock,
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

describe('announcement analytics event contract', () => {
    const app = express();
    app.use(express.json());
    app.use('/api/announcements', announcementsRouter);

    beforeEach(() => {
        invalidateCache();
        vi.clearAllMocks();
        findBySlugMock.mockResolvedValue({
            id: 'a1',
            slug: 'upsc-notification-2026',
            title: 'UPSC Notification 2026',
            type: 'job',
            category: 'Central Government',
        });
    });

    it('records announcement_view and card_click for in-app traffic', async () => {
        const response = await request(app)
            .get('/api/announcements/upsc-notification-2026?source=home_box_jobs');

        expect(response.status).toBe(200);
        expect(recordAnnouncementViewMock).toHaveBeenCalledTimes(1);
        expect(recordAnnouncementViewMock).toHaveBeenCalledWith(
            'a1',
            expect.objectContaining({
                source: 'home',
                sourceClass: 'in_app',
            })
        );

        const events = recordAnalyticsEventMock.mock.calls.map(([event]) => event);
        expect(events.some((event: any) => event?.type === 'card_click')).toBe(true);
    });

    it('records announcement_view but skips card_click for direct traffic', async () => {
        const response = await request(app)
            .get('/api/announcements/upsc-notification-2026?source=direct');

        expect(response.status).toBe(200);
        expect(recordAnnouncementViewMock).toHaveBeenCalledTimes(1);
        expect(recordAnnouncementViewMock).toHaveBeenCalledWith(
            'a1',
            expect.objectContaining({
                source: 'direct',
                sourceClass: 'direct',
            })
        );

        const events = recordAnalyticsEventMock.mock.calls.map(([event]) => event);
        expect(events.some((event: any) => event?.type === 'card_click')).toBe(false);
    });
});
