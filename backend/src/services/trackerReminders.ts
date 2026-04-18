import { randomUUID } from 'crypto';

import AlertSubscriptionModelPostgres from '../models/alertSubscriptions.postgres.js';
import AnnouncementModelPostgres from '../models/announcements.postgres.js';
import { BookmarkModelMongo } from '../models/bookmarks.mongo.js';
import ProfileModelPostgres from '../models/profile.postgres.js';
import { UserModelMongo } from '../models/users.mongo.js';
import type { ContentType } from '../types.js';

import { sendDigestEmail } from './email.js';
import { prismaApp } from './postgres/prisma.js';

interface ReminderItem {
    userId: string;
    source: 'tracked' | 'bookmark';
    announcementId: string;
    title: string;
    type: ContentType;
    slug: string;
    organization?: string;
    deadline: Date | null;
}

export interface TrackerReminderRunResult {
    candidates: number;
    inAppSent: number;
    emailSent: number;
    emailSkippedNoSubscription: number;
    deduped: number;
}

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;
const DEFAULT_LEAD_DAYS = 3;
const DEFAULT_MAX_EMAIL_ITEMS = 10;
const DEFAULT_MAX_TRACKED_SCAN = 400;
const DEFAULT_MAX_ANNOUNCEMENT_SCAN = 600;

const parseBoundedInt = (value: string | undefined, fallback: number, min: number, max: number): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    const rounded = Math.round(parsed);
    return Math.min(max, Math.max(min, rounded));
};

const config = {
    intervalMs: parseBoundedInt(process.env.TRACKER_REMINDER_INTERVAL_MS, DEFAULT_INTERVAL_MS, 60_000, 86_400_000),
    leadDays: parseBoundedInt(process.env.TRACKER_REMINDER_LEAD_DAYS, DEFAULT_LEAD_DAYS, 1, 14),
    maxEmailItems: parseBoundedInt(process.env.TRACKER_REMINDER_MAX_EMAIL_ITEMS, DEFAULT_MAX_EMAIL_ITEMS, 1, 30),
};

let reminderInterval: NodeJS.Timeout | null = null;
let reminderRunInFlight = false;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const toDate = (value: Date | string | null | undefined): Date | null => {
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
};

const isDuplicateKeyError = (error: unknown): boolean =>
    error instanceof Error && /E11000|duplicate/i.test(error.message);

const formatDeadlineDate = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

const buildDedupeKey = (item: ReminderItem, channel: 'in_app' | 'email'): string => {
    const deadlineDate = formatDeadlineDate(item.deadline) ?? 'none';
    return `${channel}:${item.source}:${item.userId}:${item.announcementId}:${deadlineDate}`;
};

async function reserveDispatch(item: ReminderItem, channel: 'in_app' | 'email'): Promise<boolean> {
    const dedupeKey = buildDedupeKey(item, channel);
    try {
        await prismaApp.reminderDispatchLogEntry.create({
            data: {
                id: randomUUID(),
                dedupeKey,
                userId: item.userId,
                channel,
                source: item.source,
                announcementId: item.announcementId,
                deadlineDate: formatDeadlineDate(item.deadline),
            },
        });
        return true;
    } catch (error) {
        if (isDuplicateKeyError(error) || isUniqueConstraintError(error)) return false;
        console.error('[TrackerReminders] Failed to reserve dispatch slot:', error);
        return false;
    }
}

async function upsertInAppReminder(item: ReminderItem): Promise<boolean> {
    const source = item.source === 'tracked' ? 'reminder:tracked' : 'reminder:bookmark';
    try {
        const inserted = await ProfileModelPostgres.upsertNotifications(
            item.userId,
            [{
                announcementId: item.announcementId,
                title: item.title,
                type: item.type,
                slug: item.slug,
                organization: item.organization,
            }],
            source,
        );
        return inserted >= 0;
    } catch (error) {
        console.error('[TrackerReminders] Failed to upsert in-app reminder:', error);
        return false;
    }
}

async function loadUserEmailMap(userIds: string[]): Promise<Map<string, string>> {
    return UserModelMongo.listActiveEmailMap(userIds);
}

async function loadSubscriptionTokenMap(emails: string[]): Promise<Map<string, string>> {
    const subscriptions = await AlertSubscriptionModelPostgres.listByEmails(emails);
    return new Map(
        subscriptions.map((doc) => [normalizeEmail(doc.email), doc.unsubscribeToken]),
    );
}

async function getTrackedReminderItems(now: Date, horizon: Date): Promise<ReminderItem[]> {
    const docs = await ProfileModelPostgres.listDueTrackedApplications({
        now,
        horizon,
        limit: DEFAULT_MAX_TRACKED_SCAN,
    });

    return docs.map((doc) => ({
        userId: doc.userId,
        source: 'tracked',
        announcementId: doc.announcementId || `tracked:${doc.id}`,
        title: doc.title,
        type: doc.type,
        slug: doc.slug,
        organization: doc.organization,
        deadline: toDate(doc.deadline),
    }));
}

async function getBookmarkReminderItems(now: Date, horizon: Date): Promise<ReminderItem[]> {
    const dueAnnouncements = (await AnnouncementModelPostgres.findAll({
        limit: DEFAULT_MAX_ANNOUNCEMENT_SCAN,
    })).filter((announcement) => {
        const deadline = toDate(announcement.deadline as any);
        return Boolean(deadline && deadline >= now && deadline <= horizon);
    });

    if (!dueAnnouncements.length) return [];

    const byAnnouncementId = new Map(dueAnnouncements.map((announcement) => [announcement.id, announcement]));
    const announcementIds = Array.from(byAnnouncementId.keys());

    const bookmarks = await BookmarkModelMongo.findByAnnouncementIds(announcementIds);

    const results: ReminderItem[] = [];
    for (const bookmark of bookmarks) {
        const announcement = byAnnouncementId.get(bookmark.announcementId);
        if (!announcement) continue;
        results.push({
            userId: bookmark.userId,
            source: 'bookmark',
            announcementId: bookmark.announcementId,
            title: announcement.title,
            type: announcement.type,
            slug: announcement.slug,
            organization: announcement.organization,
            deadline: toDate(announcement.deadline as any),
        });
    }

    return results;
}

export async function processTrackerRemindersOnce(now: Date = new Date()): Promise<TrackerReminderRunResult> {
    const horizon = new Date(now);
    horizon.setUTCDate(horizon.getUTCDate() + config.leadDays);

    const [trackedItems, bookmarkItems] = await Promise.all([
        getTrackedReminderItems(now, horizon),
        getBookmarkReminderItems(now, horizon),
    ]);

    const candidates = [...trackedItems, ...bookmarkItems];
    if (candidates.length === 0) {
        return { candidates: 0, inAppSent: 0, emailSent: 0, emailSkippedNoSubscription: 0, deduped: 0 };
    }

    const dedupedUserItemMap = new Map<string, ReminderItem>();
    for (const item of candidates) {
        const key = `${item.userId}:${item.announcementId}:${item.source}`;
        if (!dedupedUserItemMap.has(key)) {
            dedupedUserItemMap.set(key, item);
        }
    }
    const uniqueItems = Array.from(dedupedUserItemMap.values());

    let inAppSent = 0;
    let deduped = candidates.length - uniqueItems.length;
    const emailQueueByUser = new Map<string, ReminderItem[]>();

    for (const item of uniqueItems) {
        const reservedInApp = await reserveDispatch(item, 'in_app');
        if (!reservedInApp) {
            deduped += 1;
        } else {
            const sent = await upsertInAppReminder(item);
            if (sent) inAppSent += 1;
        }

        const reservedEmail = await reserveDispatch(item, 'email');
        if (!reservedEmail) {
            deduped += 1;
            continue;
        }
        const existing = emailQueueByUser.get(item.userId) ?? [];
        existing.push(item);
        emailQueueByUser.set(item.userId, existing);
    }

    const userIds = Array.from(emailQueueByUser.keys());
    const userEmailMap = await loadUserEmailMap(userIds);
    const tokenMap = await loadSubscriptionTokenMap(Array.from(userEmailMap.values()));

    let emailSent = 0;
    let emailSkippedNoSubscription = 0;
    const windowLabel = `Deadline reminders for the next ${config.leadDays} day(s)`;

    for (const [userId, items] of emailQueueByUser.entries()) {
        const email = userEmailMap.get(userId);
        if (!email) {
            emailSkippedNoSubscription += items.length;
            continue;
        }
        const unsubscribeToken = tokenMap.get(email);
        if (!unsubscribeToken) {
            emailSkippedNoSubscription += items.length;
            continue;
        }

        const announcements = items
            .slice(0, config.maxEmailItems)
            .map((item) => ({
                title: item.title,
                slug: item.slug,
                type: item.type,
                category: item.source === 'tracked' ? 'Tracked application' : 'Bookmarked listing',
                organization: item.organization ?? 'Unknown',
                deadline: item.deadline as any,
            }));

        const delivered = await sendDigestEmail({
            email,
            announcements,
            unsubscribeToken,
            frequency: 'daily',
            windowLabel,
        });
        if (delivered) {
            emailSent += 1;
        }
    }

    return {
        candidates: uniqueItems.length,
        inAppSent,
        emailSent,
        emailSkippedNoSubscription,
        deduped,
    };
}

async function runReminderCycle(): Promise<void> {
    if (reminderRunInFlight) return;
    reminderRunInFlight = true;
    try {
        const result = await processTrackerRemindersOnce();
        if (result.candidates > 0) {
            console.log(
                `[TrackerReminders] candidates=${result.candidates} inApp=${result.inAppSent} email=${result.emailSent} deduped=${result.deduped}`
            );
        }
    } catch (error) {
        console.error('[TrackerReminders] cycle failed:', error);
    } finally {
        reminderRunInFlight = false;
    }
}

export function scheduleTrackerReminders(): void {
    if (reminderInterval) return;
    runReminderCycle().catch((error) => {
        console.error('[TrackerReminders] initial run failed:', error);
    });
    reminderInterval = setInterval(() => {
        runReminderCycle().catch((error) => {
            console.error('[TrackerReminders] scheduled run failed:', error);
        });
    }, config.intervalMs);
}

export function stopTrackerReminders(): void {
    if (!reminderInterval) return;
    clearInterval(reminderInterval);
    reminderInterval = null;
}

function isUniqueConstraintError(error: unknown): boolean {
    return typeof error === 'object'
        && error !== null
        && 'code' in error
        && error.code === 'P2002';
}

