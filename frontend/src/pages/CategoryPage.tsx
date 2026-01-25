import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Navigation, Footer, SkeletonLoader, SearchFilters, type FilterState } from '../components';
import { useAuth } from '../context/AuthContext';
import { type TabType, API_BASE } from '../utils';
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
    const [filters, setFilters] = useState<FilterState>({
        keyword: '',
        type,
        location: '',
        qualification: '',
        minAge: '',
        maxAge: '',
        sortBy: 'latest',
    });
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [saveSearchMessage, setSaveSearchMessage] = useState('');
    const navigate = useNavigate();
    const { user, logout, isAuthenticated, token } = useAuth();
    const [, setShowAuthModal] = useState(false);

    useEffect(() => {
        let isActive = true;
        setLoading(true);
        setData([]);
        setCursor(null);
        setHasMore(false);

        const apiSort = filters.sortBy === 'deadline' ? 'deadline' : 'newest';

        fetchAnnouncementCardsPage({
            type,
            limit: 50,
            search: filters.keyword || undefined,
            location: filters.location || undefined,
            qualification: filters.qualification || undefined,
            sort: apiSort,
        })
            .then(response => {
                if (!isActive) return;
                setData(response.data as Announcement[]);
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
    }, [type, filters]);

    useEffect(() => {
        setFilters((prev) => ({ ...prev, type }));
    }, [type]);

    useEffect(() => {
        if (saveSearchMessage) {
            setSaveSearchMessage('');
        }
    }, [filters]);

    const handleItemClick = (item: Announcement) => {
        navigate(`/${item.type}/${item.slug}`);
    };

    const handleFilterChange = (nextFilters: FilterState) => {
        if (nextFilters.type && nextFilters.type !== type) {
            const paths: Record<ContentType, string> = {
                'job': '/jobs',
                'result': '/results',
                'admit-card': '/admit-card',
                'answer-key': '/answer-key',
                'admission': '/admission',
                'syllabus': '/syllabus'
            };
            navigate(paths[nextFilters.type]);
            return;
        }
        setFilters(nextFilters);
    };

    const visibleData = (() => {
        const items = [...data];
        switch (filters.sortBy) {
            case 'posts':
                return items.sort((a, b) => (b.totalPosts ?? 0) - (a.totalPosts ?? 0));
            case 'title':
                return items.sort((a, b) => a.title.localeCompare(b.title));
            default:
                return items;
        }
    })();

    const handleLoadMore = async () => {
        if (!hasMore || loadingMore) return;
        setLoadingMore(true);
        try {
            const apiSort = filters.sortBy === 'deadline' ? 'deadline' : 'newest';
            const response = await fetchAnnouncementCardsPage({
                type,
                limit: 50,
                cursor,
                search: filters.keyword || undefined,
                location: filters.location || undefined,
                qualification: filters.qualification || undefined,
                sort: apiSort,
            });
            setData(prev => [...prev, ...response.data] as Announcement[]);
            setCursor(response.nextCursor ?? null);
            setHasMore(response.hasMore);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingMore(false);
        }
    };

    const hasSaveCriteria = Boolean(filters.keyword || filters.location || filters.qualification);

    const handleSaveSearch = async () => {
        if (!token) return;
        if (!hasSaveCriteria) {
            setSaveSearchMessage('Add a keyword or filter before saving.');
            return;
        }

        const nameParts = [];
        if (filters.keyword) nameParts.push(filters.keyword);
        nameParts.push(CATEGORY_TITLES[type]);
        if (filters.location) nameParts.push(filters.location);
        const name = nameParts.slice(0, 3).join(' • ');

        const payload = {
            name,
            query: filters.keyword || '',
            filters: {
                type,
                location: filters.location || undefined,
                qualification: filters.qualification || undefined,
            }
        };

        try {
            setSaveSearchMessage('Saving...');
            const res = await fetch(`${API_BASE}/api/profile/saved-searches`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setSaveSearchMessage('Saved! You will see alerts in your profile.');
            } else {
                setSaveSearchMessage('Unable to save this search.');
            }
        } catch (error) {
            console.error(error);
            setSaveSearchMessage('Unable to save this search.');
        }
    };

    return (
        <div className="app">
            <Header
                setCurrentPage={(page) => navigate('/' + page)}
                user={user}
                token={token}
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
                        <SearchFilters
                            onFilterChange={handleFilterChange}
                            showTypeFilter
                            initialType={type}
                            persistKey={`category-${type}`}
                            includeAllTypes={false}
                        />
                        {isAuthenticated && hasSaveCriteria && (
                            <div className="save-search-prompt">
                                <div>
                                    <strong>Save this search</strong>
                                    <p>Get alerts when matching posts arrive.</p>
                                </div>
                                <button className="btn btn-secondary" onClick={handleSaveSearch} disabled={!hasSaveCriteria}>
                                    Save search
                                </button>
                                {saveSearchMessage && <span className="save-search-message">{saveSearchMessage}</span>}
                            </div>
                        )}
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
                                <p className="no-data">{hasSaveCriteria ? 'No items match your filters.' : `No ${type}s available at the moment.`}</p>
                            )}
                        </div>
                        {hasMore && (
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
