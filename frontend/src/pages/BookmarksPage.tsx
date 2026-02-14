import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { AnnouncementCard, AnnouncementCardSkeleton } from '../components/AnnouncementCard';
import { getBookmarks, removeBookmark } from '../utils/api';
import type { AnnouncementCard as CardType } from '../types';

export function BookmarksPage() {
    const [bookmarks, setBookmarks] = useState<CardType[]>([]);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState<Set<string>>(new Set());

    const fetchBookmarks = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getBookmarks();
            // Map full announcements to card-shaped objects
            const cards: CardType[] = res.data.map((a) => ({
                id: a.id,
                title: a.title,
                slug: a.slug,
                type: a.type,
                category: a.category,
                organization: a.organization,
                location: a.location,
                deadline: a.deadline,
                totalPosts: a.totalPosts,
                postedAt: a.postedAt,
                viewCount: a.viewCount,
            }));
            setBookmarks(cards);
        } catch (err) {
            console.error('Failed to load bookmarks:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);

    const handleRemove = async (id: string) => {
        setRemoving((s) => new Set(s).add(id));
        try {
            await removeBookmark(id);
            setBookmarks((prev) => prev.filter((b) => b.id !== id));
        } catch (err) {
            console.error('Failed to remove bookmark:', err);
        } finally {
            setRemoving((s) => { const n = new Set(s); n.delete(id); return n; });
        }
    };

    return (
        <Layout>
            <div className="bookmarks-page animate-fade-in">
                <div className="section-header">
                    <h1>🔖 My Bookmarks</h1>
                    {bookmarks.length > 0 && (
                        <span className="badge">{bookmarks.length} saved</span>
                    )}
                </div>

                {loading ? (
                    <div className="grid-auto">
                        {Array.from({ length: 6 }).map((_, i) => <AnnouncementCardSkeleton key={i} />)}
                    </div>
                ) : bookmarks.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-state-icon">🔖</span>
                        <h3>No bookmarks yet</h3>
                        <p className="text-muted">Save announcements to quickly access them later.</p>
                    </div>
                ) : (
                    <div className="grid-auto">
                        {bookmarks.map((card) => (
                            <div key={card.id} className="bookmark-card-wrapper">
                                <AnnouncementCard card={card} />
                                <button
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
                )}
            </div>
        </Layout>
    );
}
