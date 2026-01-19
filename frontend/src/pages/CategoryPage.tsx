import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Navigation, Footer, SkeletonLoader } from '../components';
import { useAuth } from '../context/AuthContext';
import { type TabType } from '../utils';
import { fetchAnnouncementsByType } from '../utils/api';
import type { Announcement, ContentType } from '../types';

interface CategoryPageProps {
    type: ContentType;
}

const CATEGORY_TITLES: Record<ContentType, string> = {
    'job': 'Latest Government Jobs',
    'result': 'Latest Results',
    'admit-card': 'Admit Cards',
    'answer-key': 'Answer Keys',
    'admission': 'Admissions',
    'syllabus': 'Syllabus'
};

export function CategoryPage({ type }: CategoryPageProps) {
    const [data, setData] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user, logout, isAuthenticated } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetchAnnouncementsByType(type).then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [type]);

    const handleItemClick = (item: Announcement) => {
        navigate(`/${item.type}/${item.slug}`);
    };

    return (
        <div className="app">
            <Header
                setCurrentPage={(page) => navigate('/' + page)}
                user={user}
                isAuthenticated={isAuthenticated}
                onLogin={() => setShowAuthModal(true)}
                onLogout={logout}
            />
            <Navigation
                activeTab={type as TabType}
                setActiveTab={(tab) => {
                    if (!tab) navigate('/');
                    else if (tab === 'bookmarks') {
                        // Bookmarks handled elsewhere
                    } else {
                        navigate(`/${tab === 'job' ? 'jobs' : tab === 'result' ? 'results' : tab}`);
                    }
                }}
                setShowSearch={() => { /* No-op - search not implemented on category pages */ }}
                goBack={() => navigate('/')}
                setCurrentPage={(page) => navigate('/' + page)}
                isAuthenticated={isAuthenticated}
                onShowAuth={() => setShowAuthModal(true)}
            />

            <main className="main-content">
                <h1 className="category-title">{CATEGORY_TITLES[type]}</h1>

                {loading ? (
                    <SkeletonLoader />
                ) : (
                    <div className="category-list">
                        {data.length > 0 ? (
                            data.map(item => (
                                <div
                                    key={item.id}
                                    className="category-item"
                                    onClick={() => handleItemClick(item)}
                                >
                                    <div className="item-title">{item.title}</div>
                                    <div className="item-meta">
                                        <span className="org">{item.organization}</span>
                                        {item.totalPosts && <span className="posts">{item.totalPosts} Posts</span>}
                                        {item.deadline && (
                                            <span className="deadline">Last: {new Date(item.deadline).toLocaleDateString('en-IN')}</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="no-data">No {type}s available at the moment.</p>
                        )}
                    </div>
                )}
            </main>

            <Footer setCurrentPage={(page) => navigate('/' + page)} />
        </div>
    );
}
