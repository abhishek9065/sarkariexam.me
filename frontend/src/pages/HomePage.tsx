import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Navigation, Footer, Marquee, FeaturedGrid, SectionTable, SkeletonLoader, SocialButtons } from '../components';
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
        setLoading(true);
        fetchAnnouncements()
            .then(data => {
                if (data.length === 0) {
                    // Populate with high-quality mock data if API is empty (for demo/dev)
                    const mockData: Announcement[] = [
                        { id: 101, title: 'SSC GD Constable 2025 Result Declared', type: 'result', organization: 'SSC', slug: 'ssc-gd-result', deadline: '2025-02-28', viewCount: 15400, totalPosts: 26146, category: 'Defence' },
                        { id: 102, title: 'UP Police Constable Admit Card 2025', type: 'admit-card', organization: 'UPPRPB', slug: 'up-police-admit-card', deadline: '2025-02-15', viewCount: 22000, totalPosts: 60244, category: 'Police' },
                        { id: 103, title: 'Railway RRB NTPC Final Result Out', type: 'result', organization: 'Railway', slug: 'rrb-ntpc-result', deadline: '2025-01-20', viewCount: 18900, totalPosts: 35281, category: 'Railways' },
                        { id: 104, title: 'UPSC Civil Services 2025 Notification', type: 'job', organization: 'UPSC', slug: 'upsc-cse-2025', deadline: '2025-03-05', viewCount: 45000, totalPosts: 1056, category: 'UPSC' },
                        { id: 105, title: 'SBI PO Recruitment 2025 - Apply Online', type: 'job', organization: 'SBI', slug: 'sbi-po-2025', deadline: '2025-02-10', viewCount: 12500, totalPosts: 2000, category: 'Banking' },
                        { id: 106, title: 'GATE 2025 Answer Key Released', type: 'answer-key', organization: 'IIT', slug: 'gate-2025-key', deadline: '2025-02-25', viewCount: 8500, category: 'Engineering' },
                        { id: 107, title: 'CTET Jan 2025 Official Answer Key', type: 'answer-key', organization: 'CBSE', slug: 'ctet-answer-key', deadline: '2025-02-01', viewCount: 30000, category: 'Teaching' },
                        { id: 108, title: 'NEET UG 2025 Syllabus & Exam Pattern', type: 'syllabus', organization: 'NTA', slug: 'neet-ug-syllabus', deadline: '2025-05-05', viewCount: 15000, category: 'Medical' },
                        { id: 109, title: 'IGNOU January 2025 Admission Open', type: 'admission', organization: 'IGNOU', slug: 'ignou-admission-2025', deadline: '2025-03-31', viewCount: 5000, category: 'University' },
                        { id: 110, title: 'Bihar Police Constable New Exam Date', type: 'job', organization: 'CSBC', slug: 'bihar-police-date', deadline: '2025-04-10', viewCount: 28000, totalPosts: 21391, category: 'Police' }
                    ];
                    setData(mockData);
                } else {
                    setData(data);
                }
            })
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
                onProfileClick={() => { }}
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
        </div>
    );
}

