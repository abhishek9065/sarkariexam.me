import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { AnnouncementCard, AnnouncementCardSkeleton } from '../components/AnnouncementCard';
import { getAnnouncementCards } from '../utils/api';
import type { AnnouncementCard as CardType, ContentType } from '../types';

const TYPE_META: Record<ContentType, { title: string; icon: string; description: string }> = {
    job: { title: 'Latest Jobs', icon: '💼', description: 'Browse the latest government job vacancies across India.' },
    result: { title: 'Results', icon: '📊', description: 'Check exam results, merit lists, and cut-off marks.' },
    'admit-card': { title: 'Admit Cards', icon: '🎫', description: 'Download hall tickets for upcoming examinations.' },
    'answer-key': { title: 'Answer Keys', icon: '🔑', description: 'View official answer keys and objection forms.' },
    admission: { title: 'Admissions', icon: '🎓', description: 'University and college admission notifications.' },
    syllabus: { title: 'Syllabus', icon: '📚', description: 'Exam syllabus, patterns, and preparation material.' },
};

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'deadline', label: 'Deadline' },
    { value: 'views', label: 'Most Viewed' },
] as const;

const PAGE_SIZE = 20;

export function CategoryPage({ type }: { type: ContentType }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [cards, setCards] = useState<CardType[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | undefined>();
    const [total, setTotal] = useState<number | undefined>();

    // Filter state from URL params
    const sort = (searchParams.get('sort') as typeof SORT_OPTIONS[number]['value']) || 'newest';
    const search = searchParams.get('q') || '';
    const location = searchParams.get('location') || '';
    const qualification = searchParams.get('qualification') || '';

    const meta = TYPE_META[type];

    const fetchCards = useCallback(async (cursor?: string) => {
        const isInitial = !cursor;
        if (isInitial) setLoading(true);
        else setLoadingMore(true);

        try {
            const res = await getAnnouncementCards({
                type,
                sort,
                search: search || undefined,
                location: location || undefined,
                qualification: qualification || undefined,
                limit: PAGE_SIZE,
                cursor,
            });
            if (isInitial) {
                setCards(res.data);
            } else {
                setCards((prev) => [...prev, ...res.data]);
            }
            setHasMore(res.hasMore ?? false);
            setNextCursor(res.nextCursor);
            if (res.total !== undefined) {
                setTotal(res.total);
            }
        } catch (err) {
            console.error('Failed to fetch cards:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [type, sort, search, location, qualification]);

    // Fetch on mount and when filters change
    useEffect(() => {
        setCards([]);
        setNextCursor(undefined);
        fetchCards();
    }, [fetchCards]);

    const updateFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value) params.set(key, value);
        else params.delete(key);
        setSearchParams(params, { replace: true });
    };

    return (
        <Layout>
            {/* Page header */}
            <section className="category-header animate-fade-in">
                <div className="category-header-title">
                    <span className="category-header-icon">{meta.icon}</span>
                    <div>
                        <h1>{meta.title}</h1>
                        <p className="text-muted">{meta.description}</p>
                    </div>
                </div>
                {total !== undefined && (
                    <span className="category-count">{total.toLocaleString()} found</span>
                )}
            </section>

            {/* Filters bar */}
            <section className="filters-bar">
                <div className="filters-row">
                    <input
                        className="input filter-search"
                        type="text"
                        placeholder="Search within results..."
                        value={search}
                        onChange={(e) => updateFilter('q', e.target.value)}
                    />
                    <input
                        className="input filter-field"
                        type="text"
                        placeholder="Location"
                        value={location}
                        onChange={(e) => updateFilter('location', e.target.value)}
                    />
                    <input
                        className="input filter-field"
                        type="text"
                        placeholder="Qualification"
                        value={qualification}
                        onChange={(e) => updateFilter('qualification', e.target.value)}
                    />
                    <select
                        className="input filter-sort"
                        value={sort}
                        onChange={(e) => updateFilter('sort', e.target.value)}
                    >
                        {SORT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>
            </section>

            {/* Card grid */}
            <section className="category-listing">
                <div className="grid-auto">
                    {loading
                        ? Array.from({ length: 8 }).map((_, i) => <AnnouncementCardSkeleton key={i} />)
                        : cards.map((card) => (
                            <AnnouncementCard key={card.id} card={card} showType={false} />
                        ))
                    }
                </div>

                {/* Empty state */}
                {!loading && cards.length === 0 && (
                    <div className="empty-state">
                        <span className="empty-state-icon">📭</span>
                        <h3>No {meta.title.toLowerCase()} found</h3>
                        <p className="text-muted">Try adjusting your filters or check back later.</p>
                    </div>
                )}

                {/* Load more */}
                {hasMore && !loading && (
                    <div className="load-more">
                        <button
                            className="btn btn-outline btn-lg"
                            onClick={() => fetchCards(nextCursor)}
                            disabled={loadingMore}
                        >
                            {loadingMore ? (
                                <>
                                    <span className="spinner" style={{ width: 16, height: 16 }} />
                                    Loading...
                                </>
                            ) : (
                                'Load More'
                            )}
                        </button>
                    </div>
                )}
            </section>
        </Layout>
    );
}
