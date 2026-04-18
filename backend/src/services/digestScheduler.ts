import type { AlertSubscriptionRecord } from '../content/types.js';
import AlertSubscriptionModelPostgres from '../models/alertSubscriptions.postgres.js';
import PostModelPostgres from '../models/posts.postgres.js';
import type { ContentType } from '../types.js';

import { sendDigestEmail } from './email.js';

interface CandidateDigestAnnouncement {
    title: string;
    slug: string;
    type: ContentType;
    category: string;
    organization: string;
    deadline?: Date;
    categorySlug?: string;
    organizationSlug?: string;
    stateSlug?: string;
    qualificationSlug?: string;
}

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;
const DEFAULT_DAILY_HOUR_UTC = 7;
const DEFAULT_WEEKLY_DAY_UTC = 1; // Monday
const DEFAULT_WEEKLY_HOUR_UTC = 8;
const DEFAULT_MAX_ITEMS = 12;
const DEFAULT_LOOKBACK_LIMIT = 600;

let digestInterval: NodeJS.Timeout | null = null;
let digestCycleRunning = false;

const parseBoundedInt = (value: string | undefined, fallback: number, min: number, max: number): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    const rounded = Math.round(parsed);
    return Math.min(max, Math.max(min, rounded));
};

const schedulerConfig = {
    intervalMs: parseBoundedInt(process.env.DIGEST_SCHEDULER_INTERVAL_MS, DEFAULT_INTERVAL_MS, 60_000, 86_400_000),
    dailyHourUtc: parseBoundedInt(process.env.DIGEST_DAILY_HOUR_UTC, DEFAULT_DAILY_HOUR_UTC, 0, 23),
    weeklyDayUtc: parseBoundedInt(process.env.DIGEST_WEEKLY_DAY_UTC, DEFAULT_WEEKLY_DAY_UTC, 0, 6),
    weeklyHourUtc: parseBoundedInt(process.env.DIGEST_WEEKLY_HOUR_UTC, DEFAULT_WEEKLY_HOUR_UTC, 0, 23),
    maxItems: parseBoundedInt(process.env.DIGEST_MAX_ITEMS, DEFAULT_MAX_ITEMS, 1, 30),
};

const normalizeToken = (value?: string | null): string => {
    if (!value) return '';
    return value.trim().toLowerCase().replace(/\s+/g, '-');
};

const matchesSubscription = (
    announcement: CandidateDigestAnnouncement,
    subscriber: AlertSubscriptionRecord
): boolean => {
    const matchesArray = (values?: string[], target?: string) => {
        const normalized = (values || []).map((value) => normalizeToken(value)).filter(Boolean);
        if (normalized.length === 0) return true;
        if (!target) return false;
        return normalized.includes(target);
    };

    return matchesArray(subscriber.categorySlugs, announcement.categorySlug || normalizeToken(announcement.category))
        && matchesArray(subscriber.postTypes, announcement.type)
        && matchesArray(subscriber.organizationSlugs, announcement.organizationSlug || normalizeToken(announcement.organization))
        && matchesArray(subscriber.stateSlugs, announcement.stateSlug)
        && matchesArray(subscriber.qualificationSlugs, announcement.qualificationSlug);
};

const toDateOrNull = (value: Date | string | null | undefined): Date | null => {
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
};

const startOfUtcDay = (date: Date): Date =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const startOfUtcWeek = (date: Date): Date => {
    const start = startOfUtcDay(date);
    const day = start.getUTCDay();
    const delta = (day + 6) % 7; // Monday as week start
    start.setUTCDate(start.getUTCDate() - delta);
    return start;
};

const isDailyWindowOpen = (now: Date): boolean => now.getUTCHours() >= schedulerConfig.dailyHourUtc;

const isWeeklyWindowOpen = (now: Date): boolean => {
    const weekday = now.getUTCDay();
    if (weekday < schedulerConfig.weeklyDayUtc) return false;
    if (weekday > schedulerConfig.weeklyDayUtc) return true;
    return now.getUTCHours() >= schedulerConfig.weeklyHourUtc;
};

const frequencyWindowOpen = (frequency: 'daily' | 'weekly', now: Date): boolean =>
    frequency === 'daily' ? isDailyWindowOpen(now) : isWeeklyWindowOpen(now);

const getFrequencyThreshold = (frequency: 'daily' | 'weekly', now: Date): Date =>
    frequency === 'daily' ? startOfUtcDay(now) : startOfUtcWeek(now);

const getFrequencyLookbackStart = (frequency: 'daily' | 'weekly', now: Date): Date => {
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - (frequency === 'daily' ? 1 : 7));
    return start;
};

const getFrequencyWindowLabel = (frequency: 'daily' | 'weekly', now: Date): string => {
    const formatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
    if (frequency === 'daily') {
        return `Updates for ${formatter.format(now)} (UTC)`;
    }
    const start = getFrequencyLookbackStart('weekly', now);
    return `${formatter.format(start)} - ${formatter.format(now)} (UTC)`;
};

async function listDueSubscribers(frequency: 'daily' | 'weekly', now: Date): Promise<AlertSubscriptionRecord[]> {
    const threshold = getFrequencyThreshold(frequency, now);
    // Digest scheduling now depends on Prisma-managed subscription timing state.
    // Keep cadence policy here, but keep durable subscriber state in Postgres.
    return AlertSubscriptionModelPostgres.listDueDigestSubscribers({ frequency, threshold });
}

async function listCandidateAnnouncements(frequency: 'daily' | 'weekly', now: Date): Promise<CandidateDigestAnnouncement[]> {
    const lookbackStart = getFrequencyLookbackStart(frequency, now).getTime();
    const posts = await PostModelPostgres.findAdmin({
        status: 'published',
        sort: 'newest',
        limit: DEFAULT_LOOKBACK_LIMIT,
    });

    return posts.data
        .map((post) => {
            const postedAt = toDateOrNull(post.publishedAt || post.createdAt);
            if (!postedAt || postedAt.getTime() < lookbackStart) return null;

            const category = post.categories[0];
            const organization = post.organization;
            const state = post.states[0];
            const qualification = post.qualifications[0];

            return {
                title: post.title,
                slug: post.slug,
                type: post.type,
                category: category?.name || 'General',
                organization: organization?.name || 'Government of India',
                deadline: toDateOrNull(post.lastDate || post.expiresAt || null) || undefined,
                categorySlug: normalizeToken(category?.slug || category?.name),
                organizationSlug: normalizeToken(organization?.slug || organization?.name),
                stateSlug: normalizeToken(state?.slug || state?.name || post.location),
                qualificationSlug: normalizeToken(qualification?.slug || qualification?.name),
            };
        })
        .filter(Boolean) as CandidateDigestAnnouncement[];
}

async function markDigestSent(subscriptionEmail: string, frequency: 'daily' | 'weekly', sentAt: Date): Promise<void> {
    await AlertSubscriptionModelPostgres.markDigestSentByEmail(subscriptionEmail, frequency, sentAt);
}

async function processFrequency(frequency: 'daily' | 'weekly', now: Date): Promise<void> {
    if (!frequencyWindowOpen(frequency, now)) return;

    const subscribers = await listDueSubscribers(frequency, now);
    if (subscribers.length === 0) return;

    const candidates = await listCandidateAnnouncements(frequency, now);
    if (candidates.length === 0) return;

    const windowLabel = getFrequencyWindowLabel(frequency, now);
    let sent = 0;
    let skipped = 0;

    for (const subscriber of subscribers) {
        if (!subscriber.email || !subscriber.unsubscribeToken) {
            skipped += 1;
            continue;
        }

        const matches = candidates
            .filter((announcement) => matchesSubscription(announcement, subscriber))
            .slice(0, schedulerConfig.maxItems)
            .map((announcement) => ({
                title: announcement.title,
                slug: announcement.slug,
                type: announcement.type,
                category: announcement.category,
                organization: announcement.organization,
                deadline: announcement.deadline,
            }));

        if (matches.length === 0) {
            skipped += 1;
            continue;
        }

        const delivered = await sendDigestEmail({
            email: subscriber.email,
            announcements: matches,
            unsubscribeToken: subscriber.unsubscribeToken,
            frequency,
            windowLabel,
        });

        if (delivered) {
            await markDigestSent(subscriber.email, frequency, now);
            sent += 1;
        } else {
            skipped += 1;
        }
    }

    console.log(`[DigestScheduler] ${frequency} run complete: sent=${sent}, skipped=${skipped}, due=${subscribers.length}`);
}

async function runDigestCycle(): Promise<void> {
    if (digestCycleRunning) return;
    digestCycleRunning = true;
    const now = new Date();

    try {
        await processFrequency('daily', now);
        await processFrequency('weekly', now);
    } catch (error) {
        console.error('[DigestScheduler] cycle failed:', error);
    } finally {
        digestCycleRunning = false;
    }
}

export function scheduleDigestSender(): void {
    if (digestInterval) return;
    runDigestCycle().catch((error) => {
        console.error('[DigestScheduler] initial run failed:', error);
    });
    digestInterval = setInterval(() => {
        runDigestCycle().catch((error) => {
            console.error('[DigestScheduler] scheduled run failed:', error);
        });
    }, schedulerConfig.intervalMs);
}

export function stopDigestSender(): void {
    if (!digestInterval) return;
    clearInterval(digestInterval);
    digestInterval = null;
}
