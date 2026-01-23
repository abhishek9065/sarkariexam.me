import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Navigation, Footer, Marquee, FeaturedGrid, SectionTable, SkeletonLoader, SocialButtons, SubscribeBox, StatsSection } from '../components';
import { AuthModal } from '../components/modals/AuthModal';
import { useAuth } from '../context/AuthContext';
import { SECTIONS, type TabType } from '../utils';
import { fetchAnnouncements } from '../utils/api';
import type { Announcement, ContentType } from '../types';

export function HomePage() {
    const [data, setData] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>(undefined);
    const navigate = useNavigate();
    const { user, token, logout, isAuthenticated } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Fetch announcements using shared helper
    useEffect(() => {
        fetchAnnouncements()
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

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
                setCurrentPage={(page) => page === 'admin' ? navigate('/admin') : navigate('/' + page)}
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
                setCurrentPage={(page) => navigate('/' + page)}
                isAuthenticated={isAuthenticated}
                onShowAuth={() => setShowAuthModal(true)}
            />
            <Marquee />

            <main className="main-content">
                <section className="hero">
                    <div className="hero-content">
                        <p className="hero-eyebrow">Government job updates</p>
                        <h2 className="hero-title">Verified notifications without the clutter.</h2>
                        <p className="hero-subtitle">Daily updates across jobs, results, admit cards, and admissions. Built for speed and clarity.</p>
                        <div className="hero-actions">
                            <button className="btn btn-primary" onClick={() => handleCategoryClick('job')}>Browse Jobs</button>
                            <button className="btn btn-secondary" onClick={() => navigate('/results')}>Latest Results</button>
                        </div>
                        <div className="hero-pills">
                            <button className="hero-pill" onClick={() => handleCategoryClick('admit-card')}>Admit Cards</button>
                            <button className="hero-pill" onClick={() => handleCategoryClick('answer-key')}>Answer Keys</button>
                            <button className="hero-pill" onClick={() => handleCategoryClick('syllabus')}>Syllabus</button>
                            <button className="hero-pill" onClick={() => handleCategoryClick('admission')}>Admissions</button>
                        </div>
                    </div>
                    <div className="hero-panel">
                        <div className="hero-panel-card">
                            <h3>What you get</h3>
                            <ul className="hero-list">
                                <li>Verified listings updated daily</li>
                                <li>Fast access to results and admit cards</li>
                                <li>Save bookmarks and share quickly</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Social Buttons at top */}
                <SocialButtons />

                {!loading && <StatsSection stats={stats} />}

                {/* Featured Exam Cards */}
                <FeaturedGrid onItemClick={handleCategoryClick} />

                {/* 6 Section Grid */}
                {loading ? (
                    <SkeletonLoader />
                ) : (
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
                )}

                <SubscribeBox />
            </main>

            <Footer setCurrentPage={(page) => navigate('/' + page)} />
            <AuthModal show={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </div>
    );
}

