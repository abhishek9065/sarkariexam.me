import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Navigation, Footer, Marquee, FeaturedGrid, SectionTable, SkeletonLoader, SocialButtons, SubscribeBox, StatsSection, ExamCalendar, ErrorState, MobileNav } from '../components';
import { AuthModal } from '../components/modals/AuthModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { SECTIONS, type TabType, API_BASE } from '../utils';
import { fetchAnnouncements } from '../utils/api';
import { fetchJson } from '../utils/http';
import type { Announcement, ContentType } from '../types';

export function HomePage() {
    const [data, setData] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>(undefined);
    const [showCookieConsent, setShowCookieConsent] = useState(false);
    const [recommendations, setRecommendations] = useState<Announcement[]>([]);
    const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { user, token, logout, isAuthenticated } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const { t } = useLanguage();
    const LOAD_TIMEOUT_MS = 8000;
    const cookieConsentKey = 'cookieConsent';

    const getStoredConsent = () => {
        try {
            return localStorage.getItem(cookieConsentKey);
        } catch {
            return sessionStorage.getItem(cookieConsentKey);
        }
    };

    const setStoredConsent = (value: string) => {
        try {
            localStorage.setItem(cookieConsentKey, value);
        } catch {
            sessionStorage.setItem(cookieConsentKey, value);
        }
    };

    const runWhenIdle = (callback: () => void, timeout = 1200) => {
        if ('requestIdleCallback' in window) {
            const id = (window as any).requestIdleCallback(callback, { timeout });
            return () => (window as any).cancelIdleCallback(id);
        }
        const timer = window.setTimeout(callback, timeout);
        return () => window.clearTimeout(timer);
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
            setRecommendations([]);
            setRecommendationsError(null);
            return;
        }
        setRecommendationsError(null);
        const cancel = runWhenIdle(() => {
            fetchJson<{ data: Announcement[] }>(`${API_BASE}/api/profile/recommendations?limit=6`, {
                headers: { Authorization: `Bearer ${token}` },
            }, { timeoutMs: 6000, retries: 1 })
                .then((body) => setRecommendations(body.data || []))
                .catch((err) => {
                    console.error(err);
                    setRecommendationsError('Unable to load personalized recommendations.');
                });
        });
        return () => cancel();
    }, [token]);

    // Get data by type for section display
    const getByType = (type: ContentType) => data.filter(item => item.type === type);
    const stats = {
        jobs: getByType('job').length,
        results: getByType('result').length,
        admitCards: getByType('admit-card').length,
        total: data.length
    };

    // Handle item click - navigate to SEO-friendly URL
    const handleItemClick = (item: Announcement) => {
        navigate(`/${item.type}/${item.slug}`);
    };

    // Navigate to category
    const handleCategoryClick = (type: ContentType) => {
        const paths: Record<ContentType, string> = {
            'job': '/jobs',
            'result': '/results',
            'admit-card': '/admit-card',
            'answer-key': '/answer-key',
            'admission': '/admission',
            'syllabus': '/syllabus'
        };
        navigate(paths[type]);
    };

    return (
        <div className="app">
            <Header
                setCurrentPage={(page) => {
                    if (page === 'home') navigate('/');
                    else if (page === 'admin') navigate('/admin');
                    else navigate('/' + page);
                }}
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
                setShowSearch={() => { }}
                goBack={() => { }}
                setCurrentPage={(page) => {
                    if (page === 'home') navigate('/');
                    else if (page === 'admin') navigate('/admin');
                    else navigate('/' + page);
                }}
                isAuthenticated={isAuthenticated}
                onShowAuth={() => setShowAuthModal(true)}
            />
            <Marquee />

            <main className="main-content">
                <section className="hero">
                    <div className="hero-content">
                        <p className="hero-eyebrow">{t('hero.eyebrow')}</p>
                        <h2 className="hero-title">{t('hero.title')}</h2>
                        <p className="hero-subtitle">{t('hero.subtitle')}</p>
                        <div className="hero-actions">
                            <button className="btn btn-primary" onClick={() => handleCategoryClick('job')} aria-label="Browse available government jobs">
                                {t('hero.browseJobs')}
                            </button>
                            <button className="btn btn-secondary" onClick={() => navigate('/results')} aria-label="Check latest examination results">
                                {t('hero.latestResults')}
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
                    <div className="hero-panel">
                        <div className="hero-panel-card">
                            <h3>How We Help</h3>
                            <ul className="hero-list">
                                <li>Aggregate information from official sources</li>
                                <li>Organize notifications by category and date</li>
                                <li>Provide quick access and bookmark features</li>
                                <li>Always direct to original sources for applications</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Source Information */}
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
                        <div className="sections-header">
                            <h2 className="sections-title">Jobs For You</h2>
                            <p className="sections-subtitle">Personalized based on your profile preferences</p>
                        </div>
                        {recommendationsError ? (
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

            <Footer setCurrentPage={(page) => {
                if (page === 'home') navigate('/');
                else navigate('/' + page);
            }} />
            <AuthModal show={showAuthModal} onClose={() => setShowAuthModal(false)} />
            <MobileNav onShowAuth={() => setShowAuthModal(true)} />
            
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

