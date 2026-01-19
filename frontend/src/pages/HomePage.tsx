import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Navigation, Footer, Marquee, FeaturedGrid, SectionTable, SkeletonLoader, SocialButtons } from '../components';
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
    const { user, logout, isAuthenticated } = useAuth();
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
                {/* Social Buttons at top */}
                <SocialButtons />

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
            </main>

            <Footer setCurrentPage={(page) => navigate('/' + page)} />
            <AuthModal show={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </div>
    );
}

