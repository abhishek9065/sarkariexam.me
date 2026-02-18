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
            <section className="category-header animate-fade-in">
                <div className="category-header-title">
                    <span className="category-header-icon">{meta.icon}</span>
                    <div>
                        <h1>{meta.title}</h1>
                        <p className="text-muted">{meta.description}</p>
                    </div>
                </div>
                {total !== undefined && (
                    <span className="category-count">{total.toLocaleString()} found</span>
                )}
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
                <section className="filters-bar filters-bar-sticky">
                    <div className="filters-row">
                        <input
                            className="input filter-search"
                            type="text"
                            placeholder="Search within results..."
                            value={search}
                            onChange={(event) => updateFilter('q', event.target.value)}
                        />
                        <input
                            className="input filter-field"
                            type="text"
                            placeholder="Location"
                            value={location}
                            onChange={(event) => updateFilter('location', event.target.value)}
                        />
                        <input
                            className="input filter-field"
                            type="text"
                            placeholder="Qualification"
                            value={qualification}
                            onChange={(event) => updateFilter('qualification', event.target.value)}
                        />
                        <select
                            className="input filter-sort"
                            value={sort}
                            onChange={(event) => updateFilter('sort', event.target.value)}
                        >
                            {SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <div className="category-view-toggle" role="group" aria-label="Toggle category view">
                            <button
                                type="button"
                                className={`category-view-btn${viewMode === 'compact' ? ' active' : ''}`}
                                onClick={() => updateFilter('view', 'compact')}
                            >
                                Compact
                            </button>
                            <button
                                type="button"
                                className={`category-view-btn${viewMode === 'card' ? ' active' : ''}`}
                                onClick={() => updateFilter('view', 'card')}
                            >
                                Cards
                            </button>
                        </div>
                    </div>
                </section>
            )}

            <section className="category-listing">
                <div className="category-quick-chips">
                    {meta.chips.map((chip) => (
                        <button
                            key={chip}
                            type="button"
                            className="category-chip"
                            onClick={() => {
                                if (type === 'job') {
                                    const next = { ...jobFilters, search: chip };
                                    setJobFilters(next);
                                    applyJobFilters(next);
                                } else {
                                    updateFilter('q', chip);
                                }
                            }}
                        >
                            {chip}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="grid-auto">
                        {Array.from({ length: 8 }).map((_, index) => <AnnouncementCardSkeleton key={index} />)}
                    </div>
                ) : viewMode === 'compact' ? (
                    <div className="category-compact-list" data-testid="category-compact-list">
                        {cards.map((card) => (
                            <CategoryListRow key={card.id} card={card} sourceTag="category_compact" />
                        ))}
                    </div>
                ) : (
                    <div className="grid-auto">
                        {cards.map((card) => (
                            <AnnouncementCard key={card.id} card={card} showType={false} sourceTag="category_list" />
                        ))}
                    </div>
                )}

                {!loading && cards.length === 0 && !fetchError && (
                    <div className="empty-state">
                        <span className="empty-state-icon">📭</span>
                        <h3>No {meta.title.toLowerCase()} found</h3>
                        <p className="text-muted">Try adjusting your filters or check back later.</p>
                    </div>
                )}

                {!loading && fetchError && (
                    <div className="empty-state">
                        <span className="empty-state-icon">⚠️</span>
                        <h3>Something went wrong</h3>
                        <p className="text-muted">Could not load {meta.title.toLowerCase()}. Please try again.</p>
                        <button type="button" className="btn btn-accent" onClick={() => void fetchCards()}>Retry</button>
                    </div>
                )}

                {hasMore && !loading && (
                    <div className="load-more">
                        <button
                            type="button"
                            className="btn btn-outline btn-lg"
                            onClick={() => fetchCards(nextCursor)}
                            disabled={loadingMore}
                        >
                            {loadingMore ? (
                                <>
                                    <span className="spinner" style={{ width: 16, height: 16 }} />
                                    Loading...
                                </>
                            ) : (
                                type === 'job' ? 'Load Next Batch' : 'Load More'
                            )}
                        </button>
                    </div>
                )}
            </section>
        </Layout>
    );
}
