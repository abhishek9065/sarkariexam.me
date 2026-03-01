import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { AnnouncementCard, AnnouncementCardSkeleton } from '../components/AnnouncementCard';
import { getBookmarks, removeBookmark } from '../utils/api';
import { buildAnnouncementDetailPath } from '../utils/trackingLinks';
import type { AnnouncementCard as CardType } from '../types';

type SortMode = 'newest' | 'deadline' | 'type';
type ViewMode = 'grid' | 'compact';

function toTimestamp(value?: string | null): number {
    if (!value) return Number.POSITIVE_INFINITY;
    const date = new Date(value);
    const time = date.getTime();
    return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

export function BookmarksPage() {
    const [bookmarks, setBookmarks] = useState<CardType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [removing, setRemoving] = useState<Set<string>>(new Set());
    const [sort, setSort] = useState<SortMode>('newest');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    const fetchBookmarks = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await getBookmarks();
            const cards: CardType[] = res.data.map((item) => ({
                id: item.id,
                title: item.title,
                slug: item.slug,
                type: item.type,
                category: item.category || '',
                organization: item.organization,
                location: item.location,
                deadline: item.deadline,
                totalPosts: item.totalPosts,
                postedAt: item.postedAt,
                viewCount: item.viewCount,
            }));
            setBookmarks(cards);
        } catch (err) {
            console.error('Failed to load bookmarks:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBookmarks();
    }, [fetchBookmarks]);

    const sortedBookmarks = useMemo(() => {
        const items = [...bookmarks];
        if (sort === 'deadline') {
            return items.sort((a, b) => toTimestamp(a.deadline) - toTimestamp(b.deadline));
        }
        if (sort === 'type') {
            return items.sort((a, b) => a.type.localeCompare(b.type));
        }
        return items.sort((a, b) => toTimestamp(b.postedAt) - toTimestamp(a.postedAt));
    }, [bookmarks, sort]);

    const handleRemove = useCallback(async (id: string) => {
        setRemoving((value) => new Set(value).add(id));
        try {
            await removeBookmark(id);
            setBookmarks((prev) => prev.filter((item) => item.id !== id));
        } catch (err) {
            console.error('Failed to remove bookmark:', err);
        } finally {
            setRemoving((value) => {
                const next = new Set(value);
                next.delete(id);
                return next;
            });
        }
    }, []);

    return (
        <Layout>
            <div className="bookmarks-page animate-fade-in">
                <div className="section-header bookmarks-header">
                    <h1>🔖 My Bookmarks</h1>
                    {bookmarks.length > 0 && <span className="badge">{bookmarks.length} saved</span>}
                </div>

                <div className="bookmarks-toolbar card">
                    <label className="bookmarks-toolbar-item">
                        Sort
                        <select
                            className="input"
                            value={sort}
                            onChange={(event) => setSort(event.target.value as SortMode)}
                        >
                            <option value="newest">Newest</option>
                            <option value="deadline">Deadline</option>
                            <option value="type">Type</option>
                        </select>
                    </label>

                    <div className="bookmarks-view-toggle" role="group" aria-label="Bookmark view mode">
                        <button
                            type="button"
                            className={`bookmarks-view-btn${viewMode === 'grid' ? ' active' : ''}`}
                            onClick={() => setViewMode('grid')}
                        >
                            Grid
                        </button>
                        <button
                            type="button"
                            className={`bookmarks-view-btn${viewMode === 'compact' ? ' active' : ''}`}
                            onClick={() => setViewMode('compact')}
                        >
                            Compact
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="grid-auto">
                        {Array.from({ length: 6 }).map((_, index) => <AnnouncementCardSkeleton key={index} />)}
                    </div>
                ) : error ? (
                    <div className="empty-state">
                        <span className="empty-state-icon">⚠️</span>
                        <h3>Something went wrong</h3>
                        <p className="text-muted">Could not load your bookmarks. Please try again.</p>
                        <button type="button" className="btn btn-accent" onClick={() => void fetchBookmarks()}>Retry</button>
                    </div>
                ) : sortedBookmarks.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-state-icon">🔖</span>
                        <h3>No bookmarks yet</h3>
                        <p className="text-muted">Save announcements to quickly access them later.</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid-auto">
                        {sortedBookmarks.map((card) => (
                            <div key={card.id} className="bookmark-card-wrapper">
                                <AnnouncementCard card={card} sourceTag="bookmarks_grid" />
                                <button
                                    type="button"
                                    className="bookmark-remove-btn"
                                    onClick={() => handleRemove(card.id)}
                                    disabled={removing.has(card.id)}
                                    title="Remove bookmark"
                                >
                                    {removing.has(card.id) ? '⏳' : '✕'}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bookmarks-compact-list">
                        {sortedBookmarks.map((card) => (
                            <div key={card.id} className="bookmarks-compact-row">
                                <Link
                                    to={buildAnnouncementDetailPath(card.type, card.slug, 'bookmarks_compact')}
                                    className="bookmarks-compact-link"
                                >
                                    <strong>{card.title}</strong>
                                    <span>{card.organization || 'Government update'}</span>
                                </Link>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handleRemove(card.id)}
                                    disabled={removing.has(card.id)}
                                >
                                    {removing.has(card.id) ? 'Removing...' : 'Remove'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}
