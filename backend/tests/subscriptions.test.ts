import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/server.js';
import { getCollection } from '../src/services/cosmosdb.js';

const describeOrSkip = process.env.SKIP_MONGO_TESTS === 'true' ? describe.skip : describe;

interface SubscriptionDoc {
    email: string;
    categories: string[];
    frequency: 'instant' | 'daily' | 'weekly';
    verified: boolean;
    verificationToken?: string;
    unsubscribeToken: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

describeOrSkip('subscriptions', () => {
    it('verifies and unsubscribes using tokens', async () => {
        const collection = getCollection<SubscriptionDoc>('subscriptions');
        const now = new Date();
        const verificationToken = `verify-${Date.now()}`;
        const unsubscribeToken = `unsub-${Date.now()}`;

        await collection.insertOne({
            email: `sub-${Date.now()}@example.com`,
            categories: ['job'],
            frequency: 'daily',
            verified: false,
            verificationToken,
            unsubscribeToken,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        } as SubscriptionDoc);

        const verifyRes = await request(app)
            .get(`/api/subscriptions/verify?token=${encodeURIComponent(verificationToken)}`)
            .expect(200);

        expect(verifyRes.body?.message).toBeTypeOf('string');

        const unsubscribeRes = await request(app)
            .get(`/api/subscriptions/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`)
            .expect(200);

        expect(unsubscribeRes.body?.message).toBeTypeOf('string');

        const updated = await collection.findOne({ unsubscribeToken });
        expect(updated?.verified).toBe(true);
        expect(updated?.isActive).toBe(false);
    });

    it('returns 404 for invalid tokens', async () => {
        const missingVerify = `missing-verify-${Date.now()}`;
        const missingUnsub = `missing-unsub-${Date.now()}`;

        await request(app)
            .get(`/api/subscriptions/verify?token=${encodeURIComponent(missingVerify)}`)
            .expect(404);

        await request(app)
            .get(`/api/subscriptions/unsubscribe?token=${encodeURIComponent(missingUnsub)}`)
            .expect(404);
    });

});
