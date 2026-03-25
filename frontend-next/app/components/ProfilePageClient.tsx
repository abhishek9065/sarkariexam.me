'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '@/app/components/Icon';
import styles from '@/app/components/PortalSurface.module.css';
import { PublicCategoryRail } from '@/app/components/PublicCategoryRail';
import {
    getProfileNotifications,
    getProfileSavedSearches,
    getProfileWidgets,
    getTrackedApplications,
    type ProfileWidgetData,
    type SavedSearchItem,
    type TrackedApplicationItem,
    type UserNotificationItem,
} from '@/app/lib/api';
import { getInterests, getRecentViews, getSavedSearchDrafts, setInterests } from '@/app/lib/personalization';
import type { ContentType } from '@/app/lib/types';
import { CATEGORY_META, formatDate } from '@/app/lib/ui';
import { useAuth } from '@/app/lib/useAuth';

export function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const [widgets, setWidgets] = useState<ProfileWidgetData | null>(null);
    const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);
    const [localSearches] = useState(getSavedSearchDrafts());
    const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
    const [trackedApplications, setTrackedApplications] = useState<TrackedApplicationItem[]>([]);
    const [recentViews] = useState(getRecentViews());
    const [interests, setInterestState] = useState<ContentType[]>(getInterests());

    useEffect(() => {
        if (!user) return;
        let cancelled = false;

        (async () => {
            const [widgetsRes, savedRes, notificationsRes, trackedRes] = await Promise.allSettled([
                getProfileWidgets(14),
                getProfileSavedSearches(),
                getProfileNotifications(8),
                getTrackedApplications(),
            ]);

            if (cancelled) return;
            if (widgetsRes.status === 'fulfilled') setWidgets(widgetsRes.value.data);
            if (savedRes.status === 'fulfilled') setSavedSearches(savedRes.value.data ?? []);
            if (notificationsRes.status === 'fulfilled') setNotifications(notificationsRes.value.data ?? []);
            if (trackedRes.status === 'fulfilled') setTrackedApplications(trackedRes.value.data ?? []);
        })();

        return () => {
            cancelled = true;
        };
    }, [user]);

    const toggleInterest = (type: ContentType) => {
        const next = interests.includes(type) ? interests.filter((item) => item !== type) : [...interests, type];
        const normalized = next.length > 0 ? next : [type];
        setInterestState(normalized);
        setInterests(normalized);
    };

    if (authLoading) {
        return (
            <div className={styles.page}>
                <section className={styles.hero}>
                    <div className={styles.heroCopy}>
                        <span className={styles.heroKicker}>Loading profile</span>
                    </div>
                </section>
            </div>
        );
    }

    if (!user) {
        return (
            <div className={styles.page}>
                <section className={styles.hero}>
                    <div className={styles.heroCopy}>
                        <span className={styles.heroKicker}>Profile</span>
                        <h1 className={styles.heroTitle}>Your personal exam workspace unlocks after sign in.</h1>
                        <p className={styles.heroSub}>Bookmarks, saved searches, notifications, and tracked application widgets are tied to your account session.</p>
                        <div className={styles.toolbarGroup}>
                            <Link href="/?login=1" className={styles.primaryButton}>Sign in</Link>
                            <Link href="/bookmarks" className={styles.secondaryButton}>Open bookmarks</Link>
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
                    <div className={styles.accountHero}>
                        <span className={styles.avatar}>{(user.username || user.email)[0]?.toUpperCase()}</span>
                        <span className={styles.heroKicker}>Member dashboard</span>
                        <h1 className={styles.heroTitle}>{user.username}</h1>
                        <p className={styles.heroSub}>Keep your focus areas, saved alerts, tracked deadlines, and recent reads in one stable dashboard.</p>
                        <div className={styles.metaChips}>
                            <span className={styles.metaChip}><Icon name="User" size={15} />{user.email}</span>
                            <span className={styles.metaChip}><Icon name="ShieldCheck" size={15} />{user.role}</span>
                            {user.createdAt ? <span className={styles.metaChip}><Icon name="CalendarClock" size={15} />Joined {formatDate(user.createdAt)}</span> : null}
                        </div>
                    </div>

                    <div className={styles.heroStats}>
                        <div className={styles.statCard}><span className={styles.statLabel}>Upcoming deadlines</span><strong className={styles.statValue}>{widgets?.upcomingDeadlines.length ?? 0}</strong></div>
                        <div className={styles.statCard}><span className={styles.statLabel}>Saved searches</span><strong className={styles.statValue}>{savedSearches.length + localSearches.length}</strong></div>
                        <div className={styles.statCard}><span className={styles.statLabel}>Notifications</span><strong className={styles.statValue}>{notifications.length}</strong></div>
                        <div className={styles.statCard}><span className={styles.statLabel}>Tracked applications</span><strong className={styles.statValue}>{trackedApplications.length}</strong></div>
                    </div>
                </div>
            </section>

            <PublicCategoryRail />

            <div className={styles.contentGrid}>
                <div className={styles.mainStack}>
                    <section className={styles.panel}>
                        <div className={styles.panelHeaderBlock}>
                            <p className={styles.sectionEyebrow}>Focus areas</p>
                            <h2 className={styles.panelTitle}>Tune what the product should emphasize for you</h2>
                        </div>
                        <div className={styles.chipRow}>
                            {(Object.keys(CATEGORY_META) as ContentType[]).map((type) => (
                                <button key={type} type="button" className={`${styles.preferenceChip}${interests.includes(type) ? ` ${styles.preferenceChipActive}` : ''}`} onClick={() => toggleInterest(type)}>
                                    {CATEGORY_META[type].shortEn}
                                </button>
                            ))}
                        </div>
                    </section>

                    <div className={styles.dashboardGrid}>
                        <section className={styles.dashboardCard}>
                            <div className={styles.panelHeaderBlock}>
                                <p className={styles.sectionEyebrow}>Tracked applications</p>
                                <h2 className={styles.panelTitle}>Status queue</h2>
                            </div>
                            <div className={styles.moduleList}>
                                {trackedApplications.length === 0 ? (
                                    <p className={styles.sectionCopy}>No tracked applications yet.</p>
                                ) : trackedApplications.slice(0, 6).map((item) => (
                                    <Link key={item.id} href={`/${item.type}/${item.slug}`} className={styles.moduleLink}>
                                        <span className={styles.railItemTitle}>{item.title}</span>
                                        <span className={styles.listMeta}>
                                            <span>{item.status}</span>
                                            {item.deadline ? <span>{formatDate(item.deadline)}</span> : null}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </section>

                        <section className={styles.dashboardCard}>
                            <div className={styles.panelHeaderBlock}>
                                <p className={styles.sectionEyebrow}>Notifications</p>
                                <h2 className={styles.panelTitle}>Latest account signals</h2>
                            </div>
                            <div className={styles.moduleList}>
                                {notifications.length === 0 ? (
                                    <p className={styles.sectionCopy}>No recent notifications.</p>
                                ) : notifications.map((item) => (
                                    <div key={item.id} className={styles.listCard}>
                                        <span className={styles.railItemTitle}>{item.title}</span>
                                        <span className={styles.listMeta}>
                                            <span>{item.source}</span>
                                            <span>{formatDate(item.createdAt)}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className={styles.dashboardCard}>
                            <div className={styles.panelHeaderBlock}>
                                <p className={styles.sectionEyebrow}>Saved searches</p>
                                <h2 className={styles.panelTitle}>Backend alerts</h2>
                            </div>
                            <div className={styles.moduleList}>
                                {savedSearches.length === 0 ? (
                                    <p className={styles.sectionCopy}>No account-synced saved searches yet.</p>
                                ) : savedSearches.map((item) => (
                                    <div key={item.id} className={styles.listCard}>
                                        <span className={styles.railItemTitle}>{item.name}</span>
                                        <span className={styles.listMeta}>
                                            <span>{item.frequency}</span>
                                            <span>{item.notificationsEnabled ? 'Notifications on' : 'Notifications off'}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className={styles.dashboardCard}>
                            <div className={styles.panelHeaderBlock}>
                                <p className={styles.sectionEyebrow}>Recent views</p>
                                <h2 className={styles.panelTitle}>Continue from your reading trail</h2>
                            </div>
                            <div className={styles.moduleList}>
                                {recentViews.length === 0 ? (
                                    <p className={styles.sectionCopy}>No recent reads yet.</p>
                                ) : recentViews.map((item) => (
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
                    </div>
                </div>

                <aside className={styles.sideStack}>
                    <section className={styles.panel}>
                        <div className={styles.panelHeaderBlock}>
                            <p className={styles.sectionEyebrow}>Widget snapshot</p>
                            <h2 className={styles.panelTitle}>14-day signal</h2>
                        </div>
                        <div className={styles.moduleList}>
                            <div className={styles.listCard}>
                                <span className={styles.railItemTitle}>Recommendations</span>
                                <span className={styles.listMeta}><span>{widgets?.recommendationCount ?? 0} matched items</span></span>
                            </div>
                            <div className={styles.listCard}>
                                <span className={styles.railItemTitle}>Saved-search matches</span>
                                <span className={styles.listMeta}><span>{widgets?.savedSearchMatches ?? 0} new matches</span></span>
                            </div>
                        </div>
                    </section>

                    <section className={styles.panel}>
                        <div className={styles.panelHeaderBlock}>
                            <p className={styles.sectionEyebrow}>Local drafts</p>
                            <h2 className={styles.panelTitle}>Browser-only saved searches</h2>
                        </div>
                        <div className={styles.moduleList}>
                            {localSearches.length === 0 ? (
                                <p className={styles.sectionCopy}>Save a category search to see it here.</p>
                            ) : localSearches.map((item) => (
                                <Link key={item.id} href={`/jobs?q=${encodeURIComponent(item.query)}`} className={styles.moduleLink}>
                                    <span className={styles.railItemTitle}>{item.name}</span>
                                    <span className={styles.listMeta}>
                                        <span>{item.query}</span>
                                        <span>{formatDate(item.createdAt)}</span>
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
