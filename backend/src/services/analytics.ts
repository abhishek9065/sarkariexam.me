import type { Collection } from 'mongodb';
import { getCollection } from './cosmosdb.js';

export type AnalyticsEventType =
    | 'announcement_view'
    | 'listing_view'
    | 'card_click'
    | 'category_click'
    | 'filter_apply'
    | 'search'
    | 'bookmark_add'
    | 'bookmark_remove'
    | 'subscription_verify'
    | 'subscription_unsubscribe'
    | 'auth_register'
    | 'saved_search_create'
    | 'digest_preview'
    | 'alerts_view';

interface AnalyticsEventDoc {
    type: AnalyticsEventType;
    createdAt: Date;
    announcementId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
}

interface AnalyticsRollupDoc {
    date: string;
    viewCount: number;
    listingViews: number;
    cardClicks: number;
    categoryClicks: number;
    filterApplies: number;
    searchCount: number;
    bookmarkAdds: number;
    bookmarkRemoves: number;
    registrations: number;
    subscriptionsVerified: number;
    subscriptionsUnsubscribed: number;
    savedSearches: number;
    digestPreviews: number;
    alertsViewed: number;
    announcementCount: number;
    updatedAt: Date;
}

const DEFAULT_ROLLUP_DAYS = 30;
const DEFAULT_ROLLUP_INTERVAL_MS = 15 * 60 * 1000;

let rollupInterval: NodeJS.Timeout | null = null;

const getDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const getCollectionSafe = <T>(name: string): Collection<T> | null => {
    try {
        return getCollection<T>(name);
    } catch {
        return null;
    }
};

export async function recordAnnouncementView(announcementId: string): Promise<void> {
    await recordAnalyticsEvent({
        type: 'announcement_view',
        announcementId,
    });
}

export async function recordAnalyticsEvent(input: {
    type: AnalyticsEventType;
    announcementId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
}): Promise<void> {
    const collection = getCollectionSafe<AnalyticsEventDoc>('analytics_events');
    if (!collection) return;

    try {
        await collection.insertOne({
            type: input.type,
            announcementId: input.announcementId,
            userId: input.userId,
            metadata: input.metadata,
            createdAt: new Date(),
        } as AnalyticsEventDoc);
    } catch (error) {
        console.error('[Analytics] Failed to record event:', error);
    }
}

export async function rollupAnalytics(days: number = DEFAULT_ROLLUP_DAYS): Promise<void> {
    const events = getCollectionSafe<AnalyticsEventDoc>('analytics_events');
    const rollups = getCollectionSafe<AnalyticsRollupDoc>('analytics_rollups');
    const announcements = getCollectionSafe<any>('announcements');

    if (!events || !rollups || !announcements) return;

    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);

    const [eventAgg, postAgg] = await Promise.all([
        events.aggregate([
            { $match: { createdAt: { $gte: start } } },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
                        type: '$type',
                    },
                    count: { $sum: 1 }
                }
            }
        ]).toArray(),
        announcements.aggregate([
            { $match: { postedAt: { $gte: start } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$postedAt', timezone: 'UTC' }
                    },
                    count: { $sum: 1 }
                }
            }
        ]).toArray()
    ]);

    const eventMap = new Map<string, Partial<Record<AnalyticsEventType, number>>>();
    for (const entry of eventAgg) {
        const id = entry._id as { date: string; type: AnalyticsEventType };
        if (!id?.date || !id?.type) continue;
        const bucket = eventMap.get(id.date) ?? {};
        bucket[id.type] = entry.count as number;
        eventMap.set(id.date, bucket);
    }

    const postMap = new Map(postAgg.map(entry => [entry._id as string, entry.count as number]));

    const now = new Date();

    for (let i = 0; i < days; i++) {
        const date = new Date(start);
        date.setUTCDate(start.getUTCDate() + i);
        const dateKey = getDateKey(date);

        const counts = eventMap.get(dateKey) ?? {};
        await rollups.updateOne(
            { date: dateKey },
            {
                $set: {
                    date: dateKey,
                    viewCount: counts.announcement_view ?? 0,
                    listingViews: counts.listing_view ?? 0,
                    cardClicks: counts.card_click ?? 0,
                    categoryClicks: counts.category_click ?? 0,
                    filterApplies: counts.filter_apply ?? 0,
                    searchCount: counts.search ?? 0,
                    bookmarkAdds: counts.bookmark_add ?? 0,
                    bookmarkRemoves: counts.bookmark_remove ?? 0,
                    registrations: counts.auth_register ?? 0,
                    subscriptionsVerified: counts.subscription_verify ?? 0,
                    subscriptionsUnsubscribed: counts.subscription_unsubscribe ?? 0,
                    savedSearches: counts.saved_search_create ?? 0,
                    digestPreviews: counts.digest_preview ?? 0,
                    alertsViewed: counts.alerts_view ?? 0,
                    announcementCount: postMap.get(dateKey) ?? 0,
                    updatedAt: now,
                }
            },
            { upsert: true }
        );
    }
}

export async function getDailyRollups(days: number = 14): Promise<Array<{
    date: string;
    count: number;
    views: number;
    listingViews: number;
    cardClicks: number;
    categoryClicks: number;
    filterApplies: number;
    searches: number;
    bookmarkAdds: number;
    registrations: number;
}>> {
    const rollups = getCollectionSafe<AnalyticsRollupDoc>('analytics_rollups');
    if (!rollups) return [];

    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);

    const docs = await rollups
        .find({ date: { $gte: getDateKey(start) } })
        .sort({ date: 1 })
        .toArray();

    const map = new Map(docs.map(doc => [doc.date, doc]));
    const results: Array<{
        date: string;
        count: number;
        views: number;
        listingViews: number;
        cardClicks: number;
        categoryClicks: number;
        filterApplies: number;
        searches: number;
        bookmarkAdds: number;
        registrations: number;
    }> = [];

    for (let i = 0; i < days; i++) {
        const date = new Date(start);
        date.setUTCDate(start.getUTCDate() + i);
        const dateKey = getDateKey(date);
        const doc = map.get(dateKey);
        results.push({
            date: dateKey,
            count: doc?.announcementCount ?? 0,
            views: doc?.viewCount ?? 0,
            listingViews: doc?.listingViews ?? 0,
            cardClicks: doc?.cardClicks ?? 0,
            categoryClicks: doc?.categoryClicks ?? 0,
            filterApplies: doc?.filterApplies ?? 0,
            searches: doc?.searchCount ?? 0,
            bookmarkAdds: doc?.bookmarkAdds ?? 0,
            registrations: doc?.registrations ?? 0,
        });
    }

    return results;
}

export async function getRollupSummary(days: number = DEFAULT_ROLLUP_DAYS): Promise<{
    days: number;
    lastUpdatedAt: string | null;
    viewCount: number;
    listingViews: number;
    cardClicks: number;
    categoryClicks: number;
    filterApplies: number;
    searchCount: number;
    bookmarkAdds: number;
    bookmarkRemoves: number;
    registrations: number;
    subscriptionsVerified: number;
    subscriptionsUnsubscribed: number;
    savedSearches: number;
    digestPreviews: number;
    alertsViewed: number;
}> {
    const rollups = getCollectionSafe<AnalyticsRollupDoc>('analytics_rollups');
    if (!rollups) {
        return {
            days,
            lastUpdatedAt: null,
            viewCount: 0,
            listingViews: 0,
            cardClicks: 0,
            categoryClicks: 0,
            filterApplies: 0,
            searchCount: 0,
            bookmarkAdds: 0,
            bookmarkRemoves: 0,
            registrations: 0,
            subscriptionsVerified: 0,
            subscriptionsUnsubscribed: 0,
            savedSearches: 0,
            digestPreviews: 0,
            alertsViewed: 0,
        };
    }

    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);

    const docs = await rollups
        .find({ date: { $gte: getDateKey(start) } })
        .toArray();

    return docs.reduce((acc, doc) => {
        const updatedAt = doc.updatedAt ? doc.updatedAt.toISOString() : null;
        const lastUpdatedAt = updatedAt && (!acc.lastUpdatedAt || updatedAt > acc.lastUpdatedAt)
            ? updatedAt
            : acc.lastUpdatedAt;

        return {
            days,
            lastUpdatedAt,
            viewCount: acc.viewCount + (doc.viewCount ?? 0),
            listingViews: acc.listingViews + (doc.listingViews ?? 0),
            cardClicks: acc.cardClicks + (doc.cardClicks ?? 0),
            categoryClicks: acc.categoryClicks + (doc.categoryClicks ?? 0),
            filterApplies: acc.filterApplies + (doc.filterApplies ?? 0),
            searchCount: acc.searchCount + (doc.searchCount ?? 0),
            bookmarkAdds: acc.bookmarkAdds + (doc.bookmarkAdds ?? 0),
            bookmarkRemoves: acc.bookmarkRemoves + (doc.bookmarkRemoves ?? 0),
            registrations: acc.registrations + (doc.registrations ?? 0),
            subscriptionsVerified: acc.subscriptionsVerified + (doc.subscriptionsVerified ?? 0),
            subscriptionsUnsubscribed: acc.subscriptionsUnsubscribed + (doc.subscriptionsUnsubscribed ?? 0),
            savedSearches: acc.savedSearches + (doc.savedSearches ?? 0),
            digestPreviews: acc.digestPreviews + (doc.digestPreviews ?? 0),
            alertsViewed: acc.alertsViewed + (doc.alertsViewed ?? 0),
        };
    }, {
        days,
        lastUpdatedAt: null,
        viewCount: 0,
        listingViews: 0,
        cardClicks: 0,
        categoryClicks: 0,
        filterApplies: 0,
        searchCount: 0,
        bookmarkAdds: 0,
        bookmarkRemoves: 0,
        registrations: 0,
        subscriptionsVerified: 0,
        subscriptionsUnsubscribed: 0,
        savedSearches: 0,
        digestPreviews: 0,
        alertsViewed: 0,
    });
}

export async function scheduleAnalyticsRollups(options?: { days?: number; intervalMs?: number }): Promise<void> {
    if (rollupInterval) return;

    const days = options?.days ?? DEFAULT_ROLLUP_DAYS;
    const intervalMs = options?.intervalMs ?? DEFAULT_ROLLUP_INTERVAL_MS;

    await rollupAnalytics(days);

    rollupInterval = setInterval(() => {
        rollupAnalytics(days).catch(error => {
            console.error('[Analytics] Rollup failed:', error);
        });
    }, intervalMs);
}

export function stopAnalyticsRollups(): void {
    if (!rollupInterval) return;
    clearInterval(rollupInterval);
    rollupInterval = null;
}
