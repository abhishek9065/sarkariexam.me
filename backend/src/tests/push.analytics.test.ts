import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { updateOneMock, recordAnalyticsEventMock } = vi.hoisted(() => ({
    updateOneMock: vi.fn().mockResolvedValue({ acknowledged: true }),
    recordAnalyticsEventMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../middleware/auth.js', () => ({
    optionalAuth: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../services/cosmosdb.js', () => ({
    getCollection: vi.fn(() => ({
        updateOne: updateOneMock,
    })),
}));

vi.mock('../services/analytics.js', () => ({
    recordAnalyticsEvent: recordAnalyticsEventMock,
}));

vi.mock('../config.js', () => ({
    config: {
        vapidPublicKey: 'test-vapid-key',
    },
}));

import pushRouter from '../routes/push.js';

describe('push route analytics tracking', () => {
    const app = express();
    app.use(express.json());
    app.use('/api/push', pushRouter);

    beforeEach(() => {
        vi.clearAllMocks();
        updateOneMock.mockResolvedValue({ acknowledged: true });
        recordAnalyticsEventMock.mockResolvedValue(undefined);
    });

    it('records attempt and failure events for invalid payloads', async () => {
        const response = await request(app)
            .post('/api/push/subscribe?source=notification_prompt')
            .send({});

        expect(response.status).toBe(400);
        expect(recordAnalyticsEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'push_subscribe_attempt',
                metadata: expect.objectContaining({
                    source: 'push',
                    sourceClass: 'direct',
                }),
            })
        );
        expect(recordAnalyticsEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'push_subscribe_failure',
                metadata: expect.objectContaining({
                    reason: 'invalid_payload',
                }),
            })
        );
    });

    it('records attempt and success events on successful subscription', async () => {
        const response = await request(app)
            .post('/api/push/subscribe?source=notification_prompt')
            .send({
                endpoint: 'https://example.com/push/subscription/1',
                keys: {
                    p256dh: 'test-p256dh',
                    auth: 'test-auth',
                },
            });

        expect(response.status).toBe(200);
        expect(updateOneMock).toHaveBeenCalledTimes(1);
        expect(recordAnalyticsEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'push_subscribe_attempt',
            })
        );
        expect(recordAnalyticsEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'push_subscribe_success',
            })
        );
    });
});
