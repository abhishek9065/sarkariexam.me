import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { AnnouncementCard, AnnouncementCardSkeleton } from '../components/AnnouncementCard';
import { CategoryListRow } from '../components/category/CategoryListRow';
import { JobsFilterPanel, type FilterOptionSets, type JobsFilterState } from '../components/category/JobsFilterPanel';
import { getAnnouncementCards, getOrganizations } from '../utils/api';
import type { AnnouncementCard as CardType, ContentType } from '../types';

const TYPE_META: Record<ContentType, { title: string; icon: string; description: string; chips: string[] }> = {
    job: {
        title: 'Latest Jobs',
        icon: '💼',
        description: 'Browse the latest government job vacancies across India.',
        chips: ['Railway', 'Banking', 'Defence', 'Graduate'],
    },
    result: {
        title: 'Results',
        icon: '📊',
        description: 'Check exam results, merit lists, and cut-off marks.',
        chips: ['UPSC', 'SSC', 'Police', 'Teaching'],
    },
    'admit-card': {
        title: 'Admit Cards',
        icon: '🎫',
        description: 'Download hall tickets for upcoming examinations.',
        chips: ['RRB', 'UPPSC', 'SSC', 'Bank PO'],
    },
    'answer-key': {
        title: 'Answer Keys',
        icon: '🔑',
        description: 'View official answer keys and objection forms.',
        chips: ['CBSE', 'NTA', 'State PSC', 'SSC'],
    },
    admission: {
        title: 'Admissions',
        icon: '🎓',
        description: 'University and college admission notifications.',
        chips: ['UG', 'PG', 'Engineering', 'Medical'],
    },
    syllabus: {
        title: 'Syllabus',
        icon: '📚',
        description: 'Exam syllabus, patterns, and preparation material.',
        chips: ['SSC CGL', 'UPSC', 'Railway', 'NDA'],
    },
};

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'deadline', label: 'Deadline' },
    { value: 'views', label: 'Most Viewed' },
] as const;

const DEFAULT_PAGE_SIZE = 20;
const JOB_PAGE_SIZE = 50;

const FALLBACK_FILTER_OPTIONS: FilterOptionSets = {
    states: [
        'Andhra Pradesh',
        'Bihar',
        'Delhi',
        'Gujarat',
        'Karnataka',
        'Madhya Pradesh',
        'Maharashtra',
        'Rajasthan',
        'Tamil Nadu',
        'Uttar Pradesh',
        'West Bengal',
    ],
    qualifications: ['10th Pass', '12th Pass', 'Diploma', 'Graduate', 'Post Graduate'],
    organizations: ['SSC', 'UPSC', 'Railway', 'Banking', 'Defence', 'State PSC'],
};

type ViewMode = 'compact' | 'card';

type SortValue = typeof SORT_OPTIONS[number]['value'];

export function CategoryPage({ type }: { type: ContentType }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [cards, setCards] = useState<CardType[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | undefined>();
    const [total, setTotal] = useState<number | undefined>();

    const [filterOptions, setFilterOptions] = useState<FilterOptionSets>(FALLBACK_FILTER_OPTIONS);
    const [jobFilters, setJobFilters] = useState<JobsFilterState>({
        search: searchParams.get('q') || '',
        state: searchParams.get('location') || '',
        qualification: searchParams.get('qualification') || '',
        organization: searchParams.get('organization') || '',
    });

    const sort = (searchParams.get('sort') as SortValue) || 'newest';
    const search = searchParams.get('q') || '';
    const location = searchParams.get('location') || '';
    const qualification = searchParams.get('qualification') || '';
    const organization = searchParams.get('organization') || '';
    const viewMode = (searchParams.get('view') as ViewMode) || 'compact';

    const meta = TYPE_META[type];

    useEffect(() => {
        if (type !== 'job') return;
        setJobFilters({
            search,
            state: location,
            qualification,
            organization,
        });
    }, [type, search, location, qualification, organization]);

    useEffect(() => {
        if (type !== 'job') return;

        let mounted = true;
        (async () => {
            try {
                const res = await getOrganizations();
                const organizationsFromApi = Array.from(new Set((res.data || []).map((item) => item.trim()).filter(Boolean)));
                if (!mounted) return;

                setFilterOptions({
                    ...FALLBACK_FILTER_OPTIONS,
                    organizations: organizationsFromApi.length > 0 ? organizationsFromApi : FALLBACK_FILTER_OPTIONS.organizations,
                });
            } catch {
                if (!mounted) return;
                setFilterOptions(FALLBACK_FILTER_OPTIONS);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [type]);

    const fetchCards = useCallback(async (cursor?: string) => {
        const isInitial = !cursor;
        if (isInitial) { setLoading(true); setFetchError(false); }
        else setLoadingMore(true);

        try {
            const res = await getAnnouncementCards({
                type,
                sort,
                search: search || undefined,
                location: location || undefined,
                qualification: qualification || undefined,
                organization: organization || undefined,
                limit: type === 'job' ? JOB_PAGE_SIZE : DEFAULT_PAGE_SIZE,
                cursor,
            });
            if (isInitial) {
                setCards(res.data);
            } else {
                setCards((prev) => [...prev, ...res.data]);
            }
            setHasMore(res.hasMore ?? false);
            setNextCursor(res.nextCursor);
            if (res.total !== undefined) {
                setTotal(res.total);
            }
        } catch (err) {
            console.error('Failed to fetch cards:', err);
            if (!cursor) setFetchError(true);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [type, sort, search, location, qualification, organization]);

    useEffect(() => {
        setCards([]);
        setNextCursor(undefined);
        fetchCards();
    }, [fetchCards]);

    const updateFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value) params.set(key, value);
        else params.delete(key);
        setSearchParams(params, { replace: true });
    };

    const applyJobFilters = (filters: JobsFilterState) => {
        const params = new URLSearchParams(searchParams);

        if (filters.search) params.set('q', filters.search);
        else params.delete('q');

        if (filters.state) params.set('location', filters.state);
        else params.delete('location');

        if (filters.qualification) params.set('qualification', filters.qualification);
        else params.delete('qualification');

        if (filters.organization) params.set('organization', filters.organization);
        else params.delete('organization');

        setSearchParams(params, { replace: true });
    };

    const handleResetJobFilters = () => {
        const reset: JobsFilterState = {
            search: '',
            state: '',
            qualification: '',
            organization: '',
        };
        setJobFilters(reset);
        applyJobFilters(reset);
    };

    return (
        <Layout>
            {/* Premium Category Header */}
            <section className="cat-hero animate-fade-in">
                <div className="cat-hero-inner">
                    <div className="cat-hero-icon-wrap">
                        <span className="cat-hero-icon">{meta.icon}</span>
                    </div>
                    <div className="cat-hero-text">
                        <h1 className="cat-hero-title">{meta.title}</h1>
                        <p className="cat-hero-desc">{meta.description}</p>
                    </div>
                    {total !== undefined && (
                        <div className="cat-hero-count">
                            <span className="cat-hero-count-num">{total.toLocaleString()}</span>
                            <span className="cat-hero-count-label">Total</span>
                        </div>
                    )}
                </div>
            </section>

            {type === 'job' ? (
                <JobsFilterPanel
                    value={jobFilters}
                    options={filterOptions}
                    sort={sort}
                    viewMode={viewMode}
                    onChange={setJobFilters}
                    onApply={() => applyJobFilters(jobFilters)}
                    onReset={handleResetJobFilters}
                    onSortChange={(value) => updateFilter('sort', value)}
                    onViewModeChange={(value) => updateFilter('view', value)}
                />
            ) : (
                <section className="cat-filter-bar">
                    <div className="cat-filter-row">
                        <div className="cat-filter-input-wrap">
                            <span className="cat-filter-search-icon">🔍</span>
                            <input
                                className="cat-filter-input"
                                type="text"
                                placeholder={`Search ${meta.title.toLowerCase()}...`}
                                value={search}
                                onChange={(event) => updateFilter('q', event.target.value)}
                            />
                        </div>
                        <input
                            className="cat-filter-field"
                            type="text"
                            placeholder="📍 Location"
                            value={location}
                            onChange={(event) => updateFilter('location', event.target.value)}
                        />
                        <input
                            className="cat-filter-field"
                            type="text"
                            placeholder="🎓 Qualification"
                            value={qualification}
                            onChange={(event) => updateFilter('qualification', event.target.value)}
                        />
                        <select
                            className="cat-filter-select"
                            value={sort}
                            onChange={(event) => updateFilter('sort', event.target.value)}
                        >
                            {SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <div className="cat-view-toggle" role="group" aria-label="Toggle view">
                            <button
                                type="button"
                                className={`cat-view-btn${viewMode === 'compact' ? ' active' : ''}`}
                                onClick={() => updateFilter('view', 'compact')}
                                title="List view"
                            >
                                ☰
                            </button>
                            <button
                                type="button"
                                className={`cat-view-btn${viewMode === 'card' ? ' active' : ''}`}
                                onClick={() => updateFilter('view', 'card')}
                                title="Card view"
                            >
                                ▦
                            </button>
                        </div>
                    </div>
                </section>
            )}

            <section className="cat-listing">
                <div className="cat-quick-chips">
                    <span className="cat-chips-label">Popular:</span>
                    {meta.chips.map((chip) => (
                        <button
                            key={chip}
                            type="button"
                            className={`cat-chip${search === chip ? ' cat-chip-active' : ''}`}
                            onClick={() => {
                                if (type === 'job') {
                                    const next = { ...jobFilters, search: chip };
                                    setJobFilters(next);
                                    applyJobFilters(next);
                                } else {
                                    updateFilter('q', search === chip ? '' : chip);
                                }
                            }}
                        >
                            {chip}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="cat-skeleton-grid">
                        {Array.from({ length: 8 }).map((_, index) => <AnnouncementCardSkeleton key={index} />)}
                    </div>
                ) : viewMode === 'compact' ? (
                    <div className="cat-compact-list" data-testid="category-compact-list">
                        {cards.map((card, index) => (
                            <CategoryListRow key={card.id} card={card} sourceTag="category_compact" index={index + 1} />
                        ))}
                    </div>
                ) : (
                    <div className="cat-cards-grid">
                        {cards.map((card) => (
                            <AnnouncementCard key={card.id} card={card} showType={false} sourceTag="category_list" />
                        ))}
                    </div>
                )}

                {!loading && cards.length === 0 && !fetchError && (
                    <div className="cat-empty">
                        <span className="cat-empty-icon">📭</span>
                        <h3>No {meta.title.toLowerCase()} found</h3>
                        <p>Try adjusting your search filters or check back later for new updates.</p>
                    </div>
                )}

                {!loading && fetchError && (
                    <div className="cat-empty cat-empty-error">
                        <span className="cat-empty-icon">⚠️</span>
                        <h3>Something went wrong</h3>
                        <p>Could not load {meta.title.toLowerCase()}. Please try again.</p>
                        <button type="button" className="btn btn-accent" onClick={() => void fetchCards()}>Retry</button>
                    </div>
                )}

                {hasMore && !loading && (
                    <div className="cat-load-more">
                        <button
                            type="button"
                            className="cat-load-more-btn"
                            onClick={() => fetchCards(nextCursor)}
                            disabled={loadingMore}
                        >
                            {loadingMore ? (
                                <>
                                    <span className="spinner" style={{ width: 16, height: 16 }} />
                                    Loading...
                                </>
                            ) : (
                                type === 'job' ? 'Load Next Batch →' : 'Load More →'
                            )}
                        </button>
                    </div>
                )}
            </section>
        </Layout>
    );
}
