import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/server.js';
import { prisma } from '../src/services/postgres/prisma.js';

describe('subscriptions', () => {
    it('verifies and unsubscribes using tokens', async () => {
                const email = `sub-${Date.now()}@example.com`;
        const verificationToken = `verify-${Date.now()}`;
        const unsubscribeToken = `unsub-${Date.now()}`;

                await prisma.subscription.create({
                    data: {
                        email,
            verified: false,
            verificationToken,
            unsubscribeToken,
            isActive: true,
                    },
                });

        const verifyRes = await request(app)
            .get(`/api/subscriptions/verify?token=${encodeURIComponent(verificationToken)}`)
            .expect(200);

        expect(verifyRes.body?.message).toBeTypeOf('string');

        const unsubscribeRes = await request(app)
            .get(`/api/subscriptions/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`)
            .expect(200);

        expect(unsubscribeRes.body?.message).toBeTypeOf('string');

        const updated = await prisma.subscription.findUnique({ where: { unsubscribeToken } });
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
