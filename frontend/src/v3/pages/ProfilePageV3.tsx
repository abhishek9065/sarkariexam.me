import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SEOHead } from '../../components/seo/SEOHead';
import { API_BASE } from '../../utils';
import { fetchDashboardWidgets } from '../../utils/api';
import { formatDate } from '../../utils';
import type { Announcement, DashboardWidgetPayload, TrackedApplication, TrackerStatus } from '../../types';
import { AppShell } from '../app/AppShell';
import { CompareDrawerV3 } from '../components/shared/CompareDrawerV3';
import { AnnouncementListDense } from '../components/shared/AnnouncementListDense';
import { WidgetCardsV3 } from '../components/shared/WidgetCardsV3';
import { useCompareV3 } from '../hooks/useCompareV3';
import { useGlobalSearchV3 } from '../hooks/useGlobalSearchV3';
import { useTrackerV3 } from '../hooks/useTrackerV3';

interface Recommendation extends Announcement {
    matchScore?: number;
}

interface SavedSearchItem {
    id: string;
    name: string;
    query: string;
    frequency: string;
    notificationsEnabled: boolean;
}

interface AlertDigest {
    totalMatches: number;
    generatedAt: string;
}

const TRACKER_STEPS: TrackerStatus[] = ['saved', 'applied', 'admit-card', 'exam', 'result'];

const nextStatus = (status: TrackerStatus): TrackerStatus => {
    const index = TRACKER_STEPS.indexOf(status);
    if (index < 0 || index >= TRACKER_STEPS.length - 1) return status;
    return TRACKER_STEPS[index + 1];
};

export function ProfilePageV3() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, token } = useAuth();

    const compare = useCompareV3();
    const tracker = useTrackerV3();

    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);
    const [digest, setDigest] = useState<AlertDigest | null>(null);
    const [widgets, setWidgets] = useState<DashboardWidgetPayload | null>(null);
    const [loading, setLoading] = useState(true);

    const search = useGlobalSearchV3({
        onOpenDetail: (type, slug) => navigate(`/${type}/${slug}`),
        onOpenCategory: (filter, query) => {
            const base = filter === 'result' ? '/results' : filter === 'admit-card' ? '/admit-card' : '/jobs';
            navigate(`${base}?search=${encodeURIComponent(query)}`);
        },
    });

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        let active = true;
        setLoading(true);

        const headers = { Authorization: `Bearer ${token}` };

        Promise.all([
            fetch(`${API_BASE}/api/profile/recommendations?limit=12`, { headers }).then((res) => res.ok ? res.json() : { data: [] }),
            fetch(`${API_BASE}/api/profile/saved-searches`, { headers }).then((res) => res.ok ? res.json() : { data: [] }),
            fetch(`${API_BASE}/api/profile/digest-preview?windowDays=7&limit=6`, { headers }).then((res) => res.ok ? res.json() : { data: null }),
            fetchDashboardWidgets(token, 7).catch(() => null),
        ])
            .then(([recommendationRes, savedRes, digestRes, widgetsRes]) => {
                if (!active) return;
                setRecommendations(Array.isArray(recommendationRes.data) ? recommendationRes.data : []);
                setSavedSearches(Array.isArray(savedRes.data) ? savedRes.data : []);
                setDigest(digestRes.data || null);
                setWidgets(widgetsRes);
            })
            .catch((error) => {
                console.error('Profile fetch failed:', error);
            })
            .finally(() => {
                if (!active) return;
                setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [token]);

    const trackedSlugs = useMemo(() => new Set(tracker.items.map((item) => item.slug)), [tracker.items]);

    const trackerSeeds = useMemo<Announcement[]>(() => tracker.items.map((item: TrackedApplication) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        type: item.type,
        organization: item.organization || 'Government',
        deadline: item.deadline,
        category: 'Tracked',
        postedAt: item.trackedAt,
        updatedAt: item.updatedAt,
        isActive: true,
        viewCount: 0,
    })), [tracker.items]);

    const recommendationItems: Announcement[] = recommendations.map((item) => item as Announcement);

    if (!isAuthenticated) {
        return (
            <>
                <SEOHead
                    title="Profile"
                    description="Sign in to unlock tracker board, recommendations, and personalized widgets."
                    canonicalUrl={`${window.location.origin}${location.pathname}`}
                />
                <AppShell search={search} compareCount={compare.selections.length} onOpenCompare={compare.open}>
                    <section className="sr3-section sr3-surface">
                        <h1 className="sr3-home-title">Sign in required</h1>
                        <p className="sr3-section-subtitle">Login to access your personalized dashboard and tracker board.</p>
                        <button type="button" className="sr3-btn" onClick={() => navigate('/profile')}>Open Login</button>
                    </section>
                </AppShell>
            </>
        );
    }

    return (
        <>
            <SEOHead
                title="My Dashboard"
                description="Personalized Sarkari dashboard with tracker board, recommendations, and saved alerts."
                canonicalUrl={`${window.location.origin}${location.pathname}${location.search}`}
                keywords={['profile dashboard', 'application tracker', 'sarkari alerts']}
            />

            <AppShell search={search} compareCount={compare.selections.length} onOpenCompare={compare.open}>
                <section className="sr3-section sr3-surface sr3-category-head">
                    <div>
                        <h1 className="sr3-home-title">My Dashboard</h1>
                        <p className="sr3-section-subtitle">Tracker + recommendations + saved alerts in one dense workspace.</p>
                    </div>
                    {digest && (
                        <div className="sr3-meta-row">
                            <span className="sr3-badge blue">Weekly matches: {digest.totalMatches}</span>
                            <span className="sr3-badge green">Updated: {formatDate(digest.generatedAt)}</span>
                        </div>
                    )}
                </section>

                {loading && <div className="sr3-surface sr3-loading">Loading profile dashboard...</div>}

                {!loading && (
                    <>
                        <WidgetCardsV3
                            widgets={widgets}
                            signedIn
                            trending={recommendationItems}
                            onOpenTracker={() => {
                                const target = document.getElementById('sr3-tracker-board');
                                target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            onOpenCompare={compare.open}
                        />

                        <section id="sr3-tracker-board" className="sr3-section sr3-surface">
                            <header className="sr3-card-head">
                                <div>
                                    <h2 className="sr3-section-title">Application Tracker Board</h2>
                                    <p className="sr3-section-subtitle">Update status quickly and continue from where you left.</p>
                                </div>
                                <div className="sr3-meta-row">
                                    <span className="sr3-badge blue">Saved {tracker.statusCounts.saved}</span>
                                    <span className="sr3-badge green">Applied {tracker.statusCounts.applied}</span>
                                    <span className="sr3-badge orange">Admit {tracker.statusCounts['admit-card']}</span>
                                    <span className="sr3-badge red">Exam {tracker.statusCounts.exam}</span>
                                </div>
                            </header>

                            {tracker.items.length === 0 && <p className="sr3-empty">No tracked applications yet.</p>}

                            {tracker.items.length > 0 && (
                                <ol className="sr3-dense-items">
                                    {tracker.items.map((item) => (
                                        <li key={item.id} className="sr3-dense-item">
                                            <div className="sr3-dense-main">
                                                <Link to={`/${item.type}/${item.slug}`} className="sr3-dense-link">{item.title}</Link>
                                                <div className="sr3-dense-meta">
                                                    <span>{item.organization || '-'}</span>
                                                    <span>Status: {item.status}</span>
                                                    {item.deadline && <span>Deadline: {formatDate(item.deadline)}</span>}
                                                </div>
                                            </div>
                                            <div className="sr3-dense-actions">
                                                <button
                                                    type="button"
                                                    className="sr3-btn secondary"
                                                    onClick={() => { void tracker.updateStatus(item.slug, nextStatus(item.status)); }}
                                                >
                                                    Next Status
                                                </button>
                                                <button type="button" className="sr3-btn secondary" onClick={() => { void tracker.untrack(item.slug); }}>
                                                    Remove
                                                </button>
                                                {item.type === 'job' && (
                                                    <button
                                                        type="button"
                                                        className="sr3-btn secondary"
                                                        onClick={() => {
                                                            const linked = recommendationItems.find((entry) => entry.slug === item.slug)
                                                                || trackerSeeds.find((entry) => entry.slug === item.slug);
                                                            if (!linked) return;
                                                            compare.add(linked);
                                                            compare.open();
                                                        }}
                                                    >
                                                        Compare
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </section>

                        <section className="sr3-section sr3-two-col">
                            <AnnouncementListDense
                                title="Recommended For You"
                                subtitle="Personalized shortlist from your profile"
                                items={recommendationItems}
                                limit={10}
                                onCompareAdd={(item) => {
                                    compare.add(item);
                                    compare.open();
                                }}
                                onTrackToggle={(item) => {
                                    if (tracker.isTracked(item.slug)) {
                                        void tracker.untrack(item.slug);
                                        return;
                                    }
                                    void tracker.trackAnnouncement(item, 'saved');
                                }}
                                trackedSlugs={trackedSlugs}
                                footerLink={{ label: 'See all recommendations', to: '/profile?section=recommendations' }}
                            />

                            <section className="sr3-surface sr3-dense-list">
                                <header className="sr3-card-head">
                                    <div>
                                        <h2 className="sr3-section-title">Saved Searches and Alerts</h2>
                                        <p className="sr3-section-subtitle">Quick view of your subscription criteria.</p>
                                    </div>
                                </header>

                                {savedSearches.length === 0 && <p className="sr3-empty">No saved searches yet.</p>}
                                {savedSearches.length > 0 && (
                                    <ol className="sr3-dense-items">
                                        {savedSearches.slice(0, 8).map((searchItem) => (
                                            <li key={searchItem.id} className="sr3-dense-item">
                                                <div className="sr3-dense-main">
                                                    <strong>{searchItem.name}</strong>
                                                    <div className="sr3-dense-meta">
                                                        <span>Query: {searchItem.query || '-'}</span>
                                                        <span>{searchItem.frequency}</span>
                                                        <span>{searchItem.notificationsEnabled ? 'Alerts On' : 'Alerts Off'}</span>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                )}

                                <footer className="sr3-card-foot">
                                    <Link to="/profile?section=saved" className="sr3-inline-link">Manage saved searches</Link>
                                    <Link to="/profile?section=alerts" className="sr3-inline-link">Open alert digest</Link>
                                </footer>
                            </section>
                        </section>
                    </>
                )}
            </AppShell>

            <CompareDrawerV3
                open={compare.isOpen}
                items={compare.selections}
                maxItems={compare.maxItems}
                onClose={compare.close}
                onClear={compare.clear}
                onRemove={compare.remove}
                onViewJob={(job) => {
                    navigate(`/${job.type}/${job.slug}`);
                    compare.close();
                }}
            />
        </>
    );
}

export default ProfilePageV3;
