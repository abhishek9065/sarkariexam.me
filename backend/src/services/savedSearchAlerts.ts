import { Filter, ObjectId } from 'mongodb';

import { AnnouncementModelMongo } from '../models/announcements.mongo.js';
import type { ContentType } from '../types.js';

import { getCollection } from './cosmosdb.js';
import { sendDigestEmail } from './email.js';

interface SavedSearchDoc {
    _id: ObjectId;
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

interface UserProfileDoc {
    userId: string;
    alertWindowDays?: number;
    alertMaxItems?: number;
}

interface UserDoc {
    _id: ObjectId;
    email: string;
    isActive?: boolean;
}

interface SubscriptionDoc {
    email: string;
    isActive: boolean;
    verified: boolean;
    unsubscribeToken: string;
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

interface AnnouncementItem {
    id: string;
    title: string;
    slug: string;
    type: ContentType;
    category: string;
    organization?: string;
    deadline?: Date | string | null;
    updatedAt?: Date | string;
    postedAt?: Date | string;
}

interface EmailQueueItem {
    id: string;
    title: string;
    slug: string;
    type: ContentType;
    category: string;
    organization?: string;
    deadline?: Date | string | null;
    timestamp: number;
}

interface EmailQueueBucket {
    userId: string;
    frequency: 'daily' | 'weekly';
    windowDays: number;
    items: Map<string, EmailQueueItem>;
}

export interface SavedSearchAlertsRunResult {
    dueSearches: number;
    searchesWithMatches: number;
    notificationsUpserted: number;
    emailSent: number;
    emailSkippedNoSubscription: number;
    errors: number;
}

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;
const DEFAULT_MAX_SEARCHES_PER_RUN = 300;
const DEFAULT_MAX_EMAIL_ITEMS = 12;
const DEFAULT_DAILY_WINDOW_DAYS = 1;
const DEFAULT_WEEKLY_WINDOW_DAYS = 7;
const DEFAULT_INSTANT_WINDOW_DAYS = 1;
const DEFAULT_INSTANT_COOLDOWN_MINUTES = 60;
const DEFAULT_FALLBACK_LIMIT = 8;

const parseBoundedInt = (value: string | undefined, fallback: number, min: number, max: number): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    const rounded = Math.round(parsed);
    return Math.min(max, Math.max(min, rounded));
};

const config = {
    intervalMs: parseBoundedInt(process.env.SAVED_SEARCH_ALERT_INTERVAL_MS, DEFAULT_INTERVAL_MS, 60_000, 86_400_000),
    maxSearchesPerRun: parseBoundedInt(process.env.SAVED_SEARCH_ALERT_MAX_SEARCHES, DEFAULT_MAX_SEARCHES_PER_RUN, 1, 2_000),
    maxEmailItems: parseBoundedInt(process.env.SAVED_SEARCH_ALERT_MAX_EMAIL_ITEMS, DEFAULT_MAX_EMAIL_ITEMS, 1, 30),
    dailyWindowDays: parseBoundedInt(process.env.SAVED_SEARCH_ALERT_DAILY_WINDOW_DAYS, DEFAULT_DAILY_WINDOW_DAYS, 1, 30),
    weeklyWindowDays: parseBoundedInt(process.env.SAVED_SEARCH_ALERT_WEEKLY_WINDOW_DAYS, DEFAULT_WEEKLY_WINDOW_DAYS, 1, 30),
    instantWindowDays: parseBoundedInt(process.env.SAVED_SEARCH_ALERT_INSTANT_WINDOW_DAYS, DEFAULT_INSTANT_WINDOW_DAYS, 1, 30),
    instantCooldownMinutes: parseBoundedInt(
        process.env.SAVED_SEARCH_ALERT_INSTANT_COOLDOWN_MINUTES,
        DEFAULT_INSTANT_COOLDOWN_MINUTES,
        5,
        1_440
    ),
};

let alertsIntervalRef: NodeJS.Timeout | null = null;
let alertsRunInFlight = false;

const savedSearchesCollection = () => getCollection<SavedSearchDoc>('saved_searches');
const profilesCollection = () => getCollection<UserProfileDoc>('user_profiles');
const notificationsCollection = () => getCollection<NotificationDoc>('user_notifications');
const usersCollection = () => getCollection<UserDoc>('users');
const subscriptionsCollection = () => getCollection<SubscriptionDoc>('subscriptions');

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const startOfUtcDay = (date: Date): Date =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const startOfUtcWeek = (date: Date): Date => {
    const start = startOfUtcDay(date);
    const day = start.getUTCDay();
    const delta = (day + 6) % 7;
    start.setUTCDate(start.getUTCDate() - delta);
    return start;
};

function getAnnouncementTimestamp(item: { updatedAt?: Date | string; postedAt?: Date | string }) {
    const value = item.updatedAt || item.postedAt;
    if (!value) return 0;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
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

async function buildSavedSearchMatches(search: SavedSearchDoc, sinceMs: number, limit: number): Promise<AnnouncementItem[]> {
    const filters = sanitizeFilters(search.filters);
    const searchLimit = Math.min(250, Math.max(limit * 4, 50));

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

    return (announcements as unknown as AnnouncementItem[])
        .filter((item) => getAnnouncementTimestamp(item) >= sinceMs)
        .slice(0, limit);
}

function buildDueSearchQuery(now: Date): Filter<SavedSearchDoc> {
    const dailyThreshold = startOfUtcDay(now);
    const weeklyThreshold = startOfUtcWeek(now);
    const instantThreshold = new Date(now.getTime() - config.instantCooldownMinutes * 60 * 1000);

    return {
        notificationsEnabled: true,
        $or: [
            {
                frequency: 'daily' as const,
                $or: [
                    { lastNotifiedAt: { $exists: false } },
                    { lastNotifiedAt: null },
                    { lastNotifiedAt: { $lt: dailyThreshold } },
                ],
            },
            {
                frequency: 'weekly' as const,
                $or: [
                    { lastNotifiedAt: { $exists: false } },
                    { lastNotifiedAt: null },
                    { lastNotifiedAt: { $lt: weeklyThreshold } },
                ],
            },
            {
                frequency: 'instant' as const,
                $or: [
                    { lastNotifiedAt: { $exists: false } },
                    { lastNotifiedAt: null },
                    { lastNotifiedAt: { $lt: instantThreshold } },
                ],
            },
        ],
    };
}

function resolveWindowDays(search: SavedSearchDoc, profile?: UserProfileDoc): number {
    if (profile?.alertWindowDays && Number.isFinite(profile.alertWindowDays)) {
        return Math.min(30, Math.max(1, Math.round(profile.alertWindowDays)));
    }
    if (search.frequency === 'weekly') return config.weeklyWindowDays;
    if (search.frequency === 'instant') return config.instantWindowDays;
    return config.dailyWindowDays;
}

function resolveAlertLimit(profile?: UserProfileDoc): number {
    if (profile?.alertMaxItems && Number.isFinite(profile.alertMaxItems)) {
        return Math.min(20, Math.max(1, Math.round(profile.alertMaxItems)));
    }
    return DEFAULT_FALLBACK_LIMIT;
}

function toDigestFrequency(frequency: SavedSearchDoc['frequency']): 'daily' | 'weekly' {
    return frequency === 'weekly' ? 'weekly' : 'daily';
}

async function listDueSavedSearches(now: Date): Promise<SavedSearchDoc[]> {
    return savedSearchesCollection()
        .find(buildDueSearchQuery(now))
        .sort({ updatedAt: -1 })
        .limit(config.maxSearchesPerRun)
        .toArray();
}

async function loadProfiles(userIds: string[]): Promise<Map<string, UserProfileDoc>> {
    if (!userIds.length) return new Map();
    const docs = await profilesCollection().find({ userId: { $in: userIds } }).toArray();
    return new Map(docs.map((doc) => [doc.userId, doc]));
}

async function loadUserEmails(userIds: string[]): Promise<Map<string, string>> {
    const objectIds = userIds
        .map((userId) => ({ userId, objectId: ObjectId.isValid(userId) ? new ObjectId(userId) : null }))
        .filter((entry): entry is { userId: string; objectId: ObjectId } => Boolean(entry.objectId));

    if (!objectIds.length) return new Map();

    const docs = await usersCollection().find({
        _id: { $in: objectIds.map((entry) => entry.objectId) },
        $or: [{ isActive: true }, { isActive: { $exists: false } }],
    }).toArray();

    const byObjectId = new Map(
        docs
            .filter((doc) => doc.email)
            .map((doc) => [doc._id.toString(), normalizeEmail(doc.email)])
    );

    const result = new Map<string, string>();
    for (const entry of objectIds) {
        const email = byObjectId.get(entry.objectId.toString());
        if (email) result.set(entry.userId, email);
    }
    return result;
}

async function loadSubscriptionTokens(emails: string[]): Promise<Map<string, string>> {
    if (!emails.length) return new Map();
    const docs = await subscriptionsCollection().find({
        email: { $in: emails },
        isActive: true,
        verified: true,
    }).toArray();

    return new Map(
        docs
            .filter((doc) => doc.email && doc.unsubscribeToken)
            .map((doc) => [normalizeEmail(doc.email), doc.unsubscribeToken])
    );
}

async function upsertNotifications(userId: string, searchId: string, items: AnnouncementItem[]): Promise<number> {
    if (!items.length) return 0;

    const source = `saved:${searchId}`;
    const ops = items.map((item) => ({
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
        },
    }));

    const result = await notificationsCollection().bulkWrite(ops, { ordered: false });
    return (result as any)?.upsertedCount ?? 0;
}

function buildWindowLabel(frequency: 'daily' | 'weekly', windowDays: number): string {
    const prefix = frequency === 'weekly' ? 'Weekly saved-search alerts' : 'Saved-search alerts';
    return `${prefix} for the past ${windowDays} day(s)`;
}

export async function processSavedSearchAlertsOnce(now: Date = new Date()): Promise<SavedSearchAlertsRunResult> {
    const dueSearches = await listDueSavedSearches(now);
    if (!dueSearches.length) {
        return {
            dueSearches: 0,
            searchesWithMatches: 0,
            notificationsUpserted: 0,
            emailSent: 0,
            emailSkippedNoSubscription: 0,
            errors: 0,
        };
    }

    const userIds = Array.from(new Set(dueSearches.map((search) => search.userId).filter(Boolean)));
    const [profilesMap, userEmailMap] = await Promise.all([
        loadProfiles(userIds),
        loadUserEmails(userIds),
    ]);
    const tokenMap = await loadSubscriptionTokens(Array.from(userEmailMap.values()));

    let searchesWithMatches = 0;
    let notificationsUpserted = 0;
    let emailSent = 0;
    let emailSkippedNoSubscription = 0;
    let errors = 0;
    const touchedSearchIds: ObjectId[] = [];

    const emailQueue = new Map<string, EmailQueueBucket>();

    for (const search of dueSearches) {
        try {
            const profile = profilesMap.get(search.userId);
            const windowDays = resolveWindowDays(search, profile);
            const limit = resolveAlertLimit(profile);
            const sinceMs = now.getTime() - windowDays * 24 * 60 * 60 * 1000;

            const matches = await buildSavedSearchMatches(search, sinceMs, limit);
            if (!matches.length) continue;

            const upserted = await upsertNotifications(search.userId, search._id.toString(), matches);
            searchesWithMatches += 1;
            notificationsUpserted += upserted;
            touchedSearchIds.push(search._id);

            const frequency = toDigestFrequency(search.frequency);
            const queueKey = `${search.userId}:${frequency}`;
            const bucket = emailQueue.get(queueKey) || {
                userId: search.userId,
                frequency,
                windowDays,
                items: new Map<string, EmailQueueItem>(),
            };
            bucket.windowDays = Math.max(bucket.windowDays, windowDays);

            for (const match of matches) {
                const id = String(match.id);
                const timestamp = getAnnouncementTimestamp(match);
                const previous = bucket.items.get(id);
                if (!previous || previous.timestamp < timestamp) {
                    bucket.items.set(id, {
                        id,
                        title: match.title,
                        slug: match.slug,
                        type: match.type,
                        category: match.category,
                        organization: match.organization,
                        deadline: match.deadline,
                        timestamp,
                    });
                }
            }
            emailQueue.set(queueKey, bucket);
        } catch (error) {
            errors += 1;
            console.error('[SavedSearchAlerts] Search processing failed:', error);
        }
    }

    for (const bucket of emailQueue.values()) {
        const email = userEmailMap.get(bucket.userId);
        if (!email) {
            emailSkippedNoSubscription += 1;
            continue;
        }

        const unsubscribeToken = tokenMap.get(email);
        if (!unsubscribeToken) {
            emailSkippedNoSubscription += 1;
            continue;
        }

        const items = Array.from(bucket.items.values())
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, config.maxEmailItems)
            .map((item) => ({
                title: item.title,
                slug: item.slug,
                type: item.type,
                category: item.category,
                organization: item.organization ?? 'Unknown',
                deadline: item.deadline as any,
            }));

        if (!items.length) continue;

        const delivered = await sendDigestEmail({
            email,
            announcements: items,
            unsubscribeToken,
            frequency: bucket.frequency,
            windowLabel: buildWindowLabel(bucket.frequency, bucket.windowDays),
        });

        if (delivered) {
            emailSent += 1;
        } else {
            errors += 1;
        }
    }

    if (touchedSearchIds.length) {
        await savedSearchesCollection().updateMany(
            { _id: { $in: touchedSearchIds } },
            { $set: { lastNotifiedAt: now } }
        );
    }

    return {
        dueSearches: dueSearches.length,
        searchesWithMatches,
        notificationsUpserted,
        emailSent,
        emailSkippedNoSubscription,
        errors,
    };
}

async function runSavedSearchAlertCycle(): Promise<void> {
    if (alertsRunInFlight) return;
    alertsRunInFlight = true;
    try {
        const result = await processSavedSearchAlertsOnce();
        if (result.dueSearches > 0) {
            console.log(
                `[SavedSearchAlerts] due=${result.dueSearches} matches=${result.searchesWithMatches} notifications=${result.notificationsUpserted} emailSent=${result.emailSent}`
            );
        }
    } catch (error) {
        console.error('[SavedSearchAlerts] cycle failed:', error);
    } finally {
        alertsRunInFlight = false;
    }
}

export function scheduleSavedSearchAlerts(): void {
    if (alertsIntervalRef) return;
    runSavedSearchAlertCycle().catch((error) => {
        console.error('[SavedSearchAlerts] initial run failed:', error);
    });
    alertsIntervalRef = setInterval(() => {
        runSavedSearchAlertCycle().catch((error) => {
            console.error('[SavedSearchAlerts] scheduled run failed:', error);
        });
    }, config.intervalMs);
}

export function stopSavedSearchAlerts(): void {
    if (!alertsIntervalRef) return;
    clearInterval(alertsIntervalRef);
    alertsIntervalRef = null;
}
