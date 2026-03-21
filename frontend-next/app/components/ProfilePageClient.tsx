'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PublicCategoryRail } from '@/app/components/PublicCategoryRail';
import { useAuth } from '@/app/lib/useAuth';
import {
    getProfileWidgets,
    getProfileSavedSearches,
    getProfileNotifications,
    getTrackedApplications,
    type ProfileWidgetData,
    type SavedSearchItem,
    type TrackedApplicationItem,
    type UserNotificationItem,
} from '@/app/lib/api';
import '@/app/components/PublicSurface.css';

function buildAnnouncementDetailPath(type: string, slug: string) {
    return `/${type}/${slug}`;
}

function formatDate(value?: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ProfilePage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');
    const [loadingUtilities, setLoadingUtilities] = useState(true);
    const [widgets, setWidgets] = useState<ProfileWidgetData | null>(null);
    const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);
    const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
    const [trackedApps, setTrackedApps] = useState<TrackedApplicationItem[]>([]);

    useEffect(() => {
        if (!user) return;
        let mounted = true;

        (async () => {
            setLoadingUtilities(true);
            try {
                const [widgetsRes, savedRes, notificationsRes, trackedRes] = await Promise.allSettled([
                    getProfileWidgets(7),
                    getProfileSavedSearches(),
                    getProfileNotifications(8),
                    getTrackedApplications(),
                ]);

                if (!mounted) return;
                if (widgetsRes.status === 'fulfilled') setWidgets(widgetsRes.value.data);
                if (savedRes.status === 'fulfilled') setSavedSearches(savedRes.value.data || []);
                if (notificationsRes.status === 'fulfilled') setNotifications(notificationsRes.value.data || []);
                if (trackedRes.status === 'fulfilled') setTrackedApps(trackedRes.value.data || []);
            } catch (error) {
                console.error('Failed to fetch profile utilities:', error);
            } finally {
                if (mounted) setLoadingUtilities(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [user]);

    const trackedCount = useMemo(() => {
        if (!widgets) return 0;
        return Object.values(widgets.trackedCounts || {}).reduce((sum, count) => sum + count, 0);
    }, [widgets]);

    if (!user) {
        return (
            <div className="hp public-shell">
                <section className="public-hero">
                    <span className="public-kicker">Personal Workspace</span>
                    <div className="public-hero-grid">
                        <div className="public-hero-main">
                            <h1 className="public-title">
                                Profile <span className="public-title-accent">Dashboard</span>
                            </h1>
                            <p className="public-sub">
                                Track saved searches, notifications, and application activity from one personal workspace. Sign in from the header to unlock your profile data.
                            </p>
                        </div>
                    </div>
                </section>

                <PublicCategoryRail />

                <section className="public-panel public-auth-prompt">
                    <div className="public-empty-state">
                        <span className="public-empty-icon">👤</span>
                        <h3>Sign in to view your profile</h3>
                        <p>Your personal dashboard is available after login. Use the Sign In action in the header, then come back here to view saved searches, notifications, and tracked applications.</p>
                        <div className="public-actions-row">
                            <Link href="/" className="public-secondary-link">Go to Home</Link>
                            <Link href="/bookmarks" className="public-secondary-link">Open Bookmarks</Link>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="hp public-shell">
            <section className="public-hero">
                <span className="public-kicker">Personal Workspace</span>
                <div className="public-hero-grid">
                    <div className="public-hero-main">
                        <div className="public-profile-header">
                            <div className="public-profile-avatar">
                                {(user.username || user.email || '?')[0].toUpperCase()}
                            </div>
                            <div>
                                <h1 className="public-profile-name">{user.username}</h1>
                                <p className="public-sub">Your saved alerts, tracked applications, and personal update activity in one place.</p>
                                <div className="public-profile-meta">
                                    <span className="public-profile-chip">✉ {user.email}</span>
                                    <span className="public-profile-chip">🔐 {user.role}</span>
                                    <span className="public-profile-chip">✅ {user.isActive === false ? 'Inactive' : 'Active'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="public-hero-stats">
                        {user.createdAt && (
                            <div className="public-stat-card">
                                <span className="public-stat-value">{new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                                <span className="public-stat-label">Joined</span>
                            </div>
                        )}
                        <div className="public-stat-card">
                            <span className="public-stat-value">{trackedCount}</span>
                            <span className="public-stat-label">Tracked items</span>
                        </div>
                        <div className="public-stat-card">
                            <span className="public-stat-value">{savedSearches.length}</span>
                            <span className="public-stat-label">Saved searches</span>
                        </div>
                    </div>
                </div>
            </section>

            <PublicCategoryRail />

            <div className="public-tablist" role="tablist" aria-label="Profile tabs">
                <button
                    type="button"
                    className={`public-tab${activeTab === 'overview' ? ' active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button
                    type="button"
                    className={`public-tab${activeTab === 'settings' ? ' active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                >
                    Settings
                </button>
            </div>

            {activeTab === 'overview' && (
                <div className="public-profile-grid">
                    <section className="public-panel">
                        <div className="public-panel-header">
                            <div>
                                <h2 className="public-panel-title">Tracked Applications</h2>
                                <p className="public-panel-copy">Monitor your active recruitment or admission tracking list.</p>
                            </div>
                        </div>
                        {loadingUtilities ? (
                            <p className="public-panel-copy">Loading tracked items...</p>
                        ) : trackedApps.length === 0 ? (
                            <div className="public-empty-state">
                                <span className="public-empty-icon">🧾</span>
                                <h3>No tracked applications</h3>
                                <p>Once you start tracking announcements, the latest status will show here.</p>
                            </div>
                        ) : (
                            <div className="public-list">
                                {trackedApps.slice(0, 5).map((item) => (
                                    <div key={item.id} className="public-list-item">
                                        <Link href={buildAnnouncementDetailPath(item.type, item.slug)}>{item.title}</Link>
                                        <span className="public-list-meta">{item.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="public-panel">
                        <div className="public-panel-header">
                            <div>
                                <h2 className="public-panel-title">Notifications</h2>
                                <p className="public-panel-copy">Recent account and announcement notifications.</p>
                            </div>
                        </div>
                        {loadingUtilities ? (
                            <p className="public-panel-copy">Loading notifications...</p>
                        ) : notifications.length === 0 ? (
                            <div className="public-empty-state">
                                <span className="public-empty-icon">🔔</span>
                                <h3>No recent notifications</h3>
                                <p>New alerts and saved-search updates will appear here.</p>
                            </div>
                        ) : (
                            <div className="public-list">
                                {notifications.slice(0, 5).map((item) => (
                                    <div key={item.id} className="public-list-item">
                                        {item.slug ? (
                                            <Link href={buildAnnouncementDetailPath(item.type, item.slug)}>{item.title}</Link>
                                        ) : (
                                            <strong>{item.title}</strong>
                                        )}
                                        <span className="public-list-meta">{formatDate(item.createdAt)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="public-panel">
                        <div className="public-panel-header">
                            <div>
                                <h2 className="public-panel-title">Saved Searches</h2>
                                <p className="public-panel-copy">Queries you have stored for repeated notification tracking.</p>
                            </div>
                        </div>
                        {loadingUtilities ? (
                            <p className="public-panel-copy">Loading saved searches...</p>
                        ) : savedSearches.length === 0 ? (
                            <div className="public-empty-state">
                                <span className="public-empty-icon">🔎</span>
                                <h3>No saved searches</h3>
                                <p>Create a few targeted searches and they will appear here for quick reuse.</p>
                            </div>
                        ) : (
                            <div className="public-list">
                                {savedSearches.slice(0, 5).map((item) => (
                                    <div key={item.id} className="public-list-item">
                                        <strong>{item.name}</strong>
                                        <span className="public-list-meta">{item.frequency}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="public-panel">
                        <div className="public-panel-header">
                            <div>
                                <h2 className="public-panel-title">Widget Snapshot</h2>
                                <p className="public-panel-copy">A quick pulse of upcoming deadlines and recommendation signals.</p>
                            </div>
                        </div>
                        {loadingUtilities || !widgets ? (
                            <p className="public-panel-copy">Loading widget summary...</p>
                        ) : (
                            <div className="public-mini-stat-grid">
                                <div className="public-stat-card">
                                    <span className="public-stat-value">{widgets.upcomingDeadlines.length}</span>
                                    <span className="public-stat-label">Upcoming deadlines</span>
                                </div>
                                <div className="public-stat-card">
                                    <span className="public-stat-value">{widgets.recommendationCount}</span>
                                    <span className="public-stat-label">Recommendations</span>
                                </div>
                                <div className="public-stat-card">
                                    <span className="public-stat-value">{widgets.savedSearchMatches}</span>
                                    <span className="public-stat-label">Search matches</span>
                                </div>
                                <div className="public-stat-card">
                                    <span className="public-stat-value">{widgets.windowDays}</span>
                                    <span className="public-stat-label">Window days</span>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            )}

            {activeTab === 'settings' && (
                <section className="public-panel">
                    <div className="public-panel-header">
                        <div>
                            <h2 className="public-panel-title">Account Settings</h2>
                            <p className="public-panel-copy">This area remains intentionally light for now, but the shell is aligned with the rest of the public site.</p>
                        </div>
                    </div>
                    <div className="public-static-section">
                        <p>Authentication, notification preferences, and alert tuning still rely on the existing backend endpoints and account flows.</p>
                        <p>When the next pass lands, this settings area can expand into a full self-service preferences panel without changing the overall public design system again.</p>
                    </div>
                </section>
            )}
        </div>
    );
}
