'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnnouncementCard, AnnouncementCardSkeleton } from '@/app/components/AnnouncementCard';
import { Icon } from '@/app/components/Icon';
import styles from '@/app/components/PortalSurface.module.css';
import { PublicCategoryRail } from '@/app/components/PublicCategoryRail';
import { getBookmarks, removeBookmark } from '@/app/lib/api';
import { getRecentViews } from '@/app/lib/personalization';
import type { AnnouncementCard as CardType } from '@/app/lib/types';
import { formatDate } from '@/app/lib/ui';
import { useAuth } from '@/app/lib/useAuth';

type SortMode = 'newest' | 'deadline' | 'type';
type ViewMode = 'cards' | 'list';

function sortBookmarks(cards: CardType[], sort: SortMode) {
    const next = [...cards];
    if (sort === 'deadline') {
        return next.sort((left, right) => new Date(left.deadline ?? left.postedAt).getTime() - new Date(right.deadline ?? right.postedAt).getTime());
    }
    if (sort === 'type') {
        return next.sort((left, right) => left.type.localeCompare(right.type));
    }
    return next.sort((left, right) => new Date(right.postedAt).getTime() - new Date(left.postedAt).getTime());
}

export function BookmarksPage() {
    const { user, loading: authLoading } = useAuth();
    const [bookmarks, setBookmarks] = useState<CardType[]>([]);
    const [loading, setLoading] = useState(true);
    const [sort, setSort] = useState<SortMode>('newest');
    const [view, setView] = useState<ViewMode>('cards');
    const [recentViews, setRecentViews] = useState(getRecentViews());

    useEffect(() => {
        setRecentViews(getRecentViews());
    }, []);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            setBookmarks([]);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const response = await getBookmarks();
                if (!cancelled) {
                    setBookmarks((response.data ?? []).map((item) => ({
                        id: item.id,
                        title: item.title,
                        slug: item.slug,
                        type: item.type,
                        category: item.category,
                        organization: item.organization,
                        location: item.location,
                        deadline: item.deadline,
                        totalPosts: item.totalPosts,
                        postedAt: item.postedAt,
                        viewCount: item.viewCount,
                    })));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user]);

    const sorted = sortBookmarks(bookmarks, sort);

    if (authLoading) {
        return (
            <div className={styles.page}>
                <section className={styles.hero}>
                    <div className={styles.heroCopy}>
                        <span className={styles.heroKicker}>Loading account</span>
                        <h1 className={styles.heroTitle}>Opening bookmarks</h1>
                    </div>
                </section>
            </div>
        );
    }

    if (!user) {
        return (
            <div className={styles.page}>
                <section className={styles.hero}>
                    <div className={styles.heroGrid}>
                        <div className={styles.heroCopy}>
                            <span className={styles.heroKicker}>Bookmarks</span>
                            <h1 className={styles.heroTitle}>Save the updates you do not want to lose.</h1>
                            <p className={styles.heroSub}>Bookmarks work as a personal shortlist for jobs, results, admit cards, and deadline-sensitive forms.</p>
                            <div className={styles.toolbarGroup}>
                                <Link href="/?login=1" className={styles.primaryButton}>Sign in to continue</Link>
                                <Link href="/jobs" className={styles.secondaryButton}>Browse jobs</Link>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <section className={styles.hero}>
                <div className={styles.heroGrid}>
                    <div className={styles.heroCopy}>
                        <span className={styles.heroKicker}>Member surface</span>
                        <h1 className={styles.heroTitle}>Your bookmark desk</h1>
                        <p className={styles.heroSub}>Keep the shortlist tight, sort it by urgency or type, and jump back into recently viewed announcements without starting over.</p>
                    </div>
                    <div className={styles.heroStats}>
                        <div className={styles.statCard}><span className={styles.statLabel}>Saved items</span><strong className={styles.statValue}>{bookmarks.length}</strong></div>
                        <div className={styles.statCard}><span className={styles.statLabel}>Recent views</span><strong className={styles.statValue}>{recentViews.length}</strong></div>
                        <div className={styles.statCard}><span className={styles.statLabel}>Sort mode</span><strong className={styles.statValue}>{sort}</strong></div>
                        <div className={styles.statCard}><span className={styles.statLabel}>View mode</span><strong className={styles.statValue}>{view}</strong></div>
                    </div>
                </div>
            </section>

            <PublicCategoryRail />

            <div className={styles.contentGrid}>
                <div className={styles.mainStack}>
                    <section className={styles.panel}>
                        <div className={styles.toolbar}>
                            <div className={styles.toolbarGroup}>
                                <label className={styles.field}>
                                    <span className={styles.fieldLabel}>Sort</span>
                                    <select className={styles.fieldSelect} value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
                                        <option value="newest">Newest</option>
                                        <option value="deadline">Deadline</option>
                                        <option value="type">Type</option>
                                    </select>
                                </label>
                            </div>
                            <div className={styles.toggleGroup}>
                                <button type="button" className={`${styles.toggleButton}${view === 'cards' ? ` ${styles.toggleActive}` : ''}`} onClick={() => setView('cards')}>Cards</button>
                                <button type="button" className={`${styles.toggleButton}${view === 'list' ? ` ${styles.toggleActive}` : ''}`} onClick={() => setView('list')}>List</button>
                            </div>
                        </div>

                        {loading ? (
                            <div className={styles.cardGrid} style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                                {Array.from({ length: 4 }).map((_, index) => <AnnouncementCardSkeleton key={index} />)}
                            </div>
                        ) : sorted.length === 0 ? (
                            <div className={styles.emptyState}>
                                <Icon name="Bookmark" size={24} />
                                <h2 className={styles.emptyTitle}>No bookmarks yet</h2>
                                <p className={styles.sectionCopy}>Save announcements from category feeds or detail pages and they will appear here.</p>
                            </div>
                        ) : view === 'cards' ? (
                            <div className={styles.cardGrid} style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                                {sorted.map((card) => (
                                    <div key={card.id} className={styles.mainStack}>
                                        <AnnouncementCard card={card} sourceTag="bookmarks_cards" />
                                        <button
                                            type="button"
                                            className={styles.ghostButton}
                                            onClick={() => removeBookmark(card.id).then(() => setBookmarks((current) => current.filter((item) => item.id !== card.id))).catch(() => undefined)}
                                        >
                                            Remove bookmark
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.moduleList}>
                                {sorted.map((card) => (
                                    <div key={card.id} className={styles.listCard}>
                                        <Link href={`/${card.type}/${card.slug}`} className={styles.railItemTitle}>{card.title}</Link>
                                        <span className={styles.listMeta}>
                                            <span>{card.organization}</span>
                                            <span>{formatDate(card.deadline ?? card.postedAt)}</span>
                                        </span>
                                        <button
                                            type="button"
                                            className={styles.linkButton}
                                            onClick={() => removeBookmark(card.id).then(() => setBookmarks((current) => current.filter((item) => item.id !== card.id))).catch(() => undefined)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                <aside className={styles.sideStack}>
                    <section className={styles.panel}>
                        <div className={styles.panelHeaderBlock}>
                            <p className={styles.sectionEyebrow}>Recent views</p>
                            <h2 className={styles.panelTitle}>Resume where you stopped</h2>
                        </div>
                        <div className={styles.moduleList}>
                            {recentViews.length === 0 ? (
                                <div className={styles.emptyState}><p className={styles.sectionCopy}>Open a few detail pages and they will appear here.</p></div>
                            ) : recentViews.slice(0, 5).map((item) => (
                                <Link key={item.id} href={`/${item.type}/${item.slug}`} className={styles.moduleLink}>
                                    <span className={styles.railItemTitle}>{item.title}</span>
                                    <span className={styles.listMeta}>
                                        <span>{item.organization}</span>
                                        <span>{item.type}</span>
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
}
