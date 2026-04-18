import { Router } from 'express';
import { rateLimit as expressRateLimit } from 'express-rate-limit';
import { z } from 'zod';

import { authenticateToken } from '../middleware/auth.js';
import AnnouncementModelPostgres from '../models/announcements.postgres.js';
import ProfileModelPostgres from '../models/profile.postgres.js';
import { recordAnalyticsEvent } from '../services/analytics.js';
import { ContentType, TrackerStatus } from '../types.js';
import { getPathParam } from '../utils/routeParams.js';

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

interface TrackedApplicationDoc {
    userId: string;
    announcementId?: string;
    slug: string;
    type: ContentType;
    title: string;
    organization?: string;
    deadline?: Date | null;
    status: TrackerStatus;
    notes?: string;
    reminderAt?: Date | null;
    trackedAt: Date;
    updatedAt: Date;
}

interface DashboardWidgetPayload {
    trackedCounts: Record<TrackerStatus | 'total', number>;
    upcomingDeadlines: Array<{
        id: string;
        slug: string;
        title: string;
        type: ContentType;
        deadline: string;
        status: TrackerStatus;
        daysRemaining: number;
    }>;
    recommendationCount: number;
    savedSearchMatches: number;
    generatedAt: string;
    windowDays: number;
}

const router = Router();

router.use(expressRateLimit({
    windowMs: 60 * 1000,
    limit: 180,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
}));

function isValidEntityId(value: string): boolean {
    return Boolean(value) && value.length <= 120;
}

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

const trackerStatusSchema = z.enum(['saved', 'applied', 'admit-card', 'exam', 'result'] as [TrackerStatus, ...TrackerStatus[]]);

const trackedApplicationCreateSchema = z.object({
    announcementId: z.string().trim().max(80).optional(),
    slug: z.string().trim().min(1).max(220),
    type: z.enum(['job', 'result', 'admit-card', 'syllabus', 'answer-key', 'admission'] as [ContentType, ...ContentType[]]),
    title: z.string().trim().min(3).max(300),
    organization: z.string().trim().max(200).optional(),
    deadline: z.string().trim().optional().nullable(),
    status: trackerStatusSchema.default('saved'),
    notes: z.string().trim().max(2000).optional(),
    reminderAt: z.string().trim().optional().nullable(),
});

const trackedApplicationPatchSchema = z.object({
    status: trackerStatusSchema.optional(),
    notes: z.string().trim().max(2000).optional(),
    reminderAt: z.string().trim().optional().nullable(),
});

const trackedApplicationImportItemSchema = trackedApplicationCreateSchema.extend({
    trackedAt: z.string().trim().optional(),
    updatedAt: z.string().trim().optional(),
});

const trackedApplicationImportSchema = z.object({
    items: z.array(trackedApplicationImportItemSchema).max(300),
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
    return {
        ...doc,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : doc.createdAt,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : doc.updatedAt,
    };
}


function formatSavedSearch(doc: any) {
    return {
        ...doc,
        lastNotifiedAt: doc.lastNotifiedAt ? new Date(doc.lastNotifiedAt).toISOString() : doc.lastNotifiedAt,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : doc.createdAt,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : doc.updatedAt,
    };
}

function formatNotification(doc: any) {
    return {
        ...doc,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : doc.createdAt,
        readAt: doc.readAt ? new Date(doc.readAt).toISOString() : doc.readAt,
    };
}

function parseOptionalDate(value?: string | null): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) return undefined;
    return date;
}

function formatTrackedApplication(doc: any) {
    return {
        ...doc,
        deadline: doc.deadline ? new Date(doc.deadline).toISOString() : null,
        reminderAt: doc.reminderAt ? new Date(doc.reminderAt).toISOString() : null,
        trackedAt: doc.trackedAt ? new Date(doc.trackedAt).toISOString() : null,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    };
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
    const profile = await ProfileModelPostgres.getOrCreateProfile(userId);
    return profile as unknown as UserProfileDoc;
}


async function buildSavedSearchMatches(search: SavedSearchDoc, sinceMs: number, limit: number) {
    const filters = sanitizeFilters(search.filters);
    const searchLimit = Math.min(200, Math.max(limit * 4, 50));

    const announcements = await AnnouncementModelPostgres.findAll({
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
    try {
        await ProfileModelPostgres.upsertNotifications(
            userId,
            items.map(item => ({
                announcementId: String(item.id),
                title: item.title,
                type: item.type,
                slug: item.slug,
                organization: item.organization,
            })),
            source,
        );
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

    const announcements = await AnnouncementModelPostgres.findAll({ limit: 200 });
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

function createTrackedCounts(items: TrackedApplicationDoc[]): Record<TrackerStatus | 'total', number> {
    const counts: Record<TrackerStatus | 'total', number> = {
        saved: 0,
        applied: 0,
        'admit-card': 0,
        exam: 0,
        result: 0,
        total: items.length,
    };

    for (const item of items) {
        if (item.status in counts) {
            counts[item.status as TrackerStatus] += 1;
        }
    }

    return counts;
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
        await ProfileModelPostgres.updateProfile(req.user!.userId, parseResult.data);

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
            AnnouncementModelPostgres.getCategories(),
            AnnouncementModelPostgres.getOrganizations(),
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
        const searches = await ProfileModelPostgres.listSavedSearches(req.user!.userId);

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
        const input = parseResult.data;
        const filters = sanitizeFilters(input.filters);

        const doc: Omit<SavedSearchDoc, 'userId' | 'createdAt' | 'updatedAt'> = {
            name: input.name,
            query: input.query?.trim() || '',
            filters,
            notificationsEnabled: input.notificationsEnabled ?? true,
            frequency: input.frequency ?? 'daily',
            lastNotifiedAt: null,
        };

        const created = await ProfileModelPostgres.createSavedSearch(req.user!.userId, doc);
        recordAnalyticsEvent({
            type: 'saved_search_create',
            userId: req.user!.userId,
            metadata: {
                hasQuery: Boolean(doc.query),
                hasFilters: Boolean(doc.filters),
                frequency: doc.frequency,
            },
        }).catch(console.error);
        return res.status(201).json({ data: formatSavedSearch(created) });
    } catch (error) {
        console.error('Saved search create error:', error);
        return res.status(500).json({ error: 'Failed to create saved search' });
    }
});

router.put('/saved-searches/:id', authenticateToken, async (req, res) => {
    const id = getPathParam(req.params.id);
    if (!isValidEntityId(id)) {
        return res.status(400).json({ error: 'Invalid saved search id' });
    }

    const parseResult = savedSearchUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    try {
        const update: Partial<Omit<SavedSearchDoc, 'userId' | 'createdAt' | 'updatedAt'>> = {};

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

        const updated = await ProfileModelPostgres.updateSavedSearch(req.user!.userId, id, update);
        if (!updated) {
            return res.status(404).json({ error: 'Saved search not found' });
        }

        return res.json({ data: formatSavedSearch(updated) });
    } catch (error) {
        console.error('Saved search update error:', error);
        return res.status(500).json({ error: 'Failed to update saved search' });
    }
});

router.delete('/saved-searches/:id', authenticateToken, async (req, res) => {
    const id = getPathParam(req.params.id);
    if (!isValidEntityId(id)) {
        return res.status(400).json({ error: 'Invalid saved search id' });
    }

    try {
        const deleted = await ProfileModelPostgres.deleteSavedSearch(req.user!.userId, id);
        if (!deleted) {
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

        const searches = await ProfileModelPostgres.listSavedSearches(req.user!.userId);

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

        const searches = await ProfileModelPostgres.listSavedSearches(req.user!.userId);

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
        const docs = await ProfileModelPostgres.listNotifications(req.user!.userId, limit);
        const unreadCount = await ProfileModelPostgres.countUnreadNotifications(req.user!.userId);

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
            await ProfileModelPostgres.markAllNotificationsRead(req.user!.userId);
            return res.json({ message: 'All notifications marked as read' });
        }

        const validIds = ids.filter((value) => typeof value === 'string' && isValidEntityId(value));
        if (validIds.length === 0) {
            return res.status(400).json({ error: 'Invalid notification ids' });
        }

        await ProfileModelPostgres.markNotificationsRead(req.user!.userId, validIds);

        return res.json({ message: 'Notifications marked as read' });
    } catch (error) {
        console.error('Notifications read error:', error);
        return res.status(500).json({ error: 'Failed to update notifications' });
    }
});

// Tracked applications
router.get('/tracked-applications', authenticateToken, async (req, res) => {
    try {
        const docs = await ProfileModelPostgres.listTrackedApplications(req.user!.userId);

        return res.json({ data: docs.map(formatTrackedApplication) });
    } catch (error) {
        console.error('Tracked applications fetch error:', error);
        return res.status(500).json({ error: 'Failed to load tracked applications' });
    }
});

router.post('/tracked-applications', authenticateToken, async (req, res) => {
    const parseResult = trackedApplicationCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const input = parseResult.data;
    const deadline = parseOptionalDate(input.deadline);
    const reminderAt = parseOptionalDate(input.reminderAt);
    if (input.deadline !== undefined && input.deadline !== null && deadline === undefined) {
        return res.status(400).json({ error: 'Invalid deadline value' });
    }
    if (input.reminderAt !== undefined && input.reminderAt !== null && reminderAt === undefined) {
        return res.status(400).json({ error: 'Invalid reminderAt value' });
    }

    try {
        const now = new Date();
        const updateDoc: {
            announcementId?: string;
            slug: string;
            type: ContentType;
            title: string;
            organization?: string;
            deadline?: Date | null;
            status: TrackerStatus;
            notes?: string;
            reminderAt?: Date | null;
            trackedAt?: Date;
            updatedAt?: Date;
        } = {
            slug: input.slug,
            type: input.type,
            title: input.title,
            status: input.status,
            updatedAt: now,
        };
        if (input.announcementId !== undefined) updateDoc.announcementId = input.announcementId || undefined;
        if (input.organization !== undefined) updateDoc.organization = input.organization?.trim() || undefined;
        if (input.notes !== undefined) updateDoc.notes = input.notes?.trim() || undefined;
        if (input.deadline !== undefined) updateDoc.deadline = deadline === undefined ? null : deadline;
        if (input.reminderAt !== undefined) updateDoc.reminderAt = reminderAt === undefined ? null : reminderAt;

        const doc = await ProfileModelPostgres.upsertTrackedApplicationBySlug(req.user!.userId, {
            ...updateDoc,
            trackedAt: now,
        });

        if (!doc) {
            return res.status(500).json({ error: 'Failed to save tracked application' });
        }

        return res.status(201).json({ data: formatTrackedApplication(doc) });
    } catch (error) {
        console.error('Tracked applications create error:', error);
        return res.status(500).json({ error: 'Failed to track application' });
    }
});

router.patch('/tracked-applications/:id', authenticateToken, async (req, res) => {
    const id = getPathParam(req.params.id);
    if (!isValidEntityId(id)) {
        return res.status(400).json({ error: 'Invalid tracked application id' });
    }

    const parseResult = trackedApplicationPatchSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const update: Partial<{ status: TrackerStatus; notes?: string; reminderAt?: Date | null; updatedAt?: Date }> = {};
    if (parseResult.data.status !== undefined) {
        update.status = parseResult.data.status;
    }
    if (parseResult.data.notes !== undefined) {
        update.notes = parseResult.data.notes.trim() || undefined;
    }
    if (parseResult.data.reminderAt !== undefined) {
        const reminderAt = parseOptionalDate(parseResult.data.reminderAt);
        if (parseResult.data.reminderAt !== null && reminderAt === undefined) {
            return res.status(400).json({ error: 'Invalid reminderAt value' });
        }
        update.reminderAt = reminderAt === undefined ? null : reminderAt;
    }
    update.updatedAt = new Date();

    try {
        const doc = await ProfileModelPostgres.updateTrackedApplicationById(req.user!.userId, id, {
            status: update.status,
            notes: update.notes,
            reminderAt: update.reminderAt,
            updatedAt: update.updatedAt,
        });

        if (!doc) {
            return res.status(404).json({ error: 'Tracked application not found' });
        }

        return res.json({ data: formatTrackedApplication(doc) });
    } catch (error) {
        console.error('Tracked applications patch error:', error);
        return res.status(500).json({ error: 'Failed to update tracked application' });
    }
});

router.delete('/tracked-applications/:id', authenticateToken, async (req, res) => {
    const id = getPathParam(req.params.id);
    if (!isValidEntityId(id)) {
        return res.status(400).json({ error: 'Invalid tracked application id' });
    }

    try {
        const deleted = await ProfileModelPostgres.deleteTrackedApplicationById(req.user!.userId, id);
        if (!deleted) {
            return res.status(404).json({ error: 'Tracked application not found' });
        }

        return res.json({ message: 'Tracked application removed' });
    } catch (error) {
        console.error('Tracked applications delete error:', error);
        return res.status(500).json({ error: 'Failed to delete tracked application' });
    }
});

router.post('/tracked-applications/import', authenticateToken, async (req, res) => {
    const parseResult = trackedApplicationImportSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const seenSlugs = new Set<string>();
    const now = new Date();
    let skipped = 0;
    const importItems: Array<{
        announcementId?: string;
        slug: string;
        type: ContentType;
        title: string;
        organization?: string;
        deadline?: Date | null;
        status: TrackerStatus;
        notes?: string;
        reminderAt?: Date | null;
        trackedAt?: Date;
        updatedAt?: Date;
    }> = [];

    for (const item of parseResult.data.items) {
        const slug = item.slug.trim();
        if (!slug || seenSlugs.has(slug)) {
            skipped += 1;
            continue;
        }
        seenSlugs.add(slug);

        const deadline = parseOptionalDate(item.deadline);
        if (item.deadline !== undefined && item.deadline !== null && deadline === undefined) {
            skipped += 1;
            continue;
        }
        const reminderAt = parseOptionalDate(item.reminderAt);
        if (item.reminderAt !== undefined && item.reminderAt !== null && reminderAt === undefined) {
            skipped += 1;
            continue;
        }
        const trackedAt = parseOptionalDate(item.trackedAt) ?? now;
        const updatedAt = parseOptionalDate(item.updatedAt) ?? now;

        importItems.push({
            announcementId: item.announcementId || undefined,
            slug,
            type: item.type,
            title: item.title,
            organization: item.organization?.trim() || undefined,
            deadline: deadline === undefined ? null : deadline,
            status: item.status,
            notes: item.notes?.trim() || undefined,
            reminderAt: reminderAt === undefined ? null : reminderAt,
            trackedAt: trackedAt || now,
            updatedAt: updatedAt || now,
        });
    }

    if (importItems.length === 0) {
        return res.json({ imported: 0, skipped });
    }

    try {
        const imported = await ProfileModelPostgres.importTrackedApplications(req.user!.userId, importItems);
        return res.json({ imported, skipped });
    } catch (error) {
        console.error('Tracked applications import error:', error);
        return res.status(500).json({ error: 'Failed to import tracked applications' });
    }
});

router.get('/widgets', authenticateToken, async (req, res) => {
    try {
        const profile = await getOrCreateProfile(req.user!.userId);
        const windowDays = Math.min(30, Math.max(1, parseInt(req.query.windowDays as string, 10) || profile.alertWindowDays || 7));
        const sinceMs = Date.now() - windowDays * 24 * 60 * 60 * 1000;

        const [trackedItems, searches, preferenceAlerts] = await Promise.all([
            ProfileModelPostgres.listTrackedApplications(req.user!.userId),
            ProfileModelPostgres.listSavedSearches(req.user!.userId),
            getPreferenceAlerts(profile, sinceMs, 24),
        ]);

        const trackedCounts = createTrackedCounts(trackedItems);

        const nowMs = Date.now();
        const deadlineWindowMs = nowMs + windowDays * 24 * 60 * 60 * 1000;
        const upcomingDeadlines = trackedItems
            .filter((item) => item.deadline)
            .map((item) => {
                const deadlineMs = new Date(item.deadline as Date).getTime();
                return { item, deadlineMs };
            })
            .filter((entry) => Number.isFinite(entry.deadlineMs) && entry.deadlineMs >= nowMs && entry.deadlineMs <= deadlineWindowMs)
            .sort((a, b) => a.deadlineMs - b.deadlineMs)
            .slice(0, 8)
            .map((entry) => ({
                id: (entry.item as any).id || '',
                slug: entry.item.slug,
                title: entry.item.title,
                type: entry.item.type,
                deadline: new Date(entry.deadlineMs).toISOString(),
                status: entry.item.status,
                daysRemaining: Math.max(0, Math.ceil((entry.deadlineMs - nowMs) / (24 * 60 * 60 * 1000))),
            }));

        const savedSearchMatches = (await Promise.all(
            searches.map(async (search) => {
                const result = await buildSavedSearchMatches(search, sinceMs, 12);
                return result.totalMatches;
            })
        )).reduce((sum, count) => sum + count, 0);

        const payload: DashboardWidgetPayload = {
            trackedCounts,
            upcomingDeadlines,
            recommendationCount: preferenceAlerts.totalMatches,
            savedSearchMatches,
            generatedAt: new Date().toISOString(),
            windowDays,
        };

        return res.json({ data: payload });
    } catch (error) {
        console.error('Widgets fetch error:', error);
        return res.status(500).json({ error: 'Failed to load dashboard widgets' });
    }
});

// Recommendations
router.get('/recommendations', authenticateToken, async (req, res) => {
    try {
        const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
        const profile = await getOrCreateProfile(req.user!.userId);
        const announcements = await AnnouncementModelPostgres.findAll({ limit: 200 });

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
