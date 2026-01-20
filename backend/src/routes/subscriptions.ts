import { Router } from 'express';
import { randomBytes } from 'crypto';
import { z } from 'zod';

import { getCollection } from '../services/cosmosdb.js';
import { isEmailConfigured, sendVerificationEmail } from '../services/email.js';

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

const router = Router();
const collection = () => getCollection<SubscriptionDoc>('subscriptions');

const subscriptionSchema = z.object({
    email: z.string().email().toLowerCase().trim(),
    categories: z.array(z.string()).optional(),
    frequency: z.enum(['instant', 'daily', 'weekly']).optional(),
});

function normalizeCategories(categories?: string[]): string[] {
    if (!categories || categories.length === 0) return [];
    return Array.from(new Set(categories.map(cat => cat.trim()).filter(Boolean)));
}

// Create or update subscription
router.post('/', async (req, res) => {
    const parseResult = subscriptionSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const data = parseResult.data;
    const email = data.email;
    const categories = normalizeCategories(data.categories);
    const frequency = data.frequency ?? 'daily';
    const emailConfigured = isEmailConfigured();

    try {
        const now = new Date();
        const existing = await collection().findOne({ email });

        if (!existing) {
            const verified = !emailConfigured;
            const verificationToken = verified ? undefined : randomBytes(24).toString('hex');
            const unsubscribeToken = randomBytes(24).toString('hex');

            const doc: SubscriptionDoc = {
                email,
                categories,
                frequency,
                verified,
                verificationToken,
                unsubscribeToken,
                isActive: true,
                createdAt: now,
                updatedAt: now,
            };

            await collection().insertOne(doc as any);

            if (!verified && verificationToken) {
                await sendVerificationEmail(email, verificationToken, categories);
            }

            return res.json({
                data: { verified },
                message: verified
                    ? 'Subscription created'
                    : 'Subscription created. Please verify your email.',
            });
        }

        let verified = existing.verified;
        let verificationToken = existing.verificationToken;

        if (!verified && !emailConfigured) {
            verified = true;
            verificationToken = undefined;
        } else if (!verified && emailConfigured && !verificationToken) {
            verificationToken = randomBytes(24).toString('hex');
        }

        const updateSet: Partial<SubscriptionDoc> = {
            categories,
            frequency,
            verified,
            isActive: true,
            updatedAt: now,
        };

        if (verificationToken) {
            updateSet.verificationToken = verificationToken;
        }

        const updateOps: any = { $set: updateSet };
        if (verified && existing.verificationToken) {
            updateOps.$unset = { verificationToken: '' };
        }

        await collection().updateOne({ email }, updateOps);

        if (!verified && verificationToken) {
            await sendVerificationEmail(email, verificationToken, categories);
        }

        return res.json({
            data: { verified },
            message: verified
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
        const result = await collection().findOneAndUpdate(
            { verificationToken: token, isActive: true },
            { $set: { verified: true, updatedAt: new Date() }, $unset: { verificationToken: '' } },
            { returnDocument: 'after' }
        );

        if (!result.value) {
            return res.status(404).json({ error: 'Invalid or expired token' });
        }

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
        const result = await collection().findOneAndUpdate(
            { unsubscribeToken: token },
            { $set: { isActive: false, updatedAt: new Date() } },
            { returnDocument: 'after' }
        );

        if (!result.value) {
            return res.status(404).json({ error: 'Invalid token' });
        }

        return res.json({ message: 'Unsubscribed successfully' });
    } catch (error) {
        console.error('Unsubscribe error:', error);
        return res.status(500).json({ error: 'Failed to unsubscribe' });
    }
});

export default router;
