import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Navigation, Footer, Marquee, FeaturedGrid, SectionTable, SkeletonLoader, SocialButtons, SubscribeBox, StatsSection, ExamCalendar, ErrorState, MobileNav, ScrollToTop, CompareJobs } from '../components';
import { AuthModal } from '../components/modals/AuthModal';
import { GlobalSearchModal } from '../components/modals/GlobalSearchModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContextStore';
import { SECTIONS, type TabType, API_BASE, formatDate, formatNumber, getDaysRemaining } from '../utils';
import { fetchAnnouncements } from '../utils/api';
import { fetchJson } from '../utils/http';
import { prefetchAnnouncementDetail } from '../utils/prefetch';
import type { Announcement, ContentType } from '../types';
import './V2.css';

export function HomePage() {
    const [data, setData] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>(undefined);
    const [showCookieConsent, setShowCookieConsent] = useState(false);
    const [recommendations, setRecommendations] = useState<Announcement[]>([]);
    const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
    const [recommendationsLoading, setRecommendationsLoading] = useState(false);
    const [showCompareJobs, setShowCompareJobs] = useState(false);
    const navigate = useNavigate();
    const { user, token, logout, isAuthenticated } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const { t } = useLanguage();
    const LOAD_TIMEOUT_MS = 3000;
    const cookieConsentKey = 'cookieConsent';

    const readCookie = (name: string) => {
        if (typeof document === 'undefined') return null;
        const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
        return match ? decodeURIComponent(match[1]) : null;
    };

    const writeCookie = (name: string, value: string, days = 365) => {
        if (typeof document === 'undefined') return;
        const expires = new Date(Date.now() + days * 86400000).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
    };

    const getStoredConsent = () => {
        const cookieValue = readCookie(cookieConsentKey);
        if (cookieValue) return cookieValue;
        try {
            return localStorage.getItem(cookieConsentKey);
        } catch {
            try {
                return sessionStorage.getItem(cookieConsentKey);
            } catch {
                return null;
            }
        }
    };

    const setStoredConsent = (value: string) => {
        writeCookie(cookieConsentKey, value);
        try {
            localStorage.setItem(cookieConsentKey, value);
        } catch {
            try {
                sessionStorage.setItem(cookieConsentKey, value);
            } catch {
                // Ignore storage write errors; cookie already carries consent.
            }
        }
    };

    const runWhenIdle = (callback: () => void, timeout = 1200) => {
        const idleWindow = window as Window & {
            requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
            cancelIdleCallback?: (id: number) => void;
        };

        if (typeof idleWindow.requestIdleCallback === 'function' && typeof idleWindow.cancelIdleCallback === 'function') {
            const id = idleWindow.requestIdleCallback(callback, { timeout });
            return () => idleWindow.cancelIdleCallback?.(id);
        }
        const timer = setTimeout(callback, timeout);
        return () => clearTimeout(timer);
    };

    // Check for cookie consent
    useEffect(() => {
        const hasConsent = getStoredConsent();
        if (!hasConsent) {
            setShowCookieConsent(true);
        }
    }, []);

    const handleCookieConsent = (accepted: boolean) => {
        setStoredConsent(accepted ? 'accepted' : 'declined');
        setShowCookieConsent(false);
    };

    // Fetch announcements using shared helper
    useEffect(() => {
        let isActive = true;
        let didTimeout = false;
        const timeoutId = setTimeout(() => {
            if (!isActive) return;
            didTimeout = true;
            setError('This is taking longer than usual. Please retry.');
            setLoading(false);
        }, LOAD_TIMEOUT_MS);

        fetchAnnouncements()
            .then((items) => {
                if (!isActive || didTimeout) return;
                setData(items);
            })
            .catch((err) => {
                console.error(err);
                if (!isActive || didTimeout) return;
                setError('Unable to load announcements right now.');
            })
            .finally(() => {
                if (!isActive || didTimeout) return;
                clearTimeout(timeoutId);
                setLoading(false);
            });

        return () => {
            isActive = false;
            clearTimeout(timeoutId);
        };
    }, []);

    useEffect(() => {
        if (!token) {
            // Show popular jobs as fallback when not authenticated
            const popularJobs = data.filter(item => 
                item.type === 'job' && item.viewCount && item.viewCount > 1000
            ).slice(0, 6);
            setRecommendations(popularJobs);
            setRecommendationsError(null);
            setRecommendationsLoading(false);
            return;
        }
        setRecommendationsError(null);
        setRecommendationsLoading(true);
        const cancel = runWhenIdle(() => {
            fetchJson<{ data: Announcement[] }>(`${API_BASE}/api/profile/recommendations?limit=6`, {
                headers: { Authorization: `Bearer ${token}` },
            }, { timeoutMs: 6000, retries: 1 })
                .then((body) => {
                    const recommendations = body.data || [];
                    if (recommendations.length === 0) {
                        // Fallback to popular jobs if no personalized recommendations
                        const fallbackJobs = data.filter(item => 
                            item.type === 'job' && item.viewCount && item.viewCount > 500
                        ).slice(0, 6);
                        setRecommendations(fallbackJobs);
                    } else {
                        setRecommendations(recommendations);
                    }
                })
                .catch((err) => {
                    console.error(err);
                    // Provide fallback recommendations instead of showing error
                    const fallbackJobs = data.filter(item => 
                        item.type === 'job'
                    ).slice(0, 6);
                    setRecommendations(fallbackJobs);
                    // Only show error if no fallback data available
                    if (fallbackJobs.length === 0 && !loading) {
                        setRecommendationsError('No recommendations available yet. Please update your profile preferences.');
                    }
                })
                .finally(() => {
                    setRecommendationsLoading(false);
                });
        });
        return () => cancel();
    }, [token, data, loading]);

    // Get data by type for section display
    const getByType = (type: ContentType) => data.filter(item => item.type === type);
    const stats = {
        jobs: getByType('job').length,
        results: getByType('result').length,
        admitCards: getByType('admit-card').length,
        total: data.length
    };
    const spotlightItems = useMemo(
        () => [...data]
            .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
            .slice(0, 4),
        [data]
    );
    const closingSoonItems = useMemo(
        () => data
            .filter((item) => {
                const daysLeft = getDaysRemaining(item.deadline ?? undefined);
                return daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
            })
            .slice(0, 4),
        [data]
    );
    const latestFeed = useMemo(() => {
        const parseTime = (value?: string) => {
            if (!value) return 0;
            const time = new Date(value).getTime();
            return Number.isNaN(time) ? 0 : time;
        };
        return [...data]
            .sort((a, b) => {
                const timeB = Math.max(parseTime(b.updatedAt), parseTime(b.postedAt));
                const timeA = Math.max(parseTime(a.updatedAt), parseTime(a.postedAt));
                if (timeB !== timeA) return timeB - timeA;
                return (b.viewCount ?? 0) - (a.viewCount ?? 0);
            })
            .slice(0, 24);
    }, [data]);
    const featuredOpportunityItems = useMemo(() => {
        const jobs = data.filter((item) => item.type === 'job');
        return [...jobs]
            .sort((a, b) => {
                const postsDiff = (b.totalPosts ?? 0) - (a.totalPosts ?? 0);
                if (postsDiff !== 0) return postsDiff;
                return (b.viewCount ?? 0) - (a.viewCount ?? 0);
            })
            .slice(0, 12);
    }, [data]);
    const denseBoard = useMemo(() => {
        const rankByRecency = (items: Announcement[]) => {
            const parseTime = (value?: string) => {
                if (!value) return 0;
                const time = new Date(value).getTime();
                return Number.isNaN(time) ? 0 : time;
            };
            return [...items]
                .sort((a, b) => {
                    const timeB = Math.max(parseTime(b.updatedAt), parseTime(b.postedAt));
                    const timeA = Math.max(parseTime(a.updatedAt), parseTime(a.postedAt));
                    if (timeB !== timeA) return timeB - timeA;
                    return (b.viewCount ?? 0) - (a.viewCount ?? 0);
                })
                .slice(0, 20);
        };
        return {
            jobs: rankByRecency(data.filter((item) => item.type === 'job')),
            admitCards: rankByRecency(data.filter((item) => item.type === 'admit-card')),
            results: rankByRecency(data.filter((item) => item.type === 'result')),
        };
    }, [data]);
    const homeWidgetMetrics = useMemo(() => {
        const jobs = data.filter((item) => item.type === 'job');
        const closingSoonJobs = jobs.filter((item) => {
            const daysLeft = getDaysRemaining(item.deadline ?? undefined);
            return daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
        }).length;
        const highVacancyJobs = jobs.filter((item) => (item.totalPosts ?? 0) >= 500).length;
        const avgViews = jobs.length > 0
            ? Math.round(jobs.reduce((sum, item) => sum + (item.viewCount ?? 0), 0) / jobs.length)
            : 0;

        return {
            recommendationReady: recommendations.length,
            closingSoonJobs,
            highVacancyJobs,
            avgViews,
        };
    }, [data, recommendations.length]);
    const intelligenceMetrics = useMemo(() => {
        const today = new Date().toDateString();
        let totalViews = 0;
        let sourceReady = 0;
        let freshToday = 0;
        let highIntent = 0;

        for (const item of data) {
            totalViews += item.viewCount ?? 0;
            if (item.externalLink && /^https?:\/\//i.test(item.externalLink)) sourceReady += 1;
            if (item.postedAt && new Date(item.postedAt).toDateString() === today) freshToday += 1;
            if ((item.viewCount ?? 0) >= 1200) highIntent += 1;
        }

        return {
            totalViews,
            sourceReady,
            freshToday,
            highIntent,
        };
    }, [data]);

    // Handle item click - navigate to SEO-friendly URL
    const handleItemClick = (item: Announcement) => {
        navigate(`/${item.type}/${item.slug}`);
    };

    // Navigate to category
    const handleCategoryClick = (type: string) => {
        if (type === 'all') {
            // Optional: navigate to a generic search or jobs page if 'all' is clicked
            // For now, let's default to jobs or do nothing
             navigate('/jobs'); 
             return;
        }

        const paths: Partial<Record<string, string>> = {
            'job': '/jobs',
            'result': '/results',
            'admit-card': '/admit-card',
            'answer-key': '/answer-key',
            'admission': '/admission',
            'syllabus': '/syllabus'
        };
        
        const path = paths[type];
        if (path) {
            navigate(path);
        }
    };

    const handlePageNavigation = (page: string) => {
        if (page === 'home') navigate('/');
        else if (page === 'admin') navigate('/admin');
        else navigate('/' + page);
    };

    return (
        <div className="app sr-v2-home">
            <a className="sr-v2-skip-link" href="#home-main">
                Skip to main content
            </a>
            <Header
                setCurrentPage={handlePageNavigation}
                user={user}
                token={token}
                isAuthenticated={isAuthenticated}
                onLogin={() => setShowAuthModal(true)}
                onLogout={logout}
                onProfileClick={() => navigate('/profile')}
            />
            <Navigation
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                setShowSearch={() => setShowSearchModal(true)}
                goBack={() => { }}
                setCurrentPage={handlePageNavigation}
                isAuthenticated={isAuthenticated}
                onShowAuth={() => setShowAuthModal(true)}
            />
            <Marquee />

            <main id="home-main" className="main-content sr-v2-main">
                <section className="hero sr-v2-hero">
                    <div className="hero-content">
                        <p className="hero-eyebrow sr-v2-eyebrow">{t('hero.eyebrow')}</p>
                        <h2 className="hero-title sr-v2-title">{t('hero.title')}</h2>
                        <p className="hero-subtitle sr-v2-subtitle">{t('hero.subtitle')}</p>
                        <div className="hero-actions">
                            <button className="btn btn-primary" onClick={() => handleCategoryClick('job')} aria-label="Browse available government jobs">
                                {t('hero.browseJobs')}
                            </button>
                            <button className="btn btn-secondary" onClick={() => navigate('/results')} aria-label="Check latest examination results">
                                {t('hero.latestResults')}
                            </button>
                        </div>
                        <div className="sr-v2-home-search-launch">
                            <button type="button" className="sr-v2-home-search-btn" onClick={() => setShowSearchModal(true)}>
                                <span aria-hidden="true">🔍</span>
                                <span>Search jobs, results, admit cards, answer keys...</span>
                            </button>
                        </div>
                        <div className="hero-pills" role="group" aria-label="Quick access to different categories">
                            <button className="hero-pill" onClick={() => handleCategoryClick('admit-card')} aria-label="Download admit cards">
                                {t('hero.pill.admit')}
                            </button>
                            <button className="hero-pill" onClick={() => handleCategoryClick('answer-key')} aria-label="Check answer keys">
                                {t('hero.pill.answer')}
                            </button>
                            <button className="hero-pill" onClick={() => handleCategoryClick('syllabus')} aria-label="View examination syllabus">
                                {t('hero.pill.syllabus')}
                            </button>
                            <button className="hero-pill" onClick={() => handleCategoryClick('admission')} aria-label="College admission information">
                                {t('hero.pill.admission')}
                            </button>
                        </div>
                    </div>
                    <div className="hero-panel sr-v2-hero-panel" aria-label="Platform pulse">
                        <div className="sr-v2-metric-card">
                            <span className="sr-v2-metric-label">Live Listings</span>
                            <strong className="sr-v2-metric-value">{formatNumber(stats.total)}</strong>
                        </div>
                        <div className="sr-v2-metric-card">
                            <span className="sr-v2-metric-label">Active Jobs</span>
                            <strong className="sr-v2-metric-value">{formatNumber(stats.jobs)}</strong>
                        </div>
                        <div className="sr-v2-metric-card">
                            <span className="sr-v2-metric-label">Fresh Results</span>
                            <strong className="sr-v2-metric-value">{formatNumber(stats.results)}</strong>
                        </div>
                        <div className="sr-v2-metric-card">
                            <span className="sr-v2-metric-label">Admit Cards</span>
                            <strong className="sr-v2-metric-value">{formatNumber(stats.admitCards)}</strong>
                        </div>
                    </div>
                </section>

                <section className="sr-v2-live-stream" aria-labelledby="v2-live-stream-heading">
                    <div className="sr-v2-live-stream-head">
                        <h2 id="v2-live-stream-heading">Live Updates Stream</h2>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowSearchModal(true)}>
                            Open Instant Search
                        </button>
                    </div>
                    {latestFeed.length === 0 ? (
                        <p className="sr-v2-empty">No live updates yet.</p>
                    ) : (
                        <div className="sr-v2-live-strip" role="list" aria-label="Latest 24 updates">
                            {latestFeed.map((item) => (
                                <button
                                    key={`live-${item.id}`}
                                    type="button"
                                    role="listitem"
                                    className="sr-v2-live-strip-item"
                                    onClick={() => handleItemClick(item)}
                                    onMouseEnter={() => prefetchAnnouncementDetail(item.slug)}
                                    onFocus={() => prefetchAnnouncementDetail(item.slug)}
                                >
                                    <span className={`sr-v2-live-type sr-v2-live-type-${item.type}`}>{item.type}</span>
                                    <strong>{item.title}</strong>
                                    <small>{item.organization || 'Official source'} | {formatDate(item.postedAt)}</small>
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                <section className="sr-v2-intel" aria-labelledby="v2-intel-heading">
                    <div className="sr-v2-intel-header">
                        <h2 id="v2-intel-heading">Live Exam Intel</h2>
                        <p>Fast picks from the latest stream. Open any card to view full details.</p>
                    </div>
                    <div className="sr-v2-intel-grid">
                        <article className="sr-v2-intel-card">
                            <h3>Most Viewed Alerts</h3>
                            {spotlightItems.length === 0 ? (
                                <p className="sr-v2-empty">No listings yet.</p>
                            ) : (
                                <ul className="sr-v2-intel-list">
                                    {spotlightItems.map((item) => (
                                        <li key={`spotlight-${item.id}`}>
                                            <button
                                                className="sr-v2-intel-link"
                                                onClick={() => handleItemClick(item)}
                                                onMouseEnter={() => prefetchAnnouncementDetail(item.slug)}
                                                onFocus={() => prefetchAnnouncementDetail(item.slug)}
                                            >
                                                <span>{item.title}</span>
                                                <small>Views: {formatNumber(item.viewCount ?? undefined)}</small>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </article>
                        <article className="sr-v2-intel-card">
                            <h3>Closing This Week</h3>
                            {closingSoonItems.length === 0 ? (
                                <p className="sr-v2-empty">No deadlines in the next 7 days.</p>
                            ) : (
                                <ul className="sr-v2-intel-list">
                                    {closingSoonItems.map((item) => (
                                        <li key={`closing-${item.id}`}>
                                            <button
                                                className="sr-v2-intel-link"
                                                onClick={() => handleItemClick(item)}
                                                onMouseEnter={() => prefetchAnnouncementDetail(item.slug)}
                                                onFocus={() => prefetchAnnouncementDetail(item.slug)}
                                            >
                                                <span>{item.title}</span>
                                                <small>Last date: {item.deadline ? formatDate(item.deadline) : 'Not set'}</small>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </article>
                    </div>
                </section>

                <section className="sr-v2-edge" aria-labelledby="v2-edge-heading">
                    <div className="sr-v2-edge-header">
                        <h2 id="v2-edge-heading">Exam Decision Layer</h2>
                        <p>Built for speed, trust, and conversion from discovery to action.</p>
                    </div>
                    <div className="sr-v2-edge-grid">
                        <article className="sr-v2-edge-card">
                            <h3>Deadline Radar</h3>
                            <strong>{formatNumber(closingSoonItems.length)}</strong>
                            <p>Announcements closing within 7 days are surfaced with urgency.</p>
                            <button className="btn btn-secondary" onClick={() => navigate('/jobs')}>
                                Open Priority Jobs
                            </button>
                        </article>
                        <article className="sr-v2-edge-card">
                            <h3>Verified Source Coverage</h3>
                            <strong>{formatNumber(intelligenceMetrics.sourceReady)}</strong>
                            <p>Listings with direct official links for safer, faster application flow.</p>
                            <button className="btn btn-secondary" onClick={() => navigate('/results')}>
                                View Trusted Updates
                            </button>
                        </article>
                        <article className="sr-v2-edge-card">
                            <h3>Fresh Today</h3>
                            <strong>{formatNumber(intelligenceMetrics.freshToday)}</strong>
                            <p>Same-day additions so users do not miss newly released opportunities.</p>
                            <button className="btn btn-secondary" onClick={() => handleCategoryClick('job')}>
                                Browse Fresh Listings
                            </button>
                        </article>
                        <article className="sr-v2-edge-card">
                            <h3>Smart Retention</h3>
                            <strong>{formatNumber(intelligenceMetrics.highIntent)}</strong>
                            <p>High-demand listings with profile recommendations and saved workflows.</p>
                            <button className="btn btn-secondary" onClick={() => isAuthenticated ? navigate('/profile') : setShowAuthModal(true)}>
                                {isAuthenticated ? 'Open My Profile' : 'Enable Smart Feed'}
                            </button>
                        </article>
                    </div>
                    <div className="sr-v2-edge-footnote">
                        <span>Total tracked listing views: {formatNumber(intelligenceMetrics.totalViews)}</span>
                    </div>
                </section>

                <section className="sr-v2-home-widgets" aria-labelledby="v2-home-widgets-heading">
                    <div className="sr-v2-home-widgets-head">
                        <h2 id="v2-home-widgets-heading">Personalized Dashboard Widgets</h2>
                        <p>Direct actions to compare jobs, track urgency, and open your next best move.</p>
                    </div>
                    <div className="sr-v2-home-widgets-grid">
                        <article className="sr-v2-home-widget-card">
                            <h3>For You Queue</h3>
                            <strong>{formatNumber(homeWidgetMetrics.recommendationReady)}</strong>
                            <p>{isAuthenticated ? 'Live recommendations based on your preferences.' : 'Sign in to unlock personalized job matches.'}</p>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => (isAuthenticated ? navigate('/profile') : setShowAuthModal(true))}
                            >
                                {isAuthenticated ? 'Open Profile Feed' : 'Sign In for Matches'}
                            </button>
                        </article>
                        <article className="sr-v2-home-widget-card">
                            <h3>Deadline Pressure</h3>
                            <strong>{formatNumber(homeWidgetMetrics.closingSoonJobs)}</strong>
                            <p>Jobs closing within the next 7 days.</p>
                            <button type="button" className="btn btn-secondary" onClick={() => navigate('/jobs')}>
                                Review Urgent Jobs
                            </button>
                        </article>
                        <article className="sr-v2-home-widget-card">
                            <h3>High Vacancy Pool</h3>
                            <strong>{formatNumber(homeWidgetMetrics.highVacancyJobs)}</strong>
                            <p>Openings with 500+ posts where competition can be more favorable.</p>
                            <button type="button" className="btn btn-secondary" onClick={() => navigate('/jobs')}>
                                Open High Vacancy Jobs
                            </button>
                        </article>
                        <article className="sr-v2-home-widget-card">
                            <h3>Compare Jobs Tool</h3>
                            <strong>{formatNumber(homeWidgetMetrics.avgViews)}</strong>
                            <p>Average views per job listing. Compare up to 3 roles side by side.</p>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowCompareJobs(true)}>
                                Launch Compare
                            </button>
                        </article>
                    </div>
                    {isAuthenticated && recommendations.length > 0 && (
                        <div className="sr-v2-home-widget-recs">
                            <h3>Top Matches Snapshot</h3>
                            <ul>
                                {recommendations.slice(0, 3).map((item) => (
                                    <li key={`home-widget-rec-${item.id}`}>
                                        <button
                                            type="button"
                                            onClick={() => handleItemClick(item)}
                                            onMouseEnter={() => prefetchAnnouncementDetail(item.slug)}
                                            onFocus={() => prefetchAnnouncementDetail(item.slug)}
                                        >
                                            <span>{item.title}</span>
                                            <small>{item.organization || 'Official source'}</small>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </section>

                <section className="sr-v2-opportunities" aria-labelledby="v2-opportunities-heading">
                    <div className="sr-v2-opportunities-head">
                        <h2 id="v2-opportunities-heading">Featured Opportunities</h2>
                        <p>High-signal opportunities with vacancy and deadline context.</p>
                    </div>
                    {featuredOpportunityItems.length === 0 ? (
                        <p className="sr-v2-empty">No featured opportunities available.</p>
                    ) : (
                        <div className="sr-v2-opportunity-grid">
                            {featuredOpportunityItems.map((item, index) => {
                                const colorClass = ['green', 'blue', 'orange', 'red'][index % 4];
                                const daysLeft = getDaysRemaining(item.deadline ?? undefined);
                                return (
                                    <button
                                        key={`featured-${item.id}`}
                                        type="button"
                                        className={`sr-v2-opportunity-card ${colorClass}`}
                                        onClick={() => handleItemClick(item)}
                                        onMouseEnter={() => prefetchAnnouncementDetail(item.slug)}
                                        onFocus={() => prefetchAnnouncementDetail(item.slug)}
                                    >
                                        <span className="sr-v2-opportunity-title">{item.title}</span>
                                        <span className="sr-v2-opportunity-org">{item.organization || 'Government'}</span>
                                        <span className="sr-v2-opportunity-meta">
                                            {item.totalPosts ? `${formatNumber(item.totalPosts ?? undefined)} posts` : 'Posts as notified'}
                                        </span>
                                        <span className="sr-v2-opportunity-cta">
                                            {daysLeft !== null && daysLeft >= 0 ? `${daysLeft} days left` : 'Apply now'} ↗
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="sr-v2-dense-board" aria-labelledby="v2-dense-board-heading">
                    <div className="sr-v2-dense-board-head">
                        <h2 id="v2-dense-board-heading">High-Density Update Board</h2>
                        <p>Three-column desk for quick scanning: jobs, admit cards, and results.</p>
                    </div>
                    <div className="sr-v2-dense-board-grid">
                        <article className="sr-v2-dense-column">
                            <header>
                                <h3>Latest Jobs</h3>
                                <span>{formatNumber(denseBoard.jobs.length)} items</span>
                            </header>
                            <ol>
                                {denseBoard.jobs.map((item) => (
                                    <li key={`dense-job-${item.id}`}>
                                        <button
                                            type="button"
                                            onClick={() => handleItemClick(item)}
                                            onMouseEnter={() => prefetchAnnouncementDetail(item.slug)}
                                            onFocus={() => prefetchAnnouncementDetail(item.slug)}
                                        >
                                            <span>{item.title}</span>
                                            <small>{formatDate(item.postedAt)}</small>
                                        </button>
                                    </li>
                                ))}
                            </ol>
                            <button type="button" className="btn btn-secondary" onClick={() => navigate('/jobs')}>
                                View More Jobs
                            </button>
                        </article>

                        <article className="sr-v2-dense-column">
                            <header>
                                <h3>Admit Cards</h3>
                                <span>{formatNumber(denseBoard.admitCards.length)} items</span>
                            </header>
                            <ol>
                                {denseBoard.admitCards.map((item) => (
                                    <li key={`dense-admit-${item.id}`}>
                                        <button
                                            type="button"
                                            onClick={() => handleItemClick(item)}
                                            onMouseEnter={() => prefetchAnnouncementDetail(item.slug)}
                                            onFocus={() => prefetchAnnouncementDetail(item.slug)}
                                        >
                                            <span>{item.title}</span>
                                            <small>{formatDate(item.postedAt)}</small>
                                        </button>
                                    </li>
                                ))}
                            </ol>
                            <button type="button" className="btn btn-secondary" onClick={() => navigate('/admit-card')}>
                                View More Admit Cards
                            </button>
                        </article>

                        <article className="sr-v2-dense-column">
                            <header>
                                <h3>Results</h3>
                                <span>{formatNumber(denseBoard.results.length)} items</span>
                            </header>
                            <ol>
                                {denseBoard.results.map((item) => (
                                    <li key={`dense-result-${item.id}`}>
                                        <button
                                            type="button"
                                            onClick={() => handleItemClick(item)}
                                            onMouseEnter={() => prefetchAnnouncementDetail(item.slug)}
                                            onFocus={() => prefetchAnnouncementDetail(item.slug)}
                                        >
                                            <span>{item.title}</span>
                                            <small>{formatDate(item.postedAt)}</small>
                                        </button>
                                    </li>
                                ))}
                            </ol>
                            <button type="button" className="btn btn-secondary" onClick={() => navigate('/results')}>
                                View More Results
                            </button>
                        </article>
                    </div>
                </section>

                <SocialButtons />

                {/* Statistics with clickable counters */}
                {!loading && <StatsSection stats={stats} onCategoryClick={handleCategoryClick} />}

                {/* Trust and Verification Section */}
                <section className="verification-section" aria-labelledby="verification-heading">
                    <div className="verification-content">
                        <h2 id="verification-heading">How We Verify Information</h2>
                        <div className="verification-grid">
                            <div className="verification-item">
                                <div className="verification-icon">🏛️</div>
                                <h3>Official Sources Only</h3>
                                <p>We aggregate information exclusively from official government websites, recruitment boards, and public service commissions.</p>
                            </div>
                            <div className="verification-item">
                                <div className="verification-icon">🔗</div>
                                <h3>Direct Source Links</h3>
                                <p>Every notification includes direct links to the original official source for verification and application submission.</p>
                            </div>
                            <div className="verification-item">
                                <div className="verification-icon">📅</div>
                                <h3>Regular Updates</h3>
                                <p>Our team monitors official websites daily to ensure information accuracy and timely updates.</p>
                            </div>
                            <div className="verification-item">
                                <div className="verification-icon">⚠️</div>
                                <h3>User Verification</h3>
                                <p>We strongly recommend users verify all details from original sources before applying to any position.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Featured Exam Cards */}
                <FeaturedGrid onItemClick={handleCategoryClick} />

                {/* Main Content Sections */}
                {loading ? (
                    <SkeletonLoader />
                ) : error ? (
                    <ErrorState message={error} onRetry={() => navigate(0)} />
                ) : (
                    <div className="main-sections">
                        <div className="sections-header">
                            <h2 className="sections-title">{t('sections.title')}</h2>
                            <p className="sections-subtitle">{t('sections.subtitle')}</p>
                        </div>
                        <div className="sections-grid">
                            {SECTIONS.map(section => {
                                const items = getByType(section.type);
                                return (
                                    <SectionTable
                                        key={section.type}
                                        title={section.title}
                                        items={items}
                                        onItemClick={handleItemClick}
                                        onViewMore={() => handleCategoryClick(section.type)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {isAuthenticated && (
                    <section className="recommendations-section">
                        <div className="sections-header sr-v2-recommendations-head">
                            <h2 className="sections-title">Jobs For You</h2>
                            <p className="sections-subtitle">Personalized based on your profile preferences</p>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowCompareJobs(true)}>
                                Compare Jobs
                            </button>
                        </div>
                        {recommendationsLoading ? (
                            <p className="no-data">Loading personalized suggestions...</p>
                        ) : recommendationsError ? (
                            <ErrorState message={recommendationsError} />
                        ) : recommendations.length > 0 ? (
                            <SectionTable title="Recommended" items={recommendations} onItemClick={handleItemClick} />
                        ) : (
                            <p className="no-data">Update your profile preferences to see personalized suggestions.</p>
                        )}
                    </section>
                )}

                {!loading && data.length > 0 && (
                    <ExamCalendar announcements={data} onItemClick={handleItemClick} />
                )}

                <SubscribeBox />
            </main>

            <Footer setCurrentPage={handlePageNavigation} />
            <AuthModal show={showAuthModal} onClose={() => setShowAuthModal(false)} />
            <GlobalSearchModal open={showSearchModal} onClose={() => setShowSearchModal(false)} />
            {showCompareJobs && (
                <CompareJobs
                    announcements={data}
                    onClose={() => setShowCompareJobs(false)}
                    onOpenAnnouncement={(item) => {
                        setShowCompareJobs(false);
                        handleItemClick(item);
                    }}
                />
            )}
            <MobileNav onShowAuth={() => setShowAuthModal(true)} />
            <ScrollToTop />
            
            {/* Cookie Consent Banner */}
            {showCookieConsent && (
                <div className="cookie-banner" role="banner" aria-live="polite">
                    <div className="cookie-content">
                        <p>
                            <strong>🍪 We use cookies</strong> to improve your experience and analyze site usage. 
                            We use essential cookies for site functionality and optional cookies for analytics.
                        </p>
                        <div className="cookie-actions">
                            <button 
                                className="cookie-btn accept" 
                                onClick={() => handleCookieConsent(true)}
                                aria-label="Accept all cookies including analytics"
                                title="Allows all cookies including analytics to help improve the website"
                            >
                                Accept All Cookies
                            </button>
                            <button 
                                className="cookie-btn decline" 
                                onClick={() => handleCookieConsent(false)}
                                aria-label="Accept only essential cookies"
                                title="Only essential cookies for basic site functionality"
                            >
                                Essential Cookies Only
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

