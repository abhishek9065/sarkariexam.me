'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnnouncementCard, AnnouncementCardSkeleton } from '@/app/components/AnnouncementCard';
import { PublicCategoryRail } from '@/app/components/PublicCategoryRail';
import { getBookmarks, removeBookmark } from '@/app/lib/api';
import type { AnnouncementCard as CardType } from '@/app/lib/types';
import '@/app/components/PublicSurface.css';

type SortMode = 'newest' | 'deadline' | 'type';
type ViewMode = 'grid' | 'compact';

function buildAnnouncementDetailPath(type: string, slug: string) {
    return `/${type}/${slug}`;
}

function toTimestamp(value?: string | null): number {
    if (!value) return Number.POSITIVE_INFINITY;
    const date = new Date(value);
    const time = date.getTime();
    return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

const SORT_LABELS: Record<SortMode, string> = {
    newest: 'Newest',
    deadline: 'Deadline',
    type: 'Type',
};

const VIEW_LABELS: Record<ViewMode, string> = {
    grid: 'Grid',
    compact: 'Compact',
};

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
        void fetchBookmarks();
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
        <div className="hp public-shell">
            <section className="public-hero">
                <span className="public-kicker">Saved Updates</span>
                <div className="public-hero-grid">
                    <div className="public-hero-main">
                        <h1 className="public-title">
                            My <span className="public-title-accent">Bookmarks</span>
                        </h1>
                        <p className="public-sub">
                            Keep a personal shortlist of important jobs, results, admit cards, and notifications. This page now follows the same
                            public browsing system as the homepage and category feeds.
                        </p>
                    </div>
                    <div className="public-hero-stats">
                        <div className="public-stat-card">
                            <span className="public-stat-value">{bookmarks.length}</span>
                            <span className="public-stat-label">Saved items</span>
                        </div>
                        <div className="public-stat-card">
                            <span className="public-stat-value">{SORT_LABELS[sort]}</span>
                            <span className="public-stat-label">Current sort</span>
                        </div>
                        <div className="public-stat-card">
                            <span className="public-stat-value">{VIEW_LABELS[viewMode]}</span>
                            <span className="public-stat-label">Current view</span>
                        </div>
                    </div>
                </div>
            </section>

            <PublicCategoryRail />

            <section className="public-panel">
                <div className="public-panel-header">
                    <div>
                        <h2 className="public-panel-title">Saved list</h2>
                        <p className="public-panel-copy">Switch between card and compact views, or remove items you no longer need to track.</p>
                    </div>
                </div>

                <div className="public-toolbar">
                    <label className="public-toolbar-group">
                        <span className="public-toolbar-label">Sort by</span>
                        <select
                            className="public-toolbar-select"
                            value={sort}
                            onChange={(event) => setSort(event.target.value as SortMode)}
                        >
                            <option value="newest">Newest</option>
                            <option value="deadline">Deadline</option>
                            <option value="type">Type</option>
                        </select>
                    </label>

                    <div className="public-toolbar-group">
                        <span className="public-toolbar-label">View mode</span>
                        <div className="public-pill-toggle" role="group" aria-label="Bookmark view mode">
                            <button
                                type="button"
                                className={`public-toolbar-pill${viewMode === 'grid' ? ' active' : ''}`}
                                onClick={() => setViewMode('grid')}
                            >
                                Grid
                            </button>
                            <button
                                type="button"
                                className={`public-toolbar-pill${viewMode === 'compact' ? ' active' : ''}`}
                                onClick={() => setViewMode('compact')}
                            >
                                Compact
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: 'var(--space-4)' }}>
                    {loading ? (
                        <div className="public-bookmark-grid">
                            {Array.from({ length: 6 }).map((_, index) => <AnnouncementCardSkeleton key={index} />)}
                        </div>
                    ) : error ? (
                        <div className="public-empty-state">
                            <span className="public-empty-icon">⚠️</span>
                            <h3>Could not load bookmarks</h3>
                            <p>The saved list did not load successfully. Try again and we will refetch your bookmarked announcements.</p>
                            <div className="public-actions-row">
                                <button type="button" className="public-primary-btn" onClick={() => void fetchBookmarks()}>Retry</button>
                            </div>
                        </div>
                    ) : sortedBookmarks.length === 0 ? (
                        <div className="public-empty-state">
                            <span className="public-empty-icon">🔖</span>
                            <h3>No bookmarks yet</h3>
                            <p>Save announcements from category feeds or detail pages to build your own shortlist here.</p>
                            <div className="public-actions-row">
                                <Link href="/jobs" className="public-secondary-link">Browse Jobs</Link>
                                <Link href="/results" className="public-secondary-link">Browse Results</Link>
                            </div>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="public-bookmark-grid">
                            {sortedBookmarks.map((card) => (
                                <div key={card.id} className="public-bookmark-card">
                                    <AnnouncementCard card={card} sourceTag="bookmarks_grid" />
                                    <button
                                        type="button"
                                        className="public-icon-btn public-bookmark-remove"
                                        onClick={() => handleRemove(card.id)}
                                        disabled={removing.has(card.id)}
                                        title="Remove bookmark"
                                    >
                                        {removing.has(card.id) ? '...' : '×'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="public-bookmark-list">
                            {sortedBookmarks.map((card) => (
                                <div key={card.id} className="public-panel public-bookmark-row">
                                    <Link href={buildAnnouncementDetailPath(card.type, card.slug)} className="public-bookmark-row-link">
                                        <div className="public-bookmark-row-main">
                                            <strong>{card.title}</strong>
                                            <span>{card.organization || 'Government update'}{card.location ? ` • ${card.location}` : ''}</span>
                                        </div>
                                    </Link>
                                    <button
                                        type="button"
                                        className="public-compact-remove"
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
            </section>
        </div>
    );
}
