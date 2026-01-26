import { Router } from 'express';
import { z } from 'zod';

import { authenticateToken } from '../middleware/auth.js';
import { AnnouncementModelMongo } from '../models/announcements.mongo.js';
import { recordAnalyticsEvent } from '../services/analytics.js';
import { getCollection, isValidObjectId, toObjectId } from '../services/cosmosdb.js';
import { ContentType } from '../types.js';

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
    alertWindowDays: number;
    alertMaxItems: number;
    profileComplete: boolean;
    onboardingCompleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}


interface SavedSearchDoc {
    userId: string;
    name: string;
    query: string;
    filters?: {
        type?: ContentType;
        category?: string;
        organization?: string;
        location?: string;
        qualification?: string;
        salaryMin?: number;
        salaryMax?: number;
    };
    notificationsEnabled: boolean;
    frequency: 'instant' | 'daily' | 'weekly';
    lastNotifiedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

interface NotificationDoc {
    userId: string;
    announcementId: string;
    title: string;
    type: ContentType;
    slug?: string;
    organization?: string;
    source: string;
    createdAt: Date;
    readAt?: Date | null;
}

const router = Router();
const collection = () => getCollection<UserProfileDoc>('user_profiles');
const savedSearchesCollection = () => getCollection<SavedSearchDoc>('saved_searches');
const notificationsCollection = () => getCollection<NotificationDoc>('user_notifications');

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
    alertWindowDays: z.number().int().min(1).max(30).optional(),
    alertMaxItems: z.number().int().min(1).max(20).optional(),
    profileComplete: z.boolean().optional(),
    onboardingCompleted: z.boolean().optional(),
});


const savedSearchFilterSchema = z.object({
    type: z.enum(['job', 'result', 'admit-card', 'syllabus', 'answer-key', 'admission'] as [ContentType, ...ContentType[]]).optional(),
    category: z.string().trim().optional(),
    organization: z.string().trim().optional(),
    location: z.string().trim().optional(),
    qualification: z.string().trim().optional(),
    salaryMin: z.coerce.number().min(0).optional(),
    salaryMax: z.coerce.number().min(0).optional(),
}).superRefine((filters, ctx) => {
    if (filters.salaryMin !== undefined && filters.salaryMax !== undefined && filters.salaryMin > filters.salaryMax) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Minimum salary must be less than or equal to maximum salary',
            path: ['salaryMin'],
        });
    }
});

const savedSearchBaseSchema = z.object({
    name: z.string().trim().min(3).max(80),
    query: z.string().trim().max(200).optional().default(''),
    filters: savedSearchFilterSchema.optional(),
    notificationsEnabled: z.boolean().optional().default(true),
    frequency: z.enum(['instant', 'daily', 'weekly']).optional().default('daily'),
});

const savedSearchSchema = savedSearchBaseSchema.superRefine((data, ctx) => {
    const hasQuery = Boolean(data.query && data.query.trim());
    const hasFilters = Boolean(data.filters && Object.values(data.filters).some(hasFilterValue));
    if (!hasQuery && !hasFilters) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Provide a keyword or at least one filter',
            path: ['query'],
        });
    }
});

const savedSearchUpdateSchema = savedSearchBaseSchema.partial().superRefine((data, ctx) => {
    const hasQuery = data.query !== undefined
        ? Boolean(data.query && data.query.trim())
        : false;
    const hasFilters = data.filters !== undefined
        ? Boolean(data.filters && Object.values(data.filters).some(hasFilterValue))
        : false;
    const isUpdatingCriteria = data.query !== undefined || data.filters !== undefined;
    if (isUpdatingCriteria && !hasQuery && !hasFilters) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Provide a keyword or at least one filter',
            path: ['query'],
        });
    }
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


function formatSavedSearch(doc: any) {
    const { _id, ...rest } = doc;
    return { id: _id?.toString?.() || _id, ...rest };
}

function formatNotification(doc: any) {
    const { _id, ...rest } = doc;
    return { id: _id?.toString?.() || _id, ...rest };
}

function cleanFilterValue(value?: string) {
    if (!value) return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}

function cleanNumberValue(value?: number | null) {
    if (value === undefined || value === null) return undefined;
    return Number.isFinite(value) ? value : undefined;
}

function hasFilterValue(value: unknown) {
    if (value === undefined || value === null) return false;
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'string') return value.trim().length > 0;
    return Boolean(value);
}

function sanitizeFilters(filters?: SavedSearchDoc['filters']) {
    if (!filters) return undefined;
    const cleaned = {
        type: filters.type,
        category: cleanFilterValue(filters.category),
        organization: cleanFilterValue(filters.organization),
        location: cleanFilterValue(filters.location),
        qualification: cleanFilterValue(filters.qualification),
        salaryMin: cleanNumberValue(filters.salaryMin),
        salaryMax: cleanNumberValue(filters.salaryMax),
    };
    return Object.values(cleaned).some(hasFilterValue) ? cleaned : undefined;
}

function getAnnouncementTimestamp(item: { updatedAt?: string | Date; postedAt?: string | Date }) {
    const value = item.updatedAt || item.postedAt;
    if (!value) return 0;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function scoreAnnouncement(profile: UserProfileDoc, item: any) {
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

    return { score, reasons };
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
        alertWindowDays: 7,
        alertMaxItems: 6,
        profileComplete: false,
        onboardingCompleted: false,
        createdAt: now,
        updatedAt: now,
    };

    const result = await collection().insertOne(profile as any);
    return { ...profile, _id: result.insertedId };
}


async function buildSavedSearchMatches(search: SavedSearchDoc, sinceMs: number, limit: number) {
    const filters = sanitizeFilters(search.filters);
    const searchLimit = Math.min(200, Math.max(limit * 4, 50));

    const announcements = await AnnouncementModelMongo.findAll({
        type: filters?.type,
        category: filters?.category,
        organization: filters?.organization,
        location: filters?.location,
        qualification: filters?.qualification,
        salaryMin: filters?.salaryMin,
        salaryMax: filters?.salaryMax,
        search: search.query ? search.query : undefined,
        limit: searchLimit,
    });

    const matches = announcements
        .filter(item => getAnnouncementTimestamp(item) >= sinceMs)
        .slice(0, limit);

    return { matches, totalMatches: matches.length };
}

async function upsertNotifications(userId: string, items: any[], source: string) {
    if (!items.length) return;
    const ops = items.map(item => ({
        updateOne: {
            filter: {
                userId,
                announcementId: String(item.id),
                source,
            },
            update: {
                $setOnInsert: {
                    userId,
                    announcementId: String(item.id),
                    title: item.title,
                    type: item.type,
                    slug: item.slug,
                    organization: item.organization,
                    source,
                    createdAt: new Date(),
                    readAt: null,
                },
            },
            upsert: true,
        }
    }));

    try {
        await notificationsCollection().bulkWrite(ops, { ordered: false });
    } catch (error) {
        console.error('[Notifications] Upsert error:', error);
    }
}

function hasProfilePreferences(profile: UserProfileDoc) {
    return Boolean(
        profile.preferredCategories.length ||
        profile.preferredOrganizations.length ||
        profile.preferredLocations.length ||
        profile.preferredQualifications.length
    );
}

async function getPreferenceAlerts(profile: UserProfileDoc, sinceMs: number, limit: number) {
    if (!hasProfilePreferences(profile)) {
        return { matches: [], totalMatches: 0 };
    }

    const announcements = await AnnouncementModelMongo.findAll({ limit: 200 });
    const scored = announcements.map(item => ({
        item,
        ...scoreAnnouncement(profile, item),
    }));

    const matches = scored
        .filter(entry => entry.score > 0 && getAnnouncementTimestamp(entry.item) >= sinceMs)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(entry => ({
            ...entry.item,
            matchScore: entry.score,
            matchReasons: entry.reasons,
        }));

    return { matches, totalMatches: matches.length };
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


// Saved searches
router.get('/saved-searches', authenticateToken, async (req, res) => {
    try {
        const searches = await savedSearchesCollection()
            .find({ userId: req.user!.userId })
            .sort({ updatedAt: -1 })
            .toArray();

        return res.json({ data: searches.map(formatSavedSearch) });
    } catch (error) {
        console.error('Saved searches fetch error:', error);
        return res.status(500).json({ error: 'Failed to load saved searches' });
    }
});

router.post('/saved-searches', authenticateToken, async (req, res) => {
    const parseResult = savedSearchSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    try {
        const now = new Date();
        const input = parseResult.data;
        const filters = sanitizeFilters(input.filters);

        const doc: SavedSearchDoc = {
            userId: req.user!.userId,
            name: input.name,
            query: input.query?.trim() || '',
            filters,
            notificationsEnabled: input.notificationsEnabled ?? true,
            frequency: input.frequency ?? 'daily',
            lastNotifiedAt: null,
            createdAt: now,
            updatedAt: now,
        };

        const result = await savedSearchesCollection().insertOne(doc as any);
        recordAnalyticsEvent({
            type: 'saved_search_create',
            userId: req.user!.userId,
            metadata: {
                hasQuery: Boolean(doc.query),
                hasFilters: Boolean(doc.filters),
                frequency: doc.frequency,
            },
        }).catch(console.error);
        return res.status(201).json({ data: formatSavedSearch({ ...doc, _id: result.insertedId }) });
    } catch (error) {
        console.error('Saved search create error:', error);
        return res.status(500).json({ error: 'Failed to create saved search' });
    }
});

router.put('/saved-searches/:id', authenticateToken, async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid saved search id' });
    }

    const parseResult = savedSearchUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    try {
        const now = new Date();
        const update: Partial<SavedSearchDoc> & { updatedAt: Date } = { updatedAt: now };

        if (parseResult.data.name !== undefined) {
            update.name = parseResult.data.name.trim();
        }
        if (parseResult.data.query !== undefined) {
            update.query = parseResult.data.query.trim();
        }
        if (parseResult.data.filters !== undefined) {
            update.filters = sanitizeFilters(parseResult.data.filters);
        }
        if (parseResult.data.notificationsEnabled !== undefined) {
            update.notificationsEnabled = parseResult.data.notificationsEnabled;
        }
        if (parseResult.data.frequency !== undefined) {
            update.frequency = parseResult.data.frequency;
        }

        const result = await savedSearchesCollection().updateOne(
            { _id: toObjectId(req.params.id), userId: req.user!.userId },
            { $set: update }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Saved search not found' });
        }

        const updated = await savedSearchesCollection().findOne({ _id: toObjectId(req.params.id), userId: req.user!.userId });
        return res.json({ data: updated ? formatSavedSearch(updated) : null });
    } catch (error) {
        console.error('Saved search update error:', error);
        return res.status(500).json({ error: 'Failed to update saved search' });
    }
});

router.delete('/saved-searches/:id', authenticateToken, async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid saved search id' });
    }

    try {
        const result = await savedSearchesCollection().deleteOne({
            _id: toObjectId(req.params.id),
            userId: req.user!.userId,
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Saved search not found' });
        }

        return res.json({ message: 'Saved search deleted' });
    } catch (error) {
        console.error('Saved search delete error:', error);
        return res.status(500).json({ error: 'Failed to delete saved search' });
    }
});

// Alerts and digest preview
router.get('/alerts', authenticateToken, async (req, res) => {
    try {
        const profile = await getOrCreateProfile(req.user!.userId);
        const windowDays = Math.min(
            30,
            parseInt(req.query.windowDays as string) || profile.alertWindowDays || 7
        );
        const limit = Math.min(
            20,
            parseInt(req.query.limit as string) || profile.alertMaxItems || 5
        );
        const sinceMs = Date.now() - windowDays * 24 * 60 * 60 * 1000;
        const since = new Date(sinceMs);

        const searches = await savedSearchesCollection()
            .find({ userId: req.user!.userId })
            .sort({ updatedAt: -1 })
            .toArray();

        const savedSearches = await Promise.all(
            searches.map(async (search) => ({
                ...formatSavedSearch(search),
                ...(await buildSavedSearchMatches(search, sinceMs, limit)),
            }))
        );

        const preferences = await getPreferenceAlerts(profile, sinceMs, limit);

        await Promise.all([
            ...savedSearches.map(entry => upsertNotifications(req.user!.userId, entry.matches || [], `saved:${entry.id}`)),
            upsertNotifications(req.user!.userId, preferences.matches, 'preferences')
        ]);

        recordAnalyticsEvent({
            type: 'alerts_view',
            userId: req.user!.userId,
            metadata: {
                windowDays,
            },
        }).catch(console.error);

        return res.json({
            data: {
                windowDays,
                since: since.toISOString(),
                savedSearches,
                preferences,
            }
        });
    } catch (error) {
        console.error('Alerts error:', error);
        return res.status(500).json({ error: 'Failed to load alerts' });
    }
});

router.get('/digest-preview', authenticateToken, async (req, res) => {
    try {
        const profile = await getOrCreateProfile(req.user!.userId);
        const windowDays = Math.min(
            30,
            parseInt(req.query.windowDays as string) || profile.alertWindowDays || 7
        );
        const limit = Math.min(
            20,
            parseInt(req.query.limit as string) || profile.alertMaxItems || 8
        );
        const sinceMs = Date.now() - windowDays * 24 * 60 * 60 * 1000;
        const since = new Date(sinceMs);

        const searches = await savedSearchesCollection()
            .find({ userId: req.user!.userId })
            .sort({ updatedAt: -1 })
            .toArray();

        const savedSearches = await Promise.all(
            searches.map(async (search) => ({
                ...formatSavedSearch(search),
                ...(await buildSavedSearchMatches(search, sinceMs, limit)),
            }))
        );

        const preferences = await getPreferenceAlerts(profile, sinceMs, limit);

        const combined = [
            ...savedSearches.flatMap(entry => entry.matches || []),
            ...preferences.matches,
        ];

        const unique = new Map();
        for (const item of combined) {
            const id = item.id;
            if (!id) continue;
            const existing = unique.get(id);
            if (!existing || getAnnouncementTimestamp(item) > getAnnouncementTimestamp(existing)) {
                unique.set(id, item);
            }
        }

        const preview = Array.from(unique.values())
            .sort((a, b) => getAnnouncementTimestamp(b) - getAnnouncementTimestamp(a))
            .slice(0, limit);

        const topCategory = preview.find(item => item.category)?.category || 'updates';
        const subjectA = `${preview.length} new ${topCategory} alerts for you`;
        const subjectB = `Your ${topCategory} digest: ${preview.length} fresh posts`;

        recordAnalyticsEvent({
            type: 'digest_preview',
            userId: req.user!.userId,
            metadata: {
                windowDays,
            },
        }).catch(console.error);

        return res.json({
            data: {
                windowDays,
                since: since.toISOString(),
                generatedAt: new Date().toISOString(),
                totalMatches: unique.size,
                breakdown: {
                    savedSearchMatches: savedSearches.reduce((sum, entry) => sum + (entry.matches?.length || 0), 0),
                    preferenceMatches: preferences.matches.length,
                },
                subjects: {
                    variantA: subjectA,
                    variantB: subjectB,
                },
                preview,
            }
        });
    } catch (error) {
        console.error('Digest preview error:', error);
        return res.status(500).json({ error: 'Failed to load digest preview' });
    }
});

// Notification history (persisted)
router.get('/notifications', authenticateToken, async (req, res) => {
    try {
        const limit = Math.min(50, parseInt(req.query.limit as string) || 12);
        const docs = await notificationsCollection()
            .find({ userId: req.user!.userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();

        const unreadCount = await notificationsCollection().countDocuments({ userId: req.user!.userId, readAt: null });

        return res.json({
            data: docs.map(formatNotification),
            unreadCount,
        });
    } catch (error) {
        console.error('Notifications fetch error:', error);
        return res.status(500).json({ error: 'Failed to load notifications' });
    }
});

router.post('/notifications/read', authenticateToken, async (req, res) => {
    try {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
        const markAll = Boolean(req.body?.all);

        if (!markAll && ids.length === 0) {
            return res.status(400).json({ error: 'Provide ids or set all=true' });
        }

        if (markAll) {
            await notificationsCollection().updateMany(
                { userId: req.user!.userId, readAt: null },
                { $set: { readAt: new Date() } }
            );
            return res.json({ message: 'All notifications marked as read' });
        }

        const objectIds = ids.filter(isValidObjectId).map(toObjectId);
        if (objectIds.length === 0) {
            return res.status(400).json({ error: 'Invalid notification ids' });
        }

        await notificationsCollection().updateMany(
            { _id: { $in: objectIds }, userId: req.user!.userId },
            { $set: { readAt: new Date() } }
        );

        return res.json({ message: 'Notifications marked as read' });
    } catch (error) {
        console.error('Notifications read error:', error);
        return res.status(500).json({ error: 'Failed to update notifications' });
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
