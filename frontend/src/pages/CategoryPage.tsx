import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Navigation, Footer, SkeletonLoader, SearchBox } from '../components';
import { useAuth } from '../context/AuthContext';
import { type TabType } from '../utils';
import { fetchAnnouncementCardsPage } from '../utils/api';
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
    const [loadingMore, setLoadingMore] = useState(false);
    const [query, setQuery] = useState('');
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const navigate = useNavigate();
    const { user, logout, isAuthenticated } = useAuth();
    const [, setShowAuthModal] = useState(false);

    useEffect(() => {
        let isActive = true;
        setLoading(true);
        setData([]);
        setCursor(null);
        setHasMore(false);

        fetchAnnouncementCardsPage({ type, limit: 50 })
            .then(response => {
                if (!isActive) return;
                setData(response.data);
                setCursor(response.nextCursor ?? null);
                setHasMore(response.hasMore);
            })
            .catch(console.error)
            .finally(() => {
                if (isActive) setLoading(false);
            });

        return () => {
            isActive = false;
        };
    }, [type]);

    const handleItemClick = (item: Announcement) => {
        navigate(`/${item.type}/${item.slug}`);
    };

    const normalizedQuery = query.trim().toLowerCase();
    const visibleData = normalizedQuery
        ? data.filter(item =>
            item.title.toLowerCase().includes(normalizedQuery) ||
            (item.organization || '').toLowerCase().includes(normalizedQuery)
        )
        : data;

    const handleLoadMore = async () => {
        if (!hasMore || loadingMore) return;
        setLoadingMore(true);
        try {
            const response = await fetchAnnouncementCardsPage({ type, limit: 50, cursor });
            setData(prev => [...prev, ...response.data]);
            setCursor(response.nextCursor ?? null);
            setHasMore(response.hasMore);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingMore(false);
        }
    };

    return (
        <div className="app">
            <Header
                setCurrentPage={(page) => navigate('/' + page)}
                user={user}
                isAuthenticated={isAuthenticated}
                onLogin={() => setShowAuthModal(true)}
                onLogout={logout}
                onProfileClick={() => navigate('/profile')}
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
                <div className="category-header">
                    <div>
                        <h1 className="category-title">{CATEGORY_TITLES[type]}</h1>
                        <p className="category-subtitle">{visibleData.length} listings</p>
                    </div>
                    <div className="category-controls">
                        <SearchBox
                            value={query}
                            onChange={setQuery}
                            placeholder="Search by title or organization"
                            resultCount={visibleData.length}
                        />
                    </div>
                </div>

                {loading ? (
                    <SkeletonLoader />
                ) : (
                    <>
                        <div className="category-list">
                            {visibleData.length > 0 ? (
                                visibleData.map(item => (
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
                                <p className="no-data">{normalizedQuery ? 'No items match your search.' : `No ${type}s available at the moment.`}</p>
                            )}
                        </div>
                        {hasMore && !normalizedQuery && (
                            <div style={{ textAlign: 'center', marginTop: '16px' }}>
                                <button className="btn btn-primary" onClick={handleLoadMore} disabled={loadingMore}>
                                    {loadingMore ? 'Loading...' : 'Load More'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>

            <Footer setCurrentPage={(page) => navigate('/' + page)} />
        </div>
    );
}
