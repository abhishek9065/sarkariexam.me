import { Router } from 'express';
import { rateLimit as expressRateLimit } from 'express-rate-limit';

import { alertSubscriptionPublicSchema } from '../content/types.js';
import { rateLimit } from '../middleware/rateLimit.js';
import AlertSubscriptionModelPostgres from '../models/alertSubscriptions.postgres.js';
import { recordAnalyticsEvent } from '../services/analytics.js';
import { isEmailConfigured, sendVerificationEmail } from '../services/email.js';

const router = Router();

router.use(expressRateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
}));

function buildPreferenceSummary(data: {
    categories?: string[];
    states?: string[];
    organizations?: string[];
    qualifications?: string[];
    postTypes?: string[];
}) {
    return [
        ...(data.categories || []),
        ...(data.states || []).map((item) => `State: ${item}`),
        ...(data.organizations || []).map((item) => `Organization: ${item}`),
        ...(data.qualifications || []).map((item) => `Qualification: ${item}`),
        ...(data.postTypes || []).map((item) => `Type: ${item}`),
    ];
}

// Create or update subscription
router.post('/', rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 20, keyPrefix: 'subscriptions' }), async (req, res) => {
    const parseResult = alertSubscriptionPublicSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const data = parseResult.data;
    const emailConfigured = isEmailConfigured();

    try {
        const verified = !emailConfigured;
        const subscription = await AlertSubscriptionModelPostgres.upsert({
            email: data.email,
            categories: data.categories,
            states: data.states,
            organizations: data.organizations,
            qualifications: data.qualifications,
            postTypes: data.postTypes,
            frequency: data.frequency,
            source: data.source || 'public-api',
            verified,
        });

        if (!subscription) {
            return res.status(500).json({ error: 'Failed to save subscription' });
        }

        if (!subscription.verified && subscription.verificationToken) {
            await sendVerificationEmail(
                subscription.email,
                subscription.verificationToken,
                buildPreferenceSummary(data),
            );
        } else if (subscription.verified) {
            recordAnalyticsEvent({
                type: 'subscription_verify',
                metadata: { source: 'inline' },
            }).catch(console.error);
        }

        return res.json({
            data: { verified: subscription.verified },
            message: subscription.verified
                ? 'Subscription updated'
                : 'Subscription updated. Please verify your email.',
        });
    } catch (error) {
        console.error('Subscription error:', error);
        return res.status(500).json({ error: 'Failed to save subscription' });
    }
});

// Verify subscription
router.get('/verify', async (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }

    try {
        const doc = await AlertSubscriptionModelPostgres.verifyByToken(token);
        if (!doc) {
            return res.status(404).json({ error: 'Invalid or expired token' });
        }

        recordAnalyticsEvent({
            type: 'subscription_verify',
            metadata: { source: 'token' },
        }).catch(console.error);

        return res.json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error('Verify subscription error:', error);
        return res.status(500).json({ error: 'Failed to verify subscription' });
    }
});

// Unsubscribe
router.get('/unsubscribe', async (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }

    try {
        const doc = await AlertSubscriptionModelPostgres.unsubscribeByToken(token);
        if (!doc) {
            return res.status(404).json({ error: 'Invalid token' });
        }

        recordAnalyticsEvent({
            type: 'subscription_unsubscribe',
            metadata: { source: 'token' },
        }).catch(console.error);

        return res.json({ message: 'Unsubscribed successfully' });
    } catch (error) {
        console.error('Unsubscribe error:', error);
        return res.status(500).json({ error: 'Failed to unsubscribe' });
    }
});

export default router;
