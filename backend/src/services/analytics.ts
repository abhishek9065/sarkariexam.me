import { WorkflowStatus } from '@prisma/client';

import { classifySource, normalizeAttribution } from './attribution.js';
import { prismaApp } from './postgres/prisma.js';

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
    | 'alerts_view'
    | 'digest_click'
    | 'deep_link_click'
    | 'push_subscribe_attempt'
    | 'push_subscribe_success'
    | 'push_subscribe_failure';

const DEFAULT_ROLLUP_DAYS = 30;
const DEFAULT_ROLLUP_INTERVAL_MS = 15 * 60 * 1000;

let rollupInterval: NodeJS.Timeout | null = null;

const getDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const TRAFFIC_SOURCE_LABELS = {
    seo: 'Organic',
    direct: 'Direct',
    social: 'Social',
    email: 'Email',
    push: 'Push',
    referral: 'Referral',
    in_app: 'In-App',
    unknown: 'Unknown',
} as const;

type TrafficSourceBucket = keyof typeof TRAFFIC_SOURCE_LABELS;

function toTrafficSourceBucket(source: string | null): TrafficSourceBucket {
    const normalizedSource = normalizeAttribution({ source }).source;
    if (normalizedSource === 'seo') return 'seo';
    if (normalizedSource === 'direct') return 'direct';
    if (normalizedSource === 'social') return 'social';
    if (normalizedSource === 'email' || normalizedSource === 'digest') return 'email';
    if (normalizedSource === 'push') return 'push';
    if (normalizedSource === 'referral') return 'referral';
    if (classifySource(normalizedSource) === 'in_app') return 'in_app';
    return 'unknown';
}

export async function recordAnnouncementView(
    announcementId: string,
    metadata?: Record<string, unknown>
): Promise<void> {
    await recordAnalyticsEvent({
        type: 'announcement_view',
        announcementId,
        metadata,
    });
}

export async function recordAnalyticsEvent(input: {
    type: AnalyticsEventType;
    announcementId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
}): Promise<void> {
    try {
        await prismaApp.analyticsEvent.create({
            data: {
                type: input.type,
                announcementId: input.announcementId,
                userId: input.userId,
                metadata: input.metadata || {},
            },
        });
    } catch (error) {
        console.error('[Analytics] Failed to record event in Postgres:', error);
    }
}

export async function getTopSearches(days: number = DEFAULT_ROLLUP_DAYS, limit = 10): Promise<Array<{ query: string; count: number }>> {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);

    try {
        const rows = await prismaApp.$queryRaw`
            SELECT (metadata->>'query') as query, CAST(COUNT(*) AS INTEGER) as count
            FROM app_analytics_events
            WHERE type = 'search'
              AND created_at >= ${start}
              AND metadata->>'query' IS NOT NULL
              AND metadata->>'query' != ''
            GROUP BY metadata->>'query'
            ORDER BY count DESC
            LIMIT ${Math.max(1, Math.min(50, limit))}
        ` as Array<{ query: string; count: number }>;

        return rows;
    } catch (error) {
        console.error('[Analytics] Failed to load top searches from Postgres:', error);
        return [];
    }
}

export async function getRecentEngagementCount(windowMinutes: number = 5): Promise<number> {
    const safeWindowMinutes = Math.max(1, Math.min(120, Math.round(windowMinutes)));
    const start = new Date(Date.now() - safeWindowMinutes * 60 * 1000);

    try {
        return await prismaApp.analyticsEvent.count({
            where: {
                createdAt: { gte: start },
                type: {
                    in: ['announcement_view', 'listing_view', 'search'],
                },
            },
        });
    } catch (error) {
        console.error('[Analytics] Failed to load recent engagement count:', error);
        return 0;
    }
}

export async function getGeoStateActivity(hours: number = 24, limit: number = 20): Promise<Array<{
    state: string;
    users: number;
}>> {
    const start = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
        const rows = await prismaApp.$queryRaw`
            SELECT (metadata->>'state') as state, CAST(COUNT(*) AS INTEGER) as users
            FROM app_analytics_events
            WHERE type IN ('announcement_view', 'listing_view')
              AND created_at >= ${start}
              AND metadata->>'state' IS NOT NULL
              AND metadata->>'state' != ''
            GROUP BY metadata->>'state'
            ORDER BY users DESC
            LIMIT ${limit}
        ` as Array<{ state: string; users: number }>;

        return rows;
    } catch (error) {
        console.error('[Analytics] Failed to load geo activity from Postgres:', error);
        return [];
    }
}

export async function getFunnelAttributionSplit(days: number = DEFAULT_ROLLUP_DAYS): Promise<{
    totalCardClicks: number;
    cardClicksInApp: number;
    detailViewsDirect: number;
    detailViewsUnattributed: number;
}> {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);

    try {
        const [cardClickRows, detailViewRows] = await Promise.all([
            prismaApp.$queryRaw`
                SELECT COALESCE(metadata->>'source', '__none__') as source, CAST(COUNT(*) AS INTEGER) as count
                FROM app_analytics_events
                WHERE type = 'card_click' AND created_at >= ${start}
                GROUP BY metadata->>'source'
            ` as Promise<Array<{ source: string; count: number }>>,
            prismaApp.$queryRaw`
                SELECT COALESCE(metadata->>'source', '__none__') as source, CAST(COUNT(*) AS INTEGER) as count
                FROM app_analytics_events
                WHERE type = 'announcement_view' AND created_at >= ${start}
                GROUP BY metadata->>'source'
            ` as Promise<Array<{ source: string; count: number }>>,
        ]);

        let totalCardClicks = 0;
        let cardClicksInApp = 0;
        let detailViewsDirect = 0;
        let detailViewsUnattributed = 0;

        for (const row of cardClickRows) {
            totalCardClicks += row.count;
            const sourceClass = classifySource(row.source === '__none__' ? null : row.source);
            if (sourceClass === 'in_app') cardClicksInApp += row.count;
        }

        for (const row of detailViewRows) {
            const sourceClass = classifySource(row.source === '__none__' ? null : row.source);
            if (sourceClass === 'direct') detailViewsDirect += row.count;
            else if (sourceClass !== 'in_app') detailViewsUnattributed += row.count;
        }

        return { totalCardClicks, cardClicksInApp, detailViewsDirect, detailViewsUnattributed };
    } catch (error) {
        console.error('[Analytics] Failed funnel split from Postgres:', error);
        return { totalCardClicks: 0, cardClicksInApp: 0, detailViewsDirect: 0, detailViewsUnattributed: 0 };
    }
}

async function buildPublishedPostCountMap(start: Date): Promise<Map<string, number>> {
    const rows = await prismaApp.post.findMany({
        where: {
            status: WorkflowStatus.PUBLISHED,
            publishedAt: { gte: start },
        },
        select: { publishedAt: true },
    });

    const counts = new Map<string, number>();
    for (const row of rows) {
        if (!row.publishedAt) continue;
        const dateKey = getDateKey(row.publishedAt);
        counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1);
    }
    return counts;
}

export async function rollupAnalytics(days: number = DEFAULT_ROLLUP_DAYS): Promise<void> {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);

    const eventAgg = await prismaApp.analyticsEvent.groupBy({
        by: ['type', 'createdAt'],
        where: { createdAt: { gte: start } },
        _count: { _all: true },
    });

    const eventMap = new Map<string, Partial<Record<AnalyticsEventType, number>>>();
    for (const entry of eventAgg) {
        const dateKey = getDateKey(entry.createdAt);
        const type = entry.type as AnalyticsEventType;
        const bucket = eventMap.get(dateKey) ?? {};
        bucket[type] = (bucket[type] ?? 0) + entry._count._all;
        eventMap.set(dateKey, bucket);
    }

    const postMap = await buildPublishedPostCountMap(start);
    const now = new Date();

    for (let i = 0; i < days; i++) {
        const date = new Date(start);
        date.setUTCDate(start.getUTCDate() + i);
        const dateKey = getDateKey(date);

        const counts = eventMap.get(dateKey) ?? {};
        await prismaApp.analyticsRollup.upsert({
            where: { date: dateKey },
            update: {
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
                digestClicks: counts.digest_click ?? 0,
                deepLinkClicks: counts.deep_link_click ?? 0,
                alertsViewed: counts.alerts_view ?? 0,
                pushSubscribeAttempts: counts.push_subscribe_attempt ?? 0,
                pushSubscribeSuccesses: counts.push_subscribe_success ?? 0,
                pushSubscribeFailures: counts.push_subscribe_failure ?? 0,
                announcementCount: postMap.get(dateKey) ?? 0,
                updatedAt: now,
            },
            create: {
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
                digestClicks: counts.digest_click ?? 0,
                deepLinkClicks: counts.deep_link_click ?? 0,
                alertsViewed: counts.alerts_view ?? 0,
                pushSubscribeAttempts: counts.push_subscribe_attempt ?? 0,
                pushSubscribeSuccesses: counts.push_subscribe_success ?? 0,
                pushSubscribeFailures: counts.push_subscribe_failure ?? 0,
                announcementCount: postMap.get(dateKey) ?? 0,
                updatedAt: now,
            }
        });
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
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);

    const docs = await prismaApp.analyticsRollup.findMany({
        where: { date: { gte: getDateKey(start) } },
        orderBy: { date: 'asc' },
    });

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

export async function getTopAnnouncementViews(hours: number = 24, limit: number = 10): Promise<Array<{
    announcementId: string;
    views: number;
}>> {
    const start = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
        const rows = await prismaApp.$queryRaw`
            SELECT announcement_id as "announcementId", CAST(COUNT(*) AS INTEGER) as views
            FROM app_analytics_events
            WHERE type = 'announcement_view'
              AND created_at >= ${start}
              AND announcement_id IS NOT NULL
            GROUP BY announcement_id
            ORDER BY views DESC
            LIMIT ${limit}
        ` as Array<{ announcementId: string; views: number }>;

        return rows;
    } catch (error) {
        console.error('[Analytics] Failed top views from Postgres:', error);
        return [];
    }
}

export async function getAnnouncementViewTrafficSources(days: number = 7, limit: number = 6): Promise<Array<{
    source: string;
    label: string;
    views: number;
}>> {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);

    try {
        const rows = await prismaApp.$queryRaw`
            SELECT COALESCE(metadata->>'source', '__none__') as source, CAST(COUNT(*) AS INTEGER) as views
            FROM app_analytics_events
            WHERE type = 'announcement_view' AND created_at >= ${start}
            GROUP BY metadata->>'source'
        ` as Array<{ source: string; views: number }>;

        const buckets = new Map<TrafficSourceBucket, { source: string; label: string; views: number }>();

        for (const row of rows) {
            const bucket = toTrafficSourceBucket(row.source === '__none__' ? null : row.source);
            const existing = buckets.get(bucket) ?? {
                source: bucket,
                label: TRAFFIC_SOURCE_LABELS[bucket],
                views: 0,
            };
            existing.views += row.views;
            buckets.set(bucket, existing);
        }

        return Array.from(buckets.values())
            .sort((a, b) => b.views - a.views)
            .slice(0, limit);
    } catch (error) {
        console.error('[Analytics] Failed traffic sources from Postgres:', error);
        return [];
    }
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
    digestClicks: number;
    deepLinkClicks: number;
    alertsViewed: number;
    pushSubscribeAttempts: number;
    pushSubscribeSuccesses: number;
    pushSubscribeFailures: number;
}> {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);

    const docs = await prismaApp.analyticsRollup.findMany({
        where: { date: { gte: getDateKey(start) } },
    });

    const summary = docs.reduce((acc, doc) => {
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
            digestClicks: acc.digestClicks + (doc.digestClicks ?? 0),
            deepLinkClicks: acc.deepLinkClicks + (doc.deepLinkClicks ?? 0),
            alertsViewed: acc.alertsViewed + (doc.alertsViewed ?? 0),
            pushSubscribeAttempts: acc.pushSubscribeAttempts + (doc.pushSubscribeAttempts ?? 0),
            pushSubscribeSuccesses: acc.pushSubscribeSuccesses + (doc.pushSubscribeSuccesses ?? 0),
            pushSubscribeFailures: acc.pushSubscribeFailures + (doc.pushSubscribeFailures ?? 0),
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
        digestClicks: 0,
        deepLinkClicks: 0,
        alertsViewed: 0,
        pushSubscribeAttempts: 0,
        pushSubscribeSuccesses: 0,
        pushSubscribeFailures: 0,
    });

    return summary;
}

export async function getCtrByType(days: number = DEFAULT_ROLLUP_DAYS): Promise<Array<{
    type: string;
    listingViews: number;
    cardClicks: number;
    ctr: number;
}>> {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);

    try {
        const [listingAgg, clickAgg] = await Promise.all([
            prismaApp.$queryRaw`
                SELECT (metadata->>'type') as type, CAST(COUNT(*) AS INTEGER) as count
                FROM app_analytics_events
                WHERE type = 'listing_view' AND created_at >= ${start} AND metadata->>'type' IS NOT NULL
                GROUP BY metadata->>'type'
            ` as Promise<Array<{ type: string; count: number }>>,
            prismaApp.$queryRaw`
                SELECT (metadata->>'type') as type, CAST(COUNT(*) AS INTEGER) as count
                FROM app_analytics_events
                WHERE type = 'card_click' AND created_at >= ${start} AND metadata->>'type' IS NOT NULL
                GROUP BY metadata->>'type'
            ` as Promise<Array<{ type: string; count: number }>>,
        ]);

        const listingMap = new Map<string, number>(listingAgg.map(r => [r.type, r.count]));
        const clickMap = new Map<string, number>(clickAgg.map(r => [r.type, r.count]));

        const types = new Set([...listingMap.keys(), ...clickMap.keys()]);
        return Array.from(types).map((type) => {
            const listingViews = listingMap.get(type) ?? 0;
            const cardClicks = clickMap.get(type) ?? 0;
            const ctr = listingViews > 0 ? Math.round((cardClicks / listingViews) * 100) : 0;
            return { type, listingViews, cardClicks, ctr };
        }).sort((a, b) => b.cardClicks - a.cardClicks);
    } catch (error) {
        console.error('[Analytics] Failed CTR by type from Postgres:', error);
        return [];
    }
}

export async function getDigestClickStats(days: number = DEFAULT_ROLLUP_DAYS): Promise<{
    total: number;
    variants: Array<{ variant: string; clicks: number }>;
    frequencies: Array<{ frequency: string; clicks: number }>;
    campaigns: Array<{ campaign: string; clicks: number }>;
}> {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);

    try {
        const [variantAgg, frequencyAgg, campaignAgg, totalCount] = await Promise.all([
            prismaApp.$queryRaw`SELECT COALESCE(metadata->>'variant', 'unknown') as variant, CAST(COUNT(*) AS INTEGER) as count FROM app_analytics_events WHERE type = 'digest_click' AND created_at >= ${start} GROUP BY metadata->>'variant' ORDER BY count DESC` as Promise<any[]>,
            prismaApp.$queryRaw`SELECT COALESCE(metadata->>'digestType', 'unknown') as frequency, CAST(COUNT(*) AS INTEGER) as count FROM app_analytics_events WHERE type = 'digest_click' AND created_at >= ${start} GROUP BY metadata->>'digestType' ORDER BY count DESC` as Promise<any[]>,
            prismaApp.$queryRaw`SELECT COALESCE(metadata->>'campaign', 'unknown') as campaign, CAST(COUNT(*) AS INTEGER) as count FROM app_analytics_events WHERE type = 'digest_click' AND created_at >= ${start} GROUP BY metadata->>'campaign' ORDER BY count DESC LIMIT 8` as Promise<any[]>,
            prismaApp.analyticsEvent.count({ where: { type: 'digest_click', createdAt: { gte: start } } }),
        ]);

        return {
            total: totalCount,
            variants: variantAgg.map(r => ({ variant: r.variant, clicks: r.count })),
            frequencies: frequencyAgg.map(r => ({ frequency: r.frequency, clicks: r.count })),
            campaigns: campaignAgg.map(r => ({ campaign: r.campaign, clicks: r.count })),
        };
    } catch (error) {
        console.error('[Analytics] Failed digest stats from Postgres:', error);
        return { total: 0, variants: [], frequencies: [], campaigns: [] };
    }
}

export async function getDeepLinkAttribution(days: number = DEFAULT_ROLLUP_DAYS): Promise<{
    total: number;
    sources: Array<{ source: string; clicks: number }>;
    mediums: Array<{ medium: string; clicks: number }>;
    campaigns: Array<{ campaign: string; clicks: number }>;
}> {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);

    try {
        const [sourceAgg, mediumAgg, campaignAgg, totalCount] = await Promise.all([
            prismaApp.$queryRaw`SELECT COALESCE(metadata->>'source', 'unknown') as source, CAST(COUNT(*) AS INTEGER) as count FROM app_analytics_events WHERE type = 'deep_link_click' AND created_at >= ${start} GROUP BY metadata->>'source' ORDER BY count DESC LIMIT 8` as Promise<any[]>,
            prismaApp.$queryRaw`SELECT COALESCE(metadata->>'medium', 'unknown') as medium, CAST(COUNT(*) AS INTEGER) as count FROM app_analytics_events WHERE type = 'deep_link_click' AND created_at >= ${start} GROUP BY metadata->>'medium' ORDER BY count DESC LIMIT 8` as Promise<any[]>,
            prismaApp.$queryRaw`SELECT COALESCE(metadata->>'campaign', 'unknown') as campaign, CAST(COUNT(*) AS INTEGER) as count FROM app_analytics_events WHERE type = 'deep_link_click' AND created_at >= ${start} GROUP BY metadata->>'campaign' ORDER BY count DESC LIMIT 8` as Promise<any[]>,
            prismaApp.analyticsEvent.count({ where: { type: 'deep_link_click', createdAt: { gte: start } } }),
        ]);

        return {
            total: totalCount,
            sources: sourceAgg.map(r => ({ source: r.source, clicks: r.count })),
            mediums: mediumAgg.map(r => ({ medium: r.medium, clicks: r.count })),
            campaigns: campaignAgg.map(r => ({ campaign: r.campaign, clicks: r.count })),
        };
    } catch (error) {
        console.error('[Analytics] Failed deep link stats from Postgres:', error);
        return { total: 0, sources: [], mediums: [], campaigns: [] };
    }
}

export async function getPushSubscriptionStats(days: number = DEFAULT_ROLLUP_DAYS): Promise<{
    attempts: number;
    successes: number;
    failures: number;
    bySource: Array<{ source: string; attempts: number; successes: number; failures: number }>;
}> {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);

    try {
        const rows = await prismaApp.$queryRaw`
            SELECT COALESCE(metadata->>'source', 'unknown') as source, type, CAST(COUNT(*) AS INTEGER) as count
            FROM app_analytics_events
            WHERE type IN ('push_subscribe_attempt', 'push_subscribe_success', 'push_subscribe_failure')
              AND created_at >= ${start}
            GROUP BY metadata->>'source', type
        ` as Array<{ source: string; type: string; count: number }>;

        const bySourceMap = new Map<string, { source: string; attempts: number; successes: number; failures: number }>();
        let attempts = 0, successes = 0, failures = 0;

        for (const row of rows) {
            const bucket = bySourceMap.get(row.source) ?? { source: row.source, attempts: 0, successes: 0, failures: 0 };
            if (row.type === 'push_subscribe_attempt') { bucket.attempts += row.count; attempts += row.count; }
            else if (row.type === 'push_subscribe_success') { bucket.successes += row.count; successes += row.count; }
            else if (row.type === 'push_subscribe_failure') { bucket.failures += row.count; failures += row.count; }
            bySourceMap.set(row.source, bucket);
        }

        const bySource = Array.from(bySourceMap.values())
            .sort((a, b) => (b.successes + b.attempts) - (a.successes + a.attempts))
            .slice(0, 12);

        return { attempts, successes, failures, bySource };
    } catch (error) {
        console.error('[Analytics] Failed push stats from Postgres:', error);
        return { attempts: 0, successes: 0, failures: 0, bySource: [] };
    }
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
