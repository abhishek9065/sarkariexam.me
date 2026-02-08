import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Navigation, Footer, SkeletonLoader, SearchFilters, type FilterState, Breadcrumbs, ErrorState, MobileNav } from '../components';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContextStore';
import { type TabType, API_BASE, getDaysRemaining, isExpired, isUrgent, formatDate, formatNumber, PATHS } from '../utils';
import { fetchAnnouncementCardsPage, fetchAnnouncementCategories, fetchAnnouncementOrganizations } from '../utils/api';
import { prefetchAnnouncementDetail } from '../utils/prefetch';
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
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<FilterState>({
        keyword: '',
        type,
        location: '',
        qualification: '',
        categories: [],
        organizations: [],
        minSalary: '',
        maxSalary: '',
        minAge: '',
        maxAge: '',
        sortBy: 'latest',
    });
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [saveSearchMessage, setSaveSearchMessage] = useState('');
    const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
    const [organizationOptions, setOrganizationOptions] = useState<string[]>([]);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const navigate = useNavigate();
    const { user, logout, isAuthenticated, token } = useAuth();
    const [, setShowAuthModal] = useState(false);
    const { t } = useLanguage();
    const LOAD_TIMEOUT_MS = 8000;

    useEffect(() => {
        let isActive = true;
        let didTimeout = false;
        setLoading(true);
        setError(null);
        setData([]);
        setCursor(null);
        setHasMore(false);

        const apiSort = filters.sortBy === 'deadline'
            ? 'deadline'
            : filters.sortBy === 'views'
                ? 'views'
                : 'newest';

        const timeoutId = setTimeout(() => {
            if (!isActive) return;
            didTimeout = true;
            setError('This is taking longer than usual. Please retry.');
            setLoading(false);
        }, LOAD_TIMEOUT_MS);

        fetchAnnouncementCardsPage({
            type,
            limit: 50,
            search: filters.keyword || undefined,
            location: filters.location || undefined,
            qualification: filters.qualification || undefined,
            category: filters.categories.length ? filters.categories : undefined,
            organization: filters.organizations.length ? filters.organizations : undefined,
            salaryMin: filters.minSalary ? Number(filters.minSalary) : undefined,
            salaryMax: filters.maxSalary ? Number(filters.maxSalary) : undefined,
            ageMin: filters.minAge ? Number(filters.minAge) : undefined,
            ageMax: filters.maxAge ? Number(filters.maxAge) : undefined,
            sort: apiSort,
        })
            .then(response => {
                if (!isActive || didTimeout) return;
                const items = Array.isArray(response.data) ? (response.data as Announcement[]) : [];
                if (!Array.isArray(response.data)) {
                    setError('We could not load listings. Please try again.');
                    setData([]);
                    setCursor(null);
                    setHasMore(false);
                    return;
                }
                setData(items);
                setCursor(response.nextCursor ?? null);
                setHasMore(Boolean(response.hasMore));
            })
            .catch((err) => {
                console.error(err);
                if (!isActive || didTimeout) return;
                setError('We could not load listings. Please try again.');
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
    }, [type, filters]);

    useEffect(() => {
        setFilters((prev) => ({ ...prev, type }));
    }, [type]);

    useEffect(() => {
        if (saveSearchMessage) {
            setSaveSearchMessage('');
        }
    }, [filters]);

    useEffect(() => {
        let mounted = true;
        const runWhenIdle = (callback: () => void, timeout = 800) => {
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
        const loadMeta = async () => {
            const [categories, organizations] = await Promise.all([
                fetchAnnouncementCategories(),
                fetchAnnouncementOrganizations(),
            ]);
            if (!mounted) return;
            setCategoryOptions(categories);
            setOrganizationOptions(organizations);
        };
        const cancel = runWhenIdle(loadMeta);
        return () => {
            mounted = false;
            cancel();
        };
    }, []);

    const handleItemClick = (item: Announcement) => {
        navigate(`/${item.type}/${item.slug}`);
    };

    const handleFilterChange = useCallback((nextFilters: FilterState) => {
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
    }, [navigate, type]);

    const visibleData = useMemo(() => {
        const items = [...data];
        const keyword = filters.keyword.trim().toLowerCase();

        const scoreRelevance = (item: Announcement) => {
            if (!keyword) return 0;
            const title = item.title?.toLowerCase() || '';
            const organization = item.organization?.toLowerCase() || '';
            const category = item.category?.toLowerCase() || '';
            const location = item.location?.toLowerCase() || '';
            const qualification = item.minQualification?.toLowerCase() || '';
            const tags = (item.tags || []).map((tag) => tag.name.toLowerCase()).filter(Boolean);

            let score = 0;
            if (title.includes(keyword)) score += 6;
            if (organization.includes(keyword)) score += 3;
            if (category.includes(keyword)) score += 2;
            if (location.includes(keyword)) score += 2;
            if (qualification.includes(keyword)) score += 2;
            if (tags.some((tag) => tag.includes(keyword))) score += 2;

            const words = keyword.split(/\s+/).filter(Boolean);
            for (const word of words) {
                if (title.includes(word)) score += 2;
                if (organization.includes(word)) score += 1;
                if (tags.some((tag) => tag.includes(word))) score += 1;
            }

            return score;
        };

        switch (filters.sortBy) {
            case 'relevance':
                if (!keyword) return items;
                return items.sort((a, b) => {
                    const scoreB = scoreRelevance(b);
                    const scoreA = scoreRelevance(a);
                    if (scoreB !== scoreA) return scoreB - scoreA;
                    return (b.viewCount ?? 0) - (a.viewCount ?? 0);
                });
            case 'posts':
                return items.sort((a, b) => (b.totalPosts ?? 0) - (a.totalPosts ?? 0));
            case 'title':
                return items.sort((a, b) => a.title.localeCompare(b.title));
            case 'views':
                return items.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
            default:
                return items;
        }
    }, [data, filters]);

    const handleLoadMore = useCallback(async () => {
        if (!hasMore || loadingMore) return;
        setLoadingMore(true);
        try {
            const apiSort = filters.sortBy === 'deadline'
                ? 'deadline'
                : filters.sortBy === 'views'
                    ? 'views'
                    : 'newest';
            const response = await fetchAnnouncementCardsPage({
                type,
                limit: 50,
                cursor,
                search: filters.keyword || undefined,
                location: filters.location || undefined,
                qualification: filters.qualification || undefined,
                category: filters.categories.length ? filters.categories : undefined,
                organization: filters.organizations.length ? filters.organizations : undefined,
                salaryMin: filters.minSalary ? Number(filters.minSalary) : undefined,
                salaryMax: filters.maxSalary ? Number(filters.maxSalary) : undefined,
                ageMin: filters.minAge ? Number(filters.minAge) : undefined,
                ageMax: filters.maxAge ? Number(filters.maxAge) : undefined,
                sort: apiSort,
            });
            setData(prev => [...prev, ...response.data] as Announcement[]);
            setCursor(response.nextCursor ?? null);
            setHasMore(response.hasMore);
        } catch (error) {
            console.error(error);
            setError('Unable to load more listings.');
        } finally {
            setLoadingMore(false);
        }
    }, [hasMore, loadingMore, filters, cursor, type]);

    useEffect(() => {
        const target = loadMoreRef.current;
        if (!target) return;
        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting) {
                    handleLoadMore();
                }
            },
            { rootMargin: '200px' }
        );
        observer.observe(target);
        return () => observer.disconnect();
    }, [handleLoadMore]);

    const hasSaveCriteria = Boolean(
        filters.keyword ||
        filters.location ||
        filters.qualification ||
        filters.categories.length ||
        filters.organizations.length ||
        filters.minSalary ||
        filters.maxSalary ||
        filters.minAge ||
        filters.maxAge
    );

    const formatSalaryRange = (min?: number | null, max?: number | null) => {
        if (!min && !max) return null;
        const fmt = (value: number) => new Intl.NumberFormat('en-IN').format(value);
        if (min && max) return `₹${fmt(min)} - ₹${fmt(max)}`;
        if (min) return `₹${fmt(min)}+`;
        if (max) return `Up to ₹${fmt(max)}`;
        return null;
    };

    const handleSaveSearch = async () => {
        if (!token) return;
        if (!hasSaveCriteria) {
            setSaveSearchMessage(t('category.saveNeedFilters'));
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
                category: filters.categories.length ? filters.categories.join(',') : undefined,
                organization: filters.organizations.length ? filters.organizations.join(',') : undefined,
                location: filters.location || undefined,
                qualification: filters.qualification || undefined,
                salaryMin: filters.minSalary ? Number(filters.minSalary) : undefined,
                salaryMax: filters.maxSalary ? Number(filters.maxSalary) : undefined,
                ageMin: filters.minAge ? Number(filters.minAge) : undefined,
                ageMax: filters.maxAge ? Number(filters.maxAge) : undefined,
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
                setSaveSearchMessage(t('category.saveSuccess'));
            } else {
                setSaveSearchMessage(t('category.saveError'));
            }
        } catch (error) {
            console.error(error);
            setSaveSearchMessage(t('category.saveError'));
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
                        <Breadcrumbs
                            items={[
                                { label: CATEGORY_TITLES[type], path: PATHS[type] },
                            ]}
                        />
                        <h1 className="category-title">{CATEGORY_TITLES[type]}</h1>
                        <p className="category-subtitle">{visibleData.length} {t('category.listings')}</p>
                    </div>
                    <div className="category-controls sticky-filters">
                        <SearchFilters
                            onFilterChange={handleFilterChange}
                            showTypeFilter
                            initialType={type}
                            persistKey={`category-${type}`}
                            includeAllTypes={false}
                            categories={categoryOptions}
                            organizations={organizationOptions}
                            suggestions={[...categoryOptions.slice(0, 10), ...organizationOptions.slice(0, 10)]}
                        />
                        {isAuthenticated && hasSaveCriteria && (
                            <div className="save-search-prompt">
                                <div>
                                    <strong>{t('category.saveTitle')}</strong>
                                    <p>{t('category.saveHint')}</p>
                                </div>
                                <button className="btn btn-secondary" onClick={handleSaveSearch} disabled={!hasSaveCriteria}>
                                    {t('category.saveAction')}
                                </button>
                                {saveSearchMessage && <span className="save-search-message">{saveSearchMessage}</span>}
                            </div>
                        )}
                    </div>
                </div>

                {loading ? (
                    <SkeletonLoader />
                ) : error ? (
                    <ErrorState message={error} onRetry={() => setFilters((prev) => ({ ...prev }))} />
                ) : (
                    <>
                        <div className="category-list">
                            {visibleData.length > 0 ? (
                                visibleData.map(item => (
                                    <div
                                        key={item.id}
                                        className="category-item"
                                        onMouseEnter={() => prefetchAnnouncementDetail(item.slug)}
                                        onClick={() => handleItemClick(item)}
                                    >
                                        <div className="item-title">{item.title}</div>
                                        <div className="item-meta">
                                            <span className="org">{item.organization}</span>
                                            {item.totalPosts && <span className="posts">{formatNumber(item.totalPosts ?? undefined)} Posts</span>}
                                            {item.location && <span className="location">{item.location}</span>}
                                            {formatSalaryRange(item.salaryMin ?? undefined, item.salaryMax ?? undefined) && (
                                                <span className="salary-range">
                                                    {formatSalaryRange(item.salaryMin ?? undefined, item.salaryMax ?? undefined)}
                                                </span>
                                            )}
                                            {item.difficulty && (
                                                <span className={`difficulty-badge ${item.difficulty}`}>
                                                    {item.difficulty.toUpperCase()}
                                                </span>
                                            )}
                                            {item.deadline && (
                                                <span className="deadline">Last: {new Date(item.deadline).toLocaleDateString('en-IN')}</span>
                                            )}
                                            {item.deadline && (
                                                <span
                                                    className={`deadline-badge ${isExpired(item.deadline) ? 'expired' : isUrgent(item.deadline) ? 'urgent' : 'active'}`}
                                                >
                                                    {(() => {
                                                        const days = getDaysRemaining(item.deadline);
                                                        if (days === null) return 'No deadline';
                                                        if (days < 0) return 'Closed';
                                                        if (days === 0) return 'Last day';
                                                        return `${days} days left`;
                                                    })()}
                                                </span>
                                            )}
                                        </div>
                                        {(item.minQualification || item.ageLimit) && (
                                            <div className="item-eligibility">
                                                {item.minQualification && <span>🎓 {item.minQualification}</span>}
                                                {item.ageLimit && <span>👤 {item.ageLimit}</span>}
                                            </div>
                                        )}
                                        {item.cutoffMarks && (
                                            <div className="item-eligibility">
                                                <span>🎯 Prev Cutoff: {item.cutoffMarks}</span>
                                            </div>
                                        )}
                                        <div className="item-meta secondary">
                                            <span className="posted">Posted: {formatDate(item.postedAt)}</span>
                                            <span className="views">👁️ {formatNumber(item.viewCount ?? undefined)}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="no-data">{hasSaveCriteria ? t('category.noMatches') : t('section.noItems')}</p>
                            )}
                        </div>
                        {hasMore && (
                            <div style={{ textAlign: 'center', marginTop: '16px' }}>
                                <button className="btn btn-primary" onClick={handleLoadMore} disabled={loadingMore}>
                                    {loadingMore ? 'Loading...' : 'Load More'}
                                </button>
                            </div>
                        )}
                        <div ref={loadMoreRef} />
                    </>
                )}
            </main>

            <Footer setCurrentPage={(page) => navigate('/' + page)} />
            <MobileNav onShowAuth={() => setShowAuthModal(true)} />
        </div>
    );
}
