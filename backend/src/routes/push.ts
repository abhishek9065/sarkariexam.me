import { Router } from 'express';
import { z } from 'zod';

import { config } from '../config.js';
import { optionalAuth } from '../middleware/auth.js';
import { recordAnalyticsEvent } from '../services/analytics.js';
import { normalizeAttribution } from '../services/attribution.js';
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

const pickQueryValue = (value: unknown): string | undefined => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    return undefined;
};

const resolvePushSource = (req: any) => {
    const attribution = normalizeAttribution({
        source: pickQueryValue(req.query.source) || (typeof req.body?.source === 'string' ? req.body.source : undefined),
        utmSource: pickQueryValue(req.query.utm_source),
        medium: pickQueryValue(req.query.medium),
        utmMedium: pickQueryValue(req.query.utm_medium),
        campaign: pickQueryValue(req.query.campaign),
        utmCampaign: pickQueryValue(req.query.utm_campaign),
    });

    return {
        source: attribution.source ?? 'unknown',
        sourceClass: attribution.sourceClass,
        medium: attribution.medium,
        campaign: attribution.campaign,
    };
};

// Get VAPID public key
router.get('/vapid-public-key', (_req, res) => {
    if (!config.vapidPublicKey) {
        return res.status(503).json({ error: 'Push notifications not configured' });
    }
    return res.json({ publicKey: config.vapidPublicKey });
});

// Save push subscription
router.post('/subscribe', optionalAuth, async (req, res) => {
    const source = resolvePushSource(req);
    recordAnalyticsEvent({
        type: 'push_subscribe_attempt',
        userId: req.user?.userId,
        metadata: {
            ...source,
            authenticated: Boolean(req.user?.userId),
        },
    }).catch(console.error);

    const parseResult = subscriptionSchema.safeParse(req.body);
    if (!parseResult.success) {
        recordAnalyticsEvent({
            type: 'push_subscribe_failure',
            userId: req.user?.userId,
            metadata: {
                ...source,
                reason: 'invalid_payload',
            },
        }).catch(console.error);
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

        recordAnalyticsEvent({
            type: 'push_subscribe_success',
            userId: req.user?.userId,
            metadata: {
                ...source,
                authenticated: Boolean(req.user?.userId),
            },
        }).catch(console.error);

        return res.json({ message: 'Subscription saved' });
    } catch (error) {
        console.error('[Push] Failed to save subscription:', error);
        const reason = error instanceof Error ? error.message : 'unknown_error';
        recordAnalyticsEvent({
            type: 'push_subscribe_failure',
            userId: req.user?.userId,
            metadata: {
                ...source,
                reason,
            },
        }).catch(console.error);
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
