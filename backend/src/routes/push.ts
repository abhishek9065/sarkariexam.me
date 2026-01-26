import { Router } from 'express';
import { z } from 'zod';

import { config } from '../config.js';
import { optionalAuth } from '../middleware/auth.js';
import { getCollection } from '../services/cosmosdb.js';

interface PushSubscriptionDoc {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
    userId?: string;
    createdAt: Date;
    updatedAt: Date;
}

const router = Router();

const subscriptionSchema = z.object({
    endpoint: z.string().url(),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
        p256dh: z.string(),
        auth: z.string(),
    }),
});

const getCollectionRef = () => getCollection<PushSubscriptionDoc>('push_subscriptions');

// Get VAPID public key
router.get('/vapid-public-key', (_req, res) => {
    if (!config.vapidPublicKey) {
        return res.status(503).json({ error: 'Push notifications not configured' });
    }
    return res.json({ publicKey: config.vapidPublicKey });
});

// Save push subscription
router.post('/subscribe', optionalAuth, async (req, res) => {
    const parseResult = subscriptionSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const subscription = parseResult.data;

    try {
        const now = new Date();
        const keys = subscription.keys as { p256dh: string; auth: string };
        await getCollectionRef().updateOne(
            { endpoint: subscription.endpoint },
            {
                $set: {
                    keys,
                    userId: req.user?.userId,
                    updatedAt: now,
                },
                $setOnInsert: {
                    endpoint: subscription.endpoint,
                    createdAt: now,
                },
            },
            { upsert: true }
        );

        return res.json({ message: 'Subscription saved' });
    } catch (error) {
        console.error('[Push] Failed to save subscription:', error);
        if (error instanceof Error) {
            // Check for specific database errors
            if (error.message.includes('duplicate')) {
                return res.status(409).json({ error: 'Subscription already exists' });
            }
            if (error.message.includes('validation')) {
                return res.status(400).json({ error: 'Invalid subscription data' });
            }
        }
        return res.status(500).json({ error: 'Failed to save subscription' });
    }
});

export default router;
