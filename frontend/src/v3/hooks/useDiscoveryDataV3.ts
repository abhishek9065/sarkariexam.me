import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAnnouncementCardsPage } from '../../utils/api';
import type { Announcement, ContentType } from '../../types';
import type { HomeCompositionModel } from '../types';

interface DiscoveryQuery {
    type: ContentType;
    search?: string;
    category?: string;
    organization?: string;
    sort?: 'newest' | 'oldest' | 'deadline' | 'views';
    limit?: number;
}

interface DiscoveryState {
    items: Announcement[];
    loading: boolean;
    loadingMore: boolean;
    error: string | null;
    hasMore: boolean;
    loadMore: () => Promise<void>;
    refresh: () => Promise<void>;
}

const DEFAULT_STATES = [
    'Uttar Pradesh',
    'Bihar',
    'Rajasthan',
    'Madhya Pradesh',
    'Delhi',
    'Maharashtra',
    'Tamil Nadu',
    'Karnataka',
    'Gujarat',
    'Punjab',
    'Haryana',
    'Odisha',
];

const toAnnouncements = (items: unknown): Announcement[] => {
    if (!Array.isArray(items)) return [];
    return items as Announcement[];
};

export function useDiscoveryDataV3(query: DiscoveryQuery): DiscoveryState {
    const [items, setItems] = useState<Announcement[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchFirstPage = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchAnnouncementCardsPage({
                type: query.type,
                search: query.search || undefined,
                category: query.category || undefined,
                organization: query.organization || undefined,
                sort: query.sort ?? 'newest',
                limit: query.limit ?? 60,
            });
            const normalized = toAnnouncements(response.data);
            setItems(normalized);
            setCursor(response.nextCursor ?? null);
            setHasMore(Boolean(response.hasMore));
        } catch (err) {
            console.error('Failed to load category data:', err);
            setError('Unable to load announcements. Please retry.');
            setItems([]);
            setCursor(null);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, [query.category, query.limit, query.organization, query.search, query.sort, query.type]);

    useEffect(() => {
        void fetchFirstPage();
    }, [fetchFirstPage]);

    const loadMore = useCallback(async () => {
        if (!hasMore || loadingMore) return;
        setLoadingMore(true);
        try {
            const response = await fetchAnnouncementCardsPage({
                type: query.type,
                search: query.search || undefined,
                category: query.category || undefined,
                organization: query.organization || undefined,
                sort: query.sort ?? 'newest',
                limit: query.limit ?? 60,
                cursor,
            });
            const next = toAnnouncements(response.data);
            setItems((prev) => [...prev, ...next]);
            setCursor(response.nextCursor ?? null);
            setHasMore(Boolean(response.hasMore));
        } catch (err) {
            console.error('Failed to load more data:', err);
            setError('Unable to load more listings right now.');
        } finally {
            setLoadingMore(false);
        }
    }, [cursor, hasMore, loadingMore, query.category, query.limit, query.organization, query.search, query.sort, query.type]);

    return {
        items,
        loading,
        loadingMore,
        error,
        hasMore,
        loadMore,
        refresh: fetchFirstPage,
    };
}

interface HomeCompositionState {
    data: HomeCompositionModel | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useHomeCompositionV3(): HomeCompositionState {
    const [data, setData] = useState<HomeCompositionModel | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [jobs, results, admits, trending] = await Promise.all([
                fetchAnnouncementCardsPage({ type: 'job', sort: 'newest', limit: 80 }),
                fetchAnnouncementCardsPage({ type: 'result', sort: 'newest', limit: 40 }),
                fetchAnnouncementCardsPage({ type: 'admit-card', sort: 'newest', limit: 40 }),
                fetchAnnouncementCardsPage({ sort: 'views', limit: 40 }),
            ]);

            const jobsData = toAnnouncements(jobs.data);
            const resultsData = toAnnouncements(results.data);
            const admitsData = toAnnouncements(admits.data);
            const trendingData = toAnnouncements(trending.data);

            const urgent = jobsData
                .filter((item) => {
                    if (!item.deadline) return false;
                    const days = Math.ceil((new Date(item.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return days >= 0 && days <= 5;
                })
                .slice(0, 10);

            const upcomingDeadlines = jobsData
                .filter((item) => item.deadline)
                .sort((a, b) => {
                    const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
                    const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
                    return aTime - bTime;
                })
                .slice(0, 12);

            const featured = [...jobsData]
                .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
                .slice(0, 12);

            const stateSet = new Set<string>();
            for (const item of jobsData) {
                if (!item.location) continue;
                const primary = item.location.split(',')[0]?.trim();
                if (!primary) continue;
                stateSet.add(primary);
                if (stateSet.size >= 12) break;
            }

            const stateLinks = Array.from(stateSet);
            const states = stateLinks.length >= 8 ? stateLinks : DEFAULT_STATES;

            setData({
                urgent,
                featured,
                latestJobs: jobsData.slice(0, 24),
                latestResults: resultsData.slice(0, 24),
                latestAdmitCards: admitsData.slice(0, 20),
                trending: trendingData.slice(0, 20),
                upcomingDeadlines,
                stateLinks: states.slice(0, 12).map((label) => ({
                    label,
                    slug: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                })),
            });
        } catch (err) {
            console.error('Failed to load home composition:', err);
            setError('Unable to load home data. Please retry.');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const response = useMemo(() => ({
        data,
        loading,
        error,
        refresh: load,
    }), [data, error, load, loading]);

    return response;
}
