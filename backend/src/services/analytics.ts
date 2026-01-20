import type { Collection } from 'mongodb';
import { getCollection } from './cosmosdb.js';

interface AnalyticsEventDoc {
    type: 'announcement_view';
    announcementId: string;
    createdAt: Date;
}

interface AnalyticsRollupDoc {
    date: string;
    viewCount: number;
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
    const collection = getCollectionSafe<AnalyticsEventDoc>('analytics_events');
    if (!collection) return;

    try {
        await collection.insertOne({
            type: 'announcement_view',
            announcementId,
            createdAt: new Date(),
        } as AnalyticsEventDoc);
    } catch (error) {
        console.error('[Analytics] Failed to record view event:', error);
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

    const [viewAgg, postAgg] = await Promise.all([
        events.aggregate([
            { $match: { type: 'announcement_view', createdAt: { $gte: start } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' }
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

    const viewMap = new Map(viewAgg.map(entry => [entry._id as string, entry.count as number]));
    const postMap = new Map(postAgg.map(entry => [entry._id as string, entry.count as number]));

    const now = new Date();

    for (let i = 0; i < days; i++) {
        const date = new Date(start);
        date.setUTCDate(start.getUTCDate() + i);
        const dateKey = getDateKey(date);

        await rollups.updateOne(
            { date: dateKey },
            {
                $set: {
                    date: dateKey,
                    viewCount: viewMap.get(dateKey) ?? 0,
                    announcementCount: postMap.get(dateKey) ?? 0,
                    updatedAt: now,
                }
            },
            { upsert: true }
        );
    }
}

export async function getDailyRollups(days: number = 14): Promise<Array<{ date: string; count: number; views: number }>> {
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
    const results: Array<{ date: string; count: number; views: number }> = [];

    for (let i = 0; i < days; i++) {
        const date = new Date(start);
        date.setUTCDate(start.getUTCDate() + i);
        const dateKey = getDateKey(date);
        const doc = map.get(dateKey);
        results.push({
            date: dateKey,
            count: doc?.announcementCount ?? 0,
            views: doc?.viewCount ?? 0,
        });
    }

    return results;
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
