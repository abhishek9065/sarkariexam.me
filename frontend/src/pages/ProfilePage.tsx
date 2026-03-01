import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/useAuth';
import {
    getProfileWidgets,
    getProfileSavedSearches,
    getProfileNotifications,
    getTrackedApplications,
    type ProfileWidgetData,
    type SavedSearchItem,
    type TrackedApplicationItem,
    type UserNotificationItem,
} from '../utils/api';
import { buildAnnouncementDetailPath } from '../utils/trackingLinks';

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
                if (mounted) {
                    setLoadingUtilities(false);
                }
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

    if (!user) return null;

    return (
        <Layout>
            <div className="profile-page animate-fade-in">
                <div className="profile-header">
                    <div className="profile-avatar-lg">
                        {(user.username || user.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="profile-header-info">
                        <h1 className="profile-name">{user.username}</h1>
                        <p className="text-muted">{user.email}</p>
                        <span className={`badge badge-${user.role === 'admin' ? 'job' : 'result'}`}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                    </div>
                </div>

                <div className="profile-tabs">
                    <button
                        type="button"
                        className={`profile-tab${activeTab === 'overview' ? ' active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button
                        type="button"
                        className={`profile-tab${activeTab === 'settings' ? ' active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        Settings
                    </button>
                </div>

                {activeTab === 'overview' && (
                    <div className="profile-overview profile-utility-overview">
                        <div className="profile-stats-grid">
                            {user.createdAt && (
                                <ProfileStatCard
                                    icon="📅"
                                    label="Joined"
                                    value={new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                                />
                            )}
                            <ProfileStatCard icon="🔐" label="Role" value={user.role} />
                            <ProfileStatCard icon="✅" label="Status" value={user.isActive === false ? 'Inactive' : 'Active'} />
                            <ProfileStatCard icon="🧾" label="Tracked" value={`${trackedCount}`} />
                        </div>

                        <div className="profile-utility-grid">
                            <section className="card profile-utility-card">
                                <h3>Tracked Applications</h3>
                                {loadingUtilities ? (
                                    <p className="text-muted">Loading...</p>
                                ) : trackedApps.length === 0 ? (
                                    <p className="text-muted">No tracked applications yet.</p>
                                ) : (
                                    <ul className="profile-mini-list">
                                        {trackedApps.slice(0, 5).map((item) => (
                                            <li key={item.id}>
                                                <Link to={buildAnnouncementDetailPath(item.type, item.slug, 'profile_tracked')}>
                                                    {item.title}
                                                </Link>
                                                <span>{item.status}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            <section className="card profile-utility-card">
                                <h3>Notifications</h3>
                                {loadingUtilities ? (
                                    <p className="text-muted">Loading...</p>
                                ) : notifications.length === 0 ? (
                                    <p className="text-muted">No recent notifications.</p>
                                ) : (
                                    <ul className="profile-mini-list">
                                        {notifications.slice(0, 5).map((item) => (
                                            <li key={item.id}>
                                                {item.slug ? (
                                                    <Link to={buildAnnouncementDetailPath(item.type, item.slug, 'profile_notifications')}>
                                                        {item.title}
                                                    </Link>
                                                ) : (
                                                    <span>{item.title}</span>
                                                )}
                                                <span>{formatDate(item.createdAt)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            <section className="card profile-utility-card">
                                <h3>Saved Searches</h3>
                                {loadingUtilities ? (
                                    <p className="text-muted">Loading...</p>
                                ) : savedSearches.length === 0 ? (
                                    <p className="text-muted">No saved searches yet.</p>
                                ) : (
                                    <ul className="profile-mini-list">
                                        {savedSearches.slice(0, 5).map((item) => (
                                            <li key={item.id}>
                                                <span>{item.name}</span>
                                                <span>{item.frequency}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            <section className="card profile-utility-card">
                                <h3>Widget Snapshot</h3>
                                {loadingUtilities || !widgets ? (
                                    <p className="text-muted">Loading...</p>
                                ) : (
                                    <div className="profile-widget-summary">
                                        <p><strong>{widgets.upcomingDeadlines.length}</strong> upcoming deadlines</p>
                                        <p><strong>{widgets.recommendationCount}</strong> recommendations</p>
                                        <p><strong>{widgets.savedSearchMatches}</strong> saved-search matches</p>
                                        <p className="text-muted">Window: last {widgets.windowDays} days</p>
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="profile-settings card">
                        <h3>Account Settings</h3>
                        <p className="text-muted">
                            Settings UI is intentionally minimal in this phase. Authentication, preferences, and alert tuning remain available through existing backend endpoints.
                        </p>
                    </div>
                )}
            </div>
        </Layout>
    );
}

function ProfileStatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <div className="card profile-stat-card">
            <span className="profile-stat-icon">{icon}</span>
            <span className="profile-stat-label">{label}</span>
            <span className="profile-stat-value">{value}</span>
        </div>
    );
}
