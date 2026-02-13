import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchDashboardWidgets } from '../../utils/api';
import { SEOHead } from '../../components/seo/SEOHead';
import type { Announcement, DashboardWidgetPayload } from '../../types';
import { AppShell } from '../app/AppShell';
import { useGlobalSearchV3 } from '../hooks/useGlobalSearchV3';
import { useHomeCompositionV3 } from '../hooks/useDiscoveryDataV3';
import { useCompareV3 } from '../hooks/useCompareV3';
import { useTrackerV3 } from '../hooks/useTrackerV3';
import { HomeTickerV3 } from '../components/home/HomeTickerV3';
import { FeaturedActionGridV3 } from '../components/home/FeaturedActionGridV3';
import { HomeDenseColumnsV3 } from '../components/home/HomeDenseColumnsV3';
import { AnnouncementListDense } from '../components/shared/AnnouncementListDense';
import { CompareDrawerV3 } from '../components/shared/CompareDrawerV3';
import { WidgetCardsV3 } from '../components/shared/WidgetCardsV3';

const QUICK_CATEGORIES = [
    { label: 'Jobs', to: '/jobs' },
    { label: 'Results', to: '/results' },
    { label: 'Admit Card', to: '/admit-card' },
    { label: 'Answer Key', to: '/answer-key' },
    { label: 'Syllabus', to: '/syllabus' },
    { label: 'Admission', to: '/admission' },
    { label: 'Profile', to: '/profile' },
    { label: 'Community', to: '/community' },
    { label: 'Latest Jobs', to: '/jobs?sort=latest' },
    { label: 'Closing Soon', to: '/jobs?sort=deadline' },
    { label: 'High Posts', to: '/jobs?sort=posts' },
    { label: 'Trending', to: '/jobs?sort=views' },
];

export function HomePageV3() {
    const navigate = useNavigate();
    const { token, isAuthenticated } = useAuth();
    const home = useHomeCompositionV3();
    const compare = useCompareV3();
    const tracker = useTrackerV3();
    const [widgets, setWidgets] = useState<DashboardWidgetPayload | null>(null);

    const search = useGlobalSearchV3({
        onOpenDetail: (type, slug) => navigate(`/${type}/${slug}`),
        onOpenCategory: (filter, query) => {
            const path = filter === 'result'
                ? '/results'
                : filter === 'admit-card'
                    ? '/admit-card'
                    : '/jobs';
            const params = new URLSearchParams({ search: query });
            navigate(`${path}?${params.toString()}`);
        },
    });

    useEffect(() => {
        if (!token) {
            setWidgets(null);
            return;
        }
        let active = true;
        fetchDashboardWidgets(token, 7)
            .then((payload) => {
                if (!active) return;
                setWidgets(payload);
            })
            .catch((error) => {
                console.error('Failed to load home widgets:', error);
                if (!active) return;
                setWidgets(null);
            });
        return () => {
            active = false;
        };
    }, [token]);

    const trackedSlugs = useMemo(() => new Set(tracker.items.map((item) => item.slug)), [tracker.items]);

    const toggleTrack = async (item: Announcement) => {
        if (tracker.isTracked(item.slug)) {
            await tracker.untrack(item.slug);
            return;
        }
        await tracker.trackAnnouncement(item, 'saved');
    };

    const canonical = `${window.location.origin}/`;

    const trending = home.data?.trending || [];
    const deadlines = home.data?.upcomingDeadlines || [];

    return (
        <>
            <SEOHead
                title="Government Jobs, Results, Admit Card Updates"
                description="Dense and fast discovery for Sarkari jobs, results, admit cards, answer keys, and admissions."
                canonicalUrl={canonical}
                keywords={['sarkari result', 'government job', 'admit card', 'latest jobs']}
            />

            <AppShell search={search} compareCount={compare.selections.length} onOpenCompare={compare.open}>
                <section className="sr3-section sr3-surface sr3-home-hero">
                    <div>
                        <h1 className="sr3-home-title">Find Your Next Sarkari Opportunity</h1>
                        <p className="sr3-section-subtitle">
                            High-density updates with one-click detail access and trust-first official links.
                        </p>
                    </div>
                    <div className="sr3-home-search-row">
                        <button type="button" className="sr3-btn" onClick={search.openSearch}>
                            Open Global Search
                        </button>
                        <span className="sr3-section-subtitle">Shortcut: Ctrl/Cmd + K</span>
                    </div>
                    <div className="sr3-link-grid">
                        {QUICK_CATEGORIES.map((item) => (
                            <Link key={item.to + item.label} to={item.to} className="sr3-link-chip">
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </section>

                {home.data && <HomeTickerV3 items={home.data.urgent} />}

                {home.loading && <div className="sr3-surface sr3-loading">Loading homepage sections...</div>}
                {home.error && (
                    <div className="sr3-surface sr3-section">
                        <div className="sr3-error">{home.error}</div>
                        <button type="button" className="sr3-btn secondary" onClick={() => { void home.refresh(); }}>
                            Retry
                        </button>
                    </div>
                )}

                {home.data && (
                    <>
                        <FeaturedActionGridV3 items={home.data.featured} onCompareAdd={compare.add} />

                        <section className="sr3-section sr3-surface">
                            <header className="sr3-card-head">
                                <div>
                                    <h2 className="sr3-section-title">State Wise Quick Links</h2>
                                    <p className="sr3-section-subtitle">One tap to filtered job discovery by state</p>
                                </div>
                            </header>
                            <div className="sr3-link-grid">
                                {home.data.stateLinks.map((state) => (
                                    <Link
                                        key={state.slug}
                                        to={`/jobs?location=${encodeURIComponent(state.label)}`}
                                        className="sr3-link-chip"
                                    >
                                        {state.label}
                                    </Link>
                                ))}
                            </div>
                        </section>

                        <HomeDenseColumnsV3
                            jobs={home.data.latestJobs}
                            results={home.data.latestResults}
                            admitCards={home.data.latestAdmitCards}
                            trackedSlugs={trackedSlugs}
                            onTrackToggle={(item) => { void toggleTrack(item); }}
                            onCompareAdd={compare.add}
                        />

                        <section className="sr3-section sr3-two-col">
                            <AnnouncementListDense
                                title="Trending Exams"
                                subtitle="Most viewed across all categories"
                                items={trending}
                                limit={12}
                                showTypeBadge
                                onCompareAdd={compare.add}
                                onTrackToggle={(item) => { void toggleTrack(item); }}
                                trackedSlugs={trackedSlugs}
                            />
                            <AnnouncementListDense
                                title="Upcoming Deadlines"
                                subtitle="Do not miss these closing windows"
                                items={deadlines}
                                limit={12}
                                onTrackToggle={(item) => { void toggleTrack(item); }}
                                trackedSlugs={trackedSlugs}
                            />
                        </section>

                        <WidgetCardsV3
                            widgets={widgets}
                            signedIn={isAuthenticated}
                            trending={home.data.trending}
                            onOpenTracker={() => navigate('/profile?section=tracker')}
                            onOpenCompare={compare.open}
                        />
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
                onViewJob={(item) => {
                    navigate(`/${item.type}/${item.slug}`);
                    compare.close();
                }}
            />
        </>
    );
}

export default HomePageV3;
