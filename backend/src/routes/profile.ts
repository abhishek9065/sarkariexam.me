import { Router } from 'express';
import { z } from 'zod';

import { authenticateToken } from '../middleware/auth.js';
import { getCollection } from '../services/cosmosdb.js';
import { AnnouncementModelMongo } from '../models/announcements.mongo.js';

interface UserProfileDoc {
    userId: string;
    preferredCategories: string[];
    preferredQualifications: string[];
    preferredLocations: string[];
    preferredOrganizations: string[];
    ageGroup: string | null;
    educationLevel: string | null;
    experienceYears: number;
    emailNotifications: boolean;
    pushNotifications: boolean;
    notificationFrequency: 'instant' | 'daily' | 'weekly';
    profileComplete: boolean;
    onboardingCompleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const router = Router();
const collection = () => getCollection<UserProfileDoc>('user_profiles');

const profileUpdateSchema = z.object({
    preferredCategories: z.array(z.string()).optional(),
    preferredQualifications: z.array(z.string()).optional(),
    preferredLocations: z.array(z.string()).optional(),
    preferredOrganizations: z.array(z.string()).optional(),
    ageGroup: z.string().nullable().optional(),
    educationLevel: z.string().nullable().optional(),
    experienceYears: z.number().int().min(0).optional(),
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    notificationFrequency: z.enum(['instant', 'daily', 'weekly']).optional(),
    profileComplete: z.boolean().optional(),
    onboardingCompleted: z.boolean().optional(),
});

const QUALIFICATIONS = [
    '10th Pass',
    '12th Pass',
    'ITI',
    'Diploma',
    'Graduate',
    'Post Graduate',
    'PhD',
];

const AGE_GROUPS = [
    '18-21',
    '22-25',
    '26-30',
    '31-35',
    '36-40',
    '40+',
];

const EDUCATION_LEVELS = [
    'High School',
    'Intermediate',
    'Diploma',
    'Graduate',
    'Post Graduate',
    'PhD',
];

function formatProfile(doc: any) {
    const { _id, ...rest } = doc;
    return { id: _id?.toString?.() || _id, ...rest };
}

const LOCATIONS = [
    'All India',
    'Andhra Pradesh', 'Bihar', 'Delhi', 'Gujarat', 'Haryana',
    'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
    'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana',
    'Uttar Pradesh', 'West Bengal',
];

async function getOrCreateProfile(userId: string) {
    const existing = await collection().findOne({ userId });
    if (existing) return existing;

    const now = new Date();
    const profile: UserProfileDoc = {
        userId,
        preferredCategories: [],
        preferredQualifications: [],
        preferredLocations: [],
        preferredOrganizations: [],
        ageGroup: null,
        educationLevel: null,
        experienceYears: 0,
        emailNotifications: true,
        pushNotifications: false,
        notificationFrequency: 'daily',
        profileComplete: false,
        onboardingCompleted: false,
        createdAt: now,
        updatedAt: now,
    };

    const result = await collection().insertOne(profile as any);
    return { ...profile, _id: result.insertedId };
}

// Get profile
router.get('/', authenticateToken, async (req, res) => {
    try {
        const profile = await getOrCreateProfile(req.user!.userId);
        return res.json({ data: formatProfile(profile as any) });
    } catch (error) {
        console.error('Profile fetch error:', error);
        return res.status(500).json({ error: 'Failed to load profile' });
    }
});

// Update profile
router.put('/', authenticateToken, async (req, res) => {
    const parseResult = profileUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    try {
        const now = new Date();
        const update = { ...parseResult.data, updatedAt: now };

        await collection().updateOne(
            { userId: req.user!.userId },
            { $set: update, $setOnInsert: { createdAt: now } },
            { upsert: true }
        );

        const profile = await getOrCreateProfile(req.user!.userId);
        return res.json({ data: formatProfile(profile as any) });
    } catch (error) {
        console.error('Profile update error:', error);
        return res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Profile options
router.get('/options', async (_req, res) => {
    try {
        const [categories, organizations] = await Promise.all([
            AnnouncementModelMongo.getCategories(),
            AnnouncementModelMongo.getOrganizations(),
        ]);

        return res.json({
            data: {
                categories,
                qualifications: QUALIFICATIONS,
                ageGroups: AGE_GROUPS,
                educationLevels: EDUCATION_LEVELS,
                notificationFrequencies: ['instant', 'daily', 'weekly'],
                locations: LOCATIONS,
                organizations,
            }
        });
    } catch (error) {
        console.error('Profile options error:', error);
        return res.status(500).json({ error: 'Failed to load options' });
    }
});

// Recommendations
router.get('/recommendations', authenticateToken, async (req, res) => {
    try {
        const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
        const profile = await getOrCreateProfile(req.user!.userId);
        const announcements = await AnnouncementModelMongo.findAll({ limit: 200 });

        const scored = announcements.map(item => {
            let score = 0;
            const reasons: Record<string, number> = {};

            if (profile.preferredCategories.includes(item.category)) {
                score += 40;
                reasons.category = 40;
            }

            if (profile.preferredOrganizations.includes(item.organization)) {
                score += 20;
                reasons.organization = 20;
            }

            if (profile.preferredLocations.includes(item.location || '')) {
                score += 20;
                reasons.location = 20;
            }

            if (profile.preferredQualifications.some(q => (item.minQualification || '').toLowerCase().includes(q.toLowerCase()))) {
                score += 20;
                reasons.qualification = 20;
            }

            return { item, score, reasons };
        });

        const matches = scored
            .filter(entry => entry.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(entry => ({
                ...entry.item,
                matchScore: entry.score,
                matchReasons: entry.reasons,
            }));

        return res.json({ data: matches });
    } catch (error) {
        console.error('Recommendations error:', error);
        return res.status(500).json({ error: 'Failed to load recommendations' });
    }
});

export default router;
