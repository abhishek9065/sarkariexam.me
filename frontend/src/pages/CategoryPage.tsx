import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Navigation, Footer, SkeletonLoader, SearchFilters, type FilterState, Breadcrumbs, ErrorState, MobileNav, ScrollToTop } from '../components';
import { GlobalSearchModal } from '../components/modals/GlobalSearchModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContextStore';
import { type TabType, API_BASE, getDaysRemaining, isExpired, isUrgent, formatDate, formatNumber, PATHS } from '../utils';
import { fetchAnnouncementCardsPage, fetchAnnouncementCategories, fetchAnnouncementOrganizations } from '../utils/api';
import { prefetchAnnouncementDetail } from '../utils/prefetch';
import type { Announcement, ContentType } from '../types';
import './V2.css';

interface CategoryPageProps {
    type: ContentType;
}

type QuickMode = 'all' | 'fresh' | 'closing' | 'high-posts' | 'trending';

const CATEGORY_TITLES: Record<ContentType, string> = {
    'job': 'Latest Government Jobs',
    'result': 'Latest Results',
    'admit-card': 'Admit Cards',
    'answer-key': 'Answer Keys',
    'admission': 'Admissions',
    'syllabus': 'Syllabus'
};

const buildDefaultFilters = (type: ContentType): FilterState => ({
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

export function CategoryPage({ type }: CategoryPageProps) {
    const [data, setData] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<FilterState>(() => buildDefaultFilters(type));
    const [filtersPanelVersion, setFiltersPanelVersion] = useState(0);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [quickMode, setQuickMode] = useState<QuickMode>('all');
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
    const LOAD_TIMEOUT_MS = 3000;

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
        setQuickMode('all');
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
    const quickModeCounts = useMemo(() => {
        const fresh = visibleData.filter((item) => {
            if (!item.postedAt) return false;
            const postedAt = new Date(item.postedAt).getTime();
            if (Number.isNaN(postedAt)) return false;
            const ageMs = Date.now() - postedAt;
            return ageMs <= 3 * 24 * 60 * 60 * 1000;
        }).length;
        const closing = visibleData.filter((item) => {
            if (!item.deadline) return false;
            const days = getDaysRemaining(item.deadline);
            return days !== null && days >= 0 && days <= 7;
        }).length;
        const highPosts = visibleData.filter((item) => (item.totalPosts ?? 0) >= 500).length;
        const trending = visibleData.filter((item) => (item.viewCount ?? 0) >= 1200).length;
        return {
            all: visibleData.length,
            fresh,
            closing,
            'high-posts': highPosts,
            trending,
        };
    }, [visibleData]);
    const quickFilteredData = useMemo(() => {
        switch (quickMode) {
            case 'fresh':
                return visibleData.filter((item) => {
                    if (!item.postedAt) return false;
                    const postedAt = new Date(item.postedAt).getTime();
                    if (Number.isNaN(postedAt)) return false;
                    const ageMs = Date.now() - postedAt;
                    return ageMs <= 3 * 24 * 60 * 60 * 1000;
                });
            case 'closing':
                return visibleData.filter((item) => {
                    if (!item.deadline) return false;
                    const days = getDaysRemaining(item.deadline);
                    return days !== null && days >= 0 && days <= 7;
                });
            case 'high-posts':
                return visibleData.filter((item) => (item.totalPosts ?? 0) >= 500);
            case 'trending':
                return visibleData.filter((item) => (item.viewCount ?? 0) >= 1200);
            default:
                return visibleData;
        }
    }, [quickMode, visibleData]);

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
    const activeFilterCount = useMemo(() => ([
        Boolean(filters.keyword),
        Boolean(filters.location),
        Boolean(filters.qualification),
        filters.categories.length > 0,
        filters.organizations.length > 0,
        Boolean(filters.minSalary),
        Boolean(filters.maxSalary),
        Boolean(filters.minAge),
        Boolean(filters.maxAge),
    ]).filter(Boolean).length, [filters]);
    const closingSoonCount = useMemo(() => quickFilteredData.filter((item) => {
        if (!item.deadline) return false;
        const days = getDaysRemaining(item.deadline);
        return days !== null && days >= 0 && days <= 7;
    }).length, [quickFilteredData]);
    const activeFilterLabels = useMemo(() => {
        const labels: string[] = [];
        if (filters.keyword) labels.push(`Keyword: ${filters.keyword}`);
        if (filters.location) labels.push(`Location: ${filters.location}`);
        if (filters.qualification) labels.push(`Qualification: ${filters.qualification}`);
        if (filters.categories.length) labels.push(`Categories: ${filters.categories.join(', ')}`);
        if (filters.organizations.length) labels.push(`Organizations: ${filters.organizations.join(', ')}`);
        if (filters.minSalary || filters.maxSalary) {
            labels.push(`Salary: ${filters.minSalary || 'Any'} - ${filters.maxSalary || 'Any'}`);
        }
        if (filters.minAge || filters.maxAge) {
            labels.push(`Age: ${filters.minAge || 'Any'} - ${filters.maxAge || 'Any'}`);
        }
        return labels;
    }, [filters]);

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

    const handleResetFilters = () => {
        const nextFilters = buildDefaultFilters(type);
        setFilters(nextFilters);
        setQuickMode('all');
        setSaveSearchMessage('');
        setError(null);
        setFiltersPanelVersion((prev) => prev + 1);
        try {
            localStorage.removeItem(`filters:category-${type}`);
        } catch {
            // Ignore storage access issues.
        }
    };

    return (
        <div className="app sr-v2-category">
            <a className="sr-v2-skip-link" href="#category-main">
                Skip to listings
            </a>
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
                setShowSearch={() => setShowSearchModal(true)}
                goBack={() => navigate('/')}
                setCurrentPage={(page) => navigate('/' + page)}
                isAuthenticated={isAuthenticated}
                onShowAuth={() => setShowAuthModal(true)}
            />

            <main id="category-main" className="main-content sr-v2-main">
                <section className="sr-v2-category-intro" aria-label="Category insights">
                    <div className="sr-v2-category-intro-item">
                        <span className="sr-v2-intro-label">Showing</span>
                        <strong>{formatNumber(quickFilteredData.length)}</strong>
                        <small>results</small>
                    </div>
                    <div className="sr-v2-category-intro-item">
                        <span className="sr-v2-intro-label">Active Filters</span>
                        <strong>{activeFilterCount}</strong>
                        <small>{activeFilterCount === 1 ? 'filter' : 'filters'}</small>
                    </div>
                    <div className="sr-v2-category-intro-item">
                        <span className="sr-v2-intro-label">Closing in 7 Days</span>
                        <strong>{closingSoonCount}</strong>
                        <small>alerts</small>
                    </div>
                </section>
                <section className="sr-v2-quick-modes" aria-label="Smart views">
                    <button
                        type="button"
                        className={`sr-v2-quick-mode-chip ${quickMode === 'all' ? 'active' : ''}`}
                        onClick={() => setQuickMode('all')}
                    >
                        All
                        <small>{formatNumber(quickModeCounts.all)}</small>
                    </button>
                    <button
                        type="button"
                        className={`sr-v2-quick-mode-chip ${quickMode === 'fresh' ? 'active' : ''}`}
                        onClick={() => setQuickMode('fresh')}
                    >
                        Fresh 72h
                        <small>{formatNumber(quickModeCounts.fresh)}</small>
                    </button>
                    <button
                        type="button"
                        className={`sr-v2-quick-mode-chip ${quickMode === 'closing' ? 'active' : ''}`}
                        onClick={() => setQuickMode('closing')}
                    >
                        Closing Soon
                        <small>{formatNumber(quickModeCounts.closing)}</small>
                    </button>
                    <button
                        type="button"
                        className={`sr-v2-quick-mode-chip ${quickMode === 'high-posts' ? 'active' : ''}`}
                        onClick={() => setQuickMode('high-posts')}
                    >
                        High Vacancy
                        <small>{formatNumber(quickModeCounts['high-posts'])}</small>
                    </button>
                    <button
                        type="button"
                        className={`sr-v2-quick-mode-chip ${quickMode === 'trending' ? 'active' : ''}`}
                        onClick={() => setQuickMode('trending')}
                    >
                        Trending
                        <small>{formatNumber(quickModeCounts.trending)}</small>
                    </button>
                </section>
                {activeFilterLabels.length > 0 && (
                    <section className="sr-v2-filter-summary" aria-label="Active filters">
                        <div className="sr-v2-filter-chip-list">
                            {activeFilterLabels.map((label, index) => (
                                <span key={`${label}-${index}`} className="sr-v2-filter-chip">
                                    {label}
                                </span>
                            ))}
                        </div>
                        <button type="button" className="btn btn-secondary sr-v2-filter-reset" onClick={handleResetFilters}>
                            Reset filters
                        </button>
                    </section>
                )}
                <div className="category-header">
                    <div>
                        <Breadcrumbs
                            items={[
                                { label: CATEGORY_TITLES[type], path: PATHS[type] },
                            ]}
                        />
                        <h1 className="category-title">{CATEGORY_TITLES[type]}</h1>
                        <p className="category-subtitle" aria-live="polite">{quickFilteredData.length} {t('category.listings')}</p>
                    </div>
                    <div className="category-controls sticky-filters">
                        <SearchFilters
                            key={`category-filters-${type}-${filtersPanelVersion}`}
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
                            {quickFilteredData.length > 0 ? (
                                quickFilteredData.map(item => (
                                    <div
                                        key={item.id}
                                        className="category-item"
                                        onMouseEnter={() => prefetchAnnouncementDetail(item.slug)}
                                        onFocus={() => prefetchAnnouncementDetail(item.slug)}
                                        onClick={() => handleItemClick(item)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                handleItemClick(item);
                                            }
                                        }}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`Open listing: ${item.title}`}
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
                                <div className="sr-v2-empty-state">
                                    <p className="no-data">{hasSaveCriteria ? t('category.noMatches') : t('section.noItems')}</p>
                                    <div className="sr-v2-empty-actions">
                                        {activeFilterCount > 0 && (
                                            <button type="button" className="btn btn-secondary" onClick={handleResetFilters}>
                                                Clear filters
                                            </button>
                                        )}
                                        <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
                                            Back to homepage
                                        </button>
                                    </div>
                                </div>
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
            <GlobalSearchModal open={showSearchModal} onClose={() => setShowSearchModal(false)} />
            <MobileNav onShowAuth={() => setShowAuthModal(true)} />
            <ScrollToTop />
        </div>
    );
}
