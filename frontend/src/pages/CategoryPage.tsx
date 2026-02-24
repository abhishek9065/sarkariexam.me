 import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { AnnouncementCard, AnnouncementCardSkeleton } from '../components/AnnouncementCard';
import { CategoryListRow } from '../components/category/CategoryListRow';
import { getAnnouncementCards, getOrganizations } from '../utils/api';
import { trackEvent } from '../utils/analytics';
import type { AnnouncementCard as CardType, ContentType } from '../types';
import './CategoryPage.css';

/* ─── Section-specific configuration ─── */

interface SectionMeta {
    title: string;
    icon: string;
    description: string;
    searchPlaceholder: string;
    chips: string[];
    filters: Array<{
        key: 'organization' | 'location' | 'qualification';
        label: string;
        optionsKey: 'organizations' | 'states' | 'qualifications';
    }>;
    urgentLabel?: string;
}

const SECTION_META: Record<ContentType, SectionMeta> = {
    job: {
        title: 'Latest Jobs',
        icon: '💼',
        description: 'New government job notifications updated daily.',
        searchPlaceholder: 'Search job title, department, state…',
        chips: ['SSC', 'UPSC', 'Railway', 'Bank', 'Defence', 'Police'],
        filters: [
            { key: 'organization', label: 'Exam / Category', optionsKey: 'organizations' },
            { key: 'location', label: 'State', optionsKey: 'states' },
            { key: 'qualification', label: 'Qualification', optionsKey: 'qualifications' },
        ],
        urgentLabel: '🔥 Closing Soon',
    },
    result: {
        title: 'Results',
        icon: '📊',
        description: 'Check exam results, merit lists, and cut-off marks.',
        searchPlaceholder: 'Search exam / board / roll no keywords…',
        chips: ['UPSC', 'SSC', 'Railway', 'State PSC', 'Bank'],
        filters: [
            { key: 'organization', label: 'Exam / Board', optionsKey: 'organizations' },
            { key: 'location', label: 'State', optionsKey: 'states' },
        ],
        urgentLabel: '📌 Latest Results',
    },
    'admit-card': {
        title: 'Admit Cards',
        icon: '🎫',
        description: 'Download hall tickets for upcoming examinations.',
        searchPlaceholder: 'Search exam name, region…',
        chips: ['RRB', 'SSC', 'UPPSC', 'Bank PO', 'Defence'],
        filters: [
            { key: 'organization', label: 'Exam', optionsKey: 'organizations' },
            { key: 'location', label: 'Region / State', optionsKey: 'states' },
        ],
        urgentLabel: '📅 Exams This Week',
    },
    'answer-key': {
        title: 'Answer Keys',
        icon: '🔑',
        description: 'View official answer keys and raise objections.',
        searchPlaceholder: 'Search exam, paper / set…',
        chips: ['NTA', 'SSC', 'CBSE', 'State PSC', 'Railway'],
        filters: [
            { key: 'organization', label: 'Exam', optionsKey: 'organizations' },
            { key: 'location', label: 'State', optionsKey: 'states' },
        ],
    },
    syllabus: {
        title: 'Syllabus',
        icon: '📚',
        description: 'Exam syllabus, patterns, and preparation material.',
        searchPlaceholder: 'Search exam, subject…',
        chips: ['SSC CGL', 'UPSC', 'Railway', 'NDA', 'Bank PO'],
        filters: [
            { key: 'organization', label: 'Exam', optionsKey: 'organizations' },
            { key: 'qualification', label: 'Level', optionsKey: 'qualifications' },
        ],
    },
    admission: {
        title: 'Admissions',
        icon: '🎓',
        description: 'University and college admission notifications.',
        searchPlaceholder: 'Search university, course, entrance exam…',
        chips: ['UG', 'PG', 'Engineering', 'Medical', 'Diploma'],
        filters: [
            { key: 'organization', label: 'University / Board', optionsKey: 'organizations' },
            { key: 'location', label: 'State', optionsKey: 'states' },
            { key: 'qualification', label: 'Course Level', optionsKey: 'qualifications' },
        ],
    },
};

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest First' },
    { value: 'deadline', label: 'Closing Soon' },
    { value: 'views', label: 'Popular' },
    { value: 'oldest', label: 'Oldest First' },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]['value'];
type ViewMode = 'compact' | 'card';

const DEFAULT_PAGE_SIZE = 20;
const JOB_PAGE_SIZE = 50;

const FALLBACK_OPTIONS = {
    states: [
        'Andhra Pradesh', 'Bihar', 'Delhi', 'Gujarat', 'Haryana',
        'Karnataka', 'Madhya Pradesh', 'Maharashtra', 'Punjab',
        'Rajasthan', 'Tamil Nadu', 'Uttar Pradesh', 'West Bengal',
    ],
    qualifications: ['10th Pass', '12th Pass', 'ITI', 'Diploma', 'Graduate', 'Post Graduate', 'Engineering'],
    organizations: ['SSC', 'UPSC', 'Railway', 'Banking', 'Defence', 'State PSC', 'Teaching'],
};

/* ─── Helpers ─── */

function daysUntil(deadline?: string | null): number | null {
    if (!deadline) return null;
    return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
}

/* ─── Component ─── */

export function CategoryPage({ type }: { type: ContentType }) {
    const meta = SECTION_META[type];
    const [searchParams, setSearchParams] = useSearchParams();

    /* URL-driven state */
    const sort = (searchParams.get('sort') as SortValue) || 'newest';
    const search = searchParams.get('q') || '';
    const location = searchParams.get('location') || '';
    const qualification = searchParams.get('qualification') || '';
    const organization = searchParams.get('organization') || '';
    const viewMode: ViewMode = (searchParams.get('view') as ViewMode) || 'compact';

    /* Data state */
    const [cards, setCards] = useState<CardType[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | undefined>();
    const [total, setTotal] = useState<number | undefined>();

    /* Filter dropdown options */
    const [filterOptionSets, setFilterOptionSets] = useState(FALLBACK_OPTIONS);

    /* Sidebar / sheet draft (matches URL until user clicks Apply) */
    const [draft, setDraft] = useState({ search, location, qualification, organization });

    /* Mobile bottom-sheet */
    const [sheetOpen, setSheetOpen] = useState(false);

    const filterAriaLabelByKey: Record<'organization' | 'location' | 'qualification', string> = {
        organization: 'Organization',
        location: 'State',
        qualification: 'Qualification',
    };

    /* ─── Fetch filter options ─── */
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await getOrganizations();
                const orgs = [...new Set((res.data || []).map((s) => s.trim()).filter(Boolean))];
                if (!cancelled && orgs.length > 0) {
                    setFilterOptionSets((prev) => ({ ...prev, organizations: orgs }));
                }
            } catch { /* keep fallback */ }
        })();
        return () => { cancelled = true; };
    }, [type]);

    /* Keep draft in sync when URL changes */
    useEffect(() => {
        setDraft({ search, location, qualification, organization });
    }, [search, location, qualification, organization]);

    /* ─── Fetch cards ─── */
    const fetchCards = useCallback(async (cursor?: string) => {
        const isInitial = !cursor;
        if (isInitial) { setLoading(true); setFetchError(false); } else setLoadingMore(true);

        try {
            const res = await getAnnouncementCards({
                type, sort,
                search: search || undefined,
                location: location || undefined,
                qualification: qualification || undefined,
                organization: organization || undefined,
                limit: type === 'job' ? JOB_PAGE_SIZE : DEFAULT_PAGE_SIZE,
                cursor,
            });
            if (isInitial) setCards(res.data);
            else setCards((prev) => [...prev, ...res.data]);
            setHasMore(res.hasMore ?? false);
            setNextCursor(res.nextCursor);
            if (res.total !== undefined) setTotal(res.total);
        } catch (err) {
            console.error('Failed to fetch cards:', err);
            if (isInitial) setFetchError(true);
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

    /* ─── URL param helpers ─── */
    const updateParam = useCallback(
        (key: string, value: string) => {
            const p = new URLSearchParams(searchParams);
            if (value) p.set(key, value); else p.delete(key);
            setSearchParams(p, { replace: true });
        },
        [searchParams, setSearchParams],
    );

    const applyFilters = useCallback(() => {
        const p = new URLSearchParams(searchParams);
        const mapping: Array<[keyof typeof draft, string]> = [
            ['search', 'q'], ['location', 'location'], ['qualification', 'qualification'], ['organization', 'organization'],
        ];
        for (const [dk, uk] of mapping) {
            if (draft[dk]) p.set(uk, draft[dk]); else p.delete(uk);
        }
        setSearchParams(p, { replace: true });
        setSheetOpen(false);
        trackEvent('filter_apply', { type, ...draft });
    }, [draft, searchParams, setSearchParams, type]);

    const resetFilters = useCallback(() => {
        setDraft({ search: '', location: '', qualification: '', organization: '' });
        const p = new URLSearchParams(searchParams);
        for (const k of ['q', 'location', 'qualification', 'organization']) p.delete(k);
        setSearchParams(p, { replace: true });
        setSheetOpen(false);
        trackEvent('filter_reset', { type });
    }, [searchParams, setSearchParams, type]);

    const removeFilter = useCallback(
        (key: 'q' | 'location' | 'qualification' | 'organization') => {
            updateParam(key, '');
            const draftKey = key === 'q' ? 'search' : key;
            setDraft((prev) => ({ ...prev, [draftKey]: '' }));
        },
        [updateParam],
    );

    /* ─── Derived data ─── */
    const activeFilters = useMemo(() => {
        const list: Array<{ label: string; key: 'q' | 'location' | 'qualification' | 'organization' }> = [];
        if (search) list.push({ label: `"${search}"`, key: 'q' });
        if (location) list.push({ label: location, key: 'location' });
        if (qualification) list.push({ label: qualification, key: 'qualification' });
        if (organization) list.push({ label: organization, key: 'organization' });
        return list;
    }, [search, location, qualification, organization]);

    /* Closing-soon / pinned strip (max 3) */
    const urgentItems = useMemo(() => {
        if (!meta.urgentLabel) return [];
        return cards.filter((c) => {
            const d = daysUntil(c.deadline);
            return d !== null && d >= 0 && d <= 7;
        }).slice(0, 3);
    }, [cards, meta.urgentLabel]);

    /* ─── Shared filter controls renderer ─── */
    const renderFilterFields = (prefix: string) => (
        <>
            {meta.filters.map((f) => {
                const draftKey = f.key as keyof typeof draft;
                return (
                    <div key={f.key} className={`${prefix}-group`}>
                        <label className={`${prefix}-label`}>{f.label}</label>
                        <select
                            className={`${prefix}-select`}
                            aria-label={filterAriaLabelByKey[f.key]}
                            value={draft[draftKey]}
                            onChange={(e) => setDraft((prev) => ({ ...prev, [draftKey]: e.target.value }))}
                        >
                            <option value="">All</option>
                            {filterOptionSets[f.optionsKey].map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                );
            })}
        </>
    );

    return (
        <Layout>
            {/* Breadcrumb */}
            <nav className="cat-breadcrumb">
                <Link to="/">Home</Link>
                <span className="cat-breadcrumb-sep">›</span>
                <span className="cat-breadcrumb-current">{meta.title}</span>
            </nav>

            {/* Hero v2 with integrated search */}
            <section className="cat-hero-v2 animate-fade-in">
                <div className="cat-hero-v2-inner">
                    <div className="cat-hero-v2-icon"><span>{meta.icon}</span></div>
                    <div className="cat-hero-v2-text">
                        <h1 className="cat-hero-v2-title">{meta.title}</h1>
                        <p className="cat-hero-v2-desc">{meta.description}</p>
                    </div>
                    {total !== undefined && (
                        <div className="cat-hero-v2-count">
                            <span className="cat-hero-v2-count-num">{total.toLocaleString()}</span>
                            <span className="cat-hero-v2-count-label">Total</span>
                        </div>
                    )}
                </div>
                <div className="cat-hero-search">
                    <span className="cat-hero-search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder={meta.searchPlaceholder}
                        value={draft.search}
                        onChange={(e) => setDraft((prev) => ({ ...prev, search: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                    />
                </div>
            </section>

            {/* 2-column layout: sidebar + results */}
            <div className="cat-layout">
                {/* Desktop filter sidebar */}
                <aside className="cat-sidebar" data-testid="jobs-filter-panel">
                    <h2 className="cat-sidebar-title">🎛️ Filters</h2>
                    <div className="cat-sidebar-group">
                        <label className="cat-sidebar-label">Search</label>
                        <input
                            type="text"
                            className="cat-sidebar-input"
                            aria-label="Search"
                            placeholder={meta.searchPlaceholder}
                            value={draft.search}
                            onChange={(e) => setDraft((prev) => ({ ...prev, search: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                        />
                    </div>
                    {renderFilterFields('cat-sidebar')}

                    <div className="cat-sidebar-group">
                        <label className="cat-sidebar-label">Sort By</label>
                        <select className="cat-sidebar-select" value={sort} onChange={(e) => updateParam('sort', e.target.value)}>
                            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>

                    <div className="cat-sidebar-actions">
                        <button type="button" className="cat-sidebar-apply" onClick={applyFilters}>Apply Filters</button>
                        <button type="button" className="cat-sidebar-reset" onClick={resetFilters}>Reset</button>
                    </div>
                </aside>

                {/* Main results column */}
                <main className="cat-main">
                    {/* Toolbar */}
                    <div className="cat-toolbar">
                        <button type="button" className="cat-filter-trigger" onClick={() => setSheetOpen(true)}>
                            🎛️ Filters
                            {activeFilters.length > 0 && <span className="cat-filter-badge">{activeFilters.length}</span>}
                        </button>
                        <span className="cat-results-count">
                            {!loading && total !== undefined
                                ? `Showing ${cards.length > 0 ? 1 : 0}–${cards.length} of ${total.toLocaleString()}`
                                : !loading && cards.length > 0 ? `${cards.length} results` : ''}
                        </span>
                        <select className="cat-toolbar-sort" value={sort} onChange={(e) => updateParam('sort', e.target.value)}>
                            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <div className="cat-view-toggle-v2" role="group" aria-label="View mode">
                            <button type="button" className={`cat-view-btn-v2${viewMode === 'compact' ? ' active' : ''}`} onClick={() => updateParam('view', 'compact')} title="List">☰</button>
                            <button type="button" className={`cat-view-btn-v2${viewMode === 'card' ? ' active' : ''}`} onClick={() => updateParam('view', 'card')} title="Cards">▦</button>
                        </div>
                    </div>

                    {/* Active filters */}
                    {activeFilters.length > 0 && (
                        <div className="cat-active-filters">
                            {activeFilters.map((f) => (
                                <span key={f.key} className="cat-active-tag">
                                    {f.label}
                                    <button type="button" onClick={() => removeFilter(f.key)} aria-label={`Remove ${f.label}`}>✕</button>
                                </span>
                            ))}
                            <button type="button" className="cat-clear-all" onClick={resetFilters}>Clear all</button>
                        </div>
                    )}

                    {/* Urgent strip */}
                    {!loading && urgentItems.length > 0 && meta.urgentLabel && (
                        <div className="cat-urgent-strip">
                            <span className="cat-urgent-label">{meta.urgentLabel}</span>
                            {urgentItems.map((c) => {
                                const d = daysUntil(c.deadline);
                                return (
                                    <Link key={c.id} to={`/${c.type}/${c.slug}`} className="cat-urgent-item">
                                        {c.title.length > 40 ? c.title.slice(0, 40) + '…' : c.title}
                                        {d !== null && d >= 0 && <span className="cat-urgent-days">{d === 0 ? 'Today' : `${d}d`}</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    {/* Quick chips */}
                    <div className="cat-chips-v2">
                        <span className="cat-chips-v2-label">Popular:</span>
                        {meta.chips.map((chip) => (
                            <button
                                key={chip}
                                type="button"
                                className={`cat-chip-v2${search === chip ? ' active' : ''}`}
                                onClick={() => {
                                    const next = search === chip ? '' : chip;
                                    setDraft((prev) => ({ ...prev, search: next }));
                                    updateParam('q', next);
                                    trackEvent('chip_click', { type, chip });
                                }}
                            >
                                {chip}
                            </button>
                        ))}
                    </div>

                    {/* Results */}
                    {loading ? (
                        <div className="cat-skeleton-grid">
                            {Array.from({ length: 8 }).map((_, i) => <AnnouncementCardSkeleton key={i} />)}
                        </div>
                    ) : viewMode === 'compact' ? (
                        <div className="cat-compact-list" data-testid="category-compact-list">
                            {cards.map((card, i) => <CategoryListRow key={card.id} card={card} sourceTag="category_compact" index={i + 1} />)}
                        </div>
                    ) : (
                        <div className="cat-cards-grid">
                            {cards.map((card) => <AnnouncementCard key={card.id} card={card} showType={false} sourceTag="category_list" />)}
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && cards.length === 0 && !fetchError && (
                        <div className="cat-empty">
                            <span className="cat-empty-icon">📭</span>
                            <h3>No {meta.title.toLowerCase()} found</h3>
                            <p>Try adjusting your search filters or check back later for new updates.</p>
                        </div>
                    )}

                    {/* Error */}
                    {!loading && fetchError && (
                        <div className="cat-empty cat-empty-error">
                            <span className="cat-empty-icon">⚠️</span>
                            <h3>Something went wrong</h3>
                            <p>Could not load {meta.title.toLowerCase()}. Please try again.</p>
                            <button type="button" className="btn btn-accent" onClick={() => void fetchCards()}>Retry</button>
                        </div>
                    )}

                    {/* Load more */}
                    {hasMore && !loading && (
                        <div className="cat-load-more">
                            <button type="button" className="cat-load-more-btn" onClick={() => fetchCards(nextCursor)} disabled={loadingMore}>
                                {loadingMore ? (
                                    <><span className="spinner" style={{ width: 16, height: 16 }} /> Loading…</>
                                ) : 'Load More →'}
                            </button>
                        </div>
                    )}
                </main>
            </div>

            {/* Mobile bottom-sheet */}
            {sheetOpen && (
                <div className="cat-sheet-overlay" onClick={() => setSheetOpen(false)}>
                    <div className="cat-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="cat-sheet-handle"><span /></div>
                        <div className="cat-sheet-header">
                            <h3>Filters</h3>
                            <button type="button" className="cat-sheet-close" onClick={() => setSheetOpen(false)}>✕</button>
                        </div>
                        <div className="cat-sheet-body">
                            <div className="cat-sheet-group">
                                <label>Search</label>
                                <input
                                    type="text"
                                    placeholder={meta.searchPlaceholder}
                                    value={draft.search}
                                    onChange={(e) => setDraft((prev) => ({ ...prev, search: e.target.value }))}
                                />
                            </div>
                            {renderFilterFields('cat-sheet')}
                            <div className="cat-sheet-group">
                                <label>Sort By</label>
                                <select value={sort} onChange={(e) => updateParam('sort', e.target.value)}>
                                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="cat-sheet-footer">
                            <button type="button" className="cat-sheet-apply" onClick={applyFilters}>Apply Filters</button>
                            <button type="button" className="cat-sheet-reset" onClick={resetFilters}>Reset</button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
