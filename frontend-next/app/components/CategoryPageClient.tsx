'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnnouncementCard, AnnouncementCardSkeleton } from '@/app/components/AnnouncementCard';
import { CategoryListRow } from '@/app/components/category/CategoryListRow';
import { getAnnouncementCards, getOrganizations } from '@/app/lib/api';
import type { AnnouncementCard as CardType, ContentType } from '@/app/lib/types';
import { trackEvent } from '@/app/lib/analytics';
import { buildAnnouncementDetailPath, buildCategoryPath } from '@/app/lib/urls';
import '@/app/components/HomePage.css';
import '@/app/components/CategoryPage.css';

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
        description: 'Track fresh government recruitment, application deadlines, and major hiring drives from one dense workspace.',
        searchPlaceholder: 'Search job title, department, state...',
        chips: ['SSC', 'UPSC', 'Railway', 'Bank', 'Defence', 'Police'],
        filters: [
            { key: 'organization', label: 'Exam / Category', optionsKey: 'organizations' },
            { key: 'location', label: 'State', optionsKey: 'states' },
            { key: 'qualification', label: 'Qualification', optionsKey: 'qualifications' },
        ],
        urgentLabel: 'Closing Soon',
    },
    result: {
        title: 'Results',
        icon: '📊',
        description: 'Follow new result releases, merit lists, and official score updates without leaving the homepage design language.',
        searchPlaceholder: 'Search exam, board, or result keyword...',
        chips: ['UPSC', 'SSC', 'Railway', 'State PSC', 'Bank'],
        filters: [
            { key: 'organization', label: 'Exam / Board', optionsKey: 'organizations' },
            { key: 'location', label: 'State', optionsKey: 'states' },
        ],
        urgentLabel: 'Latest Results',
    },
    'admit-card': {
        title: 'Admit Cards',
        icon: '🎫',
        description: 'Find upcoming exam hall tickets, region-specific downloads, and near-term exam access links in one place.',
        searchPlaceholder: 'Search exam name, region, or board...',
        chips: ['RRB', 'SSC', 'UPPSC', 'Bank PO', 'Defence'],
        filters: [
            { key: 'organization', label: 'Exam', optionsKey: 'organizations' },
            { key: 'location', label: 'Region / State', optionsKey: 'states' },
        ],
        urgentLabel: 'Exam Week',
    },
    'answer-key': {
        title: 'Answer Keys',
        icon: '🔑',
        description: 'Browse official answer keys, response sheets, and objection windows in the same public browsing experience.',
        searchPlaceholder: 'Search exam, paper, or set...',
        chips: ['NTA', 'SSC', 'CBSE', 'State PSC', 'Railway'],
        filters: [
            { key: 'organization', label: 'Exam', optionsKey: 'organizations' },
            { key: 'location', label: 'State', optionsKey: 'states' },
        ],
    },
    syllabus: {
        title: 'Syllabus',
        icon: '📚',
        description: 'Open the latest exam syllabus, subject pattern, and preparation references from a cleaner category workspace.',
        searchPlaceholder: 'Search exam, subject, or level...',
        chips: ['SSC CGL', 'UPSC', 'Railway', 'NDA', 'Bank PO'],
        filters: [
            { key: 'organization', label: 'Exam', optionsKey: 'organizations' },
            { key: 'qualification', label: 'Level', optionsKey: 'qualifications' },
        ],
    },
    admission: {
        title: 'Admissions',
        icon: '🎓',
        description: 'Watch university admissions, counselling windows, and course notifications inside the same public browsing system.',
        searchPlaceholder: 'Search university, course, or entrance exam...',
        chips: ['UG', 'PG', 'Engineering', 'Medical', 'Diploma'],
        filters: [
            { key: 'organization', label: 'University / Board', optionsKey: 'organizations' },
            { key: 'location', label: 'State', optionsKey: 'states' },
            { key: 'qualification', label: 'Course Level', optionsKey: 'qualifications' },
        ],
    },
};

const CATEGORY_LINKS: Array<{ type: ContentType; label: string; icon: string; href: string }> = [
    { type: 'job', label: 'Latest Jobs', icon: '💼', href: buildCategoryPath('job') },
    { type: 'result', label: 'Results', icon: '📊', href: buildCategoryPath('result') },
    { type: 'admit-card', label: 'Admit Cards', icon: '🎫', href: buildCategoryPath('admit-card') },
    { type: 'answer-key', label: 'Answer Keys', icon: '🔑', href: buildCategoryPath('answer-key') },
    { type: 'syllabus', label: 'Syllabus', icon: '📚', href: buildCategoryPath('syllabus') },
    { type: 'admission', label: 'Admissions', icon: '🎓', href: buildCategoryPath('admission') },
];

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

const FILTER_ARIA_LABELS: Record<'organization' | 'location' | 'qualification', string> = {
    organization: 'Organization',
    location: 'State',
    qualification: 'Qualification',
};

function daysUntil(deadline?: string | null): number | null {
    if (!deadline) return null;
    return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
}

function splitTitle(title: string): { lead: string; accent: string } {
    const words = title.trim().split(/\s+/);
    if (words.length <= 1) return { lead: '', accent: title };
    const accent = words.pop() || title;
    return { lead: words.join(' '), accent };
}

export function CategoryPage({ type }: { type: ContentType }) {
    const meta = SECTION_META[type];
    const { lead, accent } = splitTitle(meta.title);
    const searchParams = useSearchParams();
    const router = useRouter();

    const sort = (searchParams.get('sort') as SortValue) || 'newest';
    const search = searchParams.get('q') || '';
    const location = searchParams.get('location') || '';
    const qualification = searchParams.get('qualification') || '';
    const organization = searchParams.get('organization') || '';
    const viewMode: ViewMode = (searchParams.get('view') as ViewMode) || 'compact';

    const [cards, setCards] = useState<CardType[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | undefined>();
    const [total, setTotal] = useState<number | undefined>();
    const [filterOptionSets, setFilterOptionSets] = useState(FALLBACK_OPTIONS);
    const [draft, setDraft] = useState({ search, location, qualification, organization });
    const [sheetOpen, setSheetOpen] = useState(false);

    useEffect(() => {
        if (sheetOpen) document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [sheetOpen]);

    const replaceParams = useCallback((params: URLSearchParams) => {
        const next = params.toString();
        router.replace(next ? `?${next}` : window.location.pathname);
    }, [router]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await getOrganizations();
                const orgs = [...new Set((res.data || []).map((value) => value.trim()).filter(Boolean))];
                if (!cancelled && orgs.length > 0) {
                    setFilterOptionSets((prev) => ({ ...prev, organizations: orgs }));
                }
            } catch {
                /* keep fallback options */
            }
        })();
        return () => { cancelled = true; };
    }, [type]);

    useEffect(() => {
        setDraft({ search, location, qualification, organization });
    }, [search, location, qualification, organization]);

    const fetchCards = useCallback(async (cursor?: string) => {
        const isInitial = !cursor;
        if (isInitial) {
            setLoading(true);
            setFetchError(false);
        } else {
            setLoadingMore(true);
        }

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
            if (res.total !== undefined) setTotal(res.total);
        } catch (error) {
            console.error('Failed to fetch cards:', error);
            if (isInitial) setFetchError(true);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [location, organization, qualification, search, sort, type]);

    useEffect(() => {
        setCards([]);
        setNextCursor(undefined);
        void fetchCards();
    }, [fetchCards]);

    const updateParam = useCallback((key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set(key, value);
        else params.delete(key);
        replaceParams(params);
    }, [replaceParams, searchParams]);

    const applyFilters = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        const mapping: Array<[keyof typeof draft, string]> = [
            ['search', 'q'],
            ['location', 'location'],
            ['qualification', 'qualification'],
            ['organization', 'organization'],
        ];
        for (const [draftKey, urlKey] of mapping) {
            if (draft[draftKey]) params.set(urlKey, draft[draftKey]);
            else params.delete(urlKey);
        }
        replaceParams(params);
        setSheetOpen(false);
        trackEvent('filter_apply', { type, ...draft });
    }, [draft, replaceParams, searchParams, type]);

    const resetFilters = useCallback(() => {
        setDraft({ search: '', location: '', qualification: '', organization: '' });
        const params = new URLSearchParams(searchParams.toString());
        for (const key of ['q', 'location', 'qualification', 'organization']) params.delete(key);
        replaceParams(params);
        setSheetOpen(false);
        trackEvent('filter_reset', { type });
    }, [replaceParams, searchParams, type]);

    const removeFilter = useCallback((key: 'q' | 'location' | 'qualification' | 'organization') => {
        updateParam(key, '');
        const draftKey = key === 'q' ? 'search' : key;
        setDraft((prev) => ({ ...prev, [draftKey]: '' }));
    }, [updateParam]);

    const activeFilters = useMemo(() => {
        const list: Array<{ label: string; key: 'q' | 'location' | 'qualification' | 'organization' }> = [];
        if (search) list.push({ label: `"${search}"`, key: 'q' });
        if (location) list.push({ label: location, key: 'location' });
        if (qualification) list.push({ label: qualification, key: 'qualification' });
        if (organization) list.push({ label: organization, key: 'organization' });
        return list;
    }, [location, organization, qualification, search]);

    const urgentItems = useMemo(() => {
        if (!meta.urgentLabel) return [];
        return cards.filter((card) => {
            const remaining = daysUntil(card.deadline);
            return remaining !== null && remaining >= 0 && remaining <= 7;
        }).slice(0, 3);
    }, [cards, meta.urgentLabel]);

    const resultSummary = useMemo(() => {
        if (loading) return 'Loading live updates...';
        if (total !== undefined) return `${cards.length.toLocaleString()} shown of ${total.toLocaleString()} updates`;
        if (cards.length > 0) return `${cards.length.toLocaleString()} updates loaded`;
        return 'No updates available right now';
    }, [cards.length, loading, total]);

    const renderFilterFields = useCallback((prefix: 'cat-home-filter' | 'cat-sheet') => (
        <>
            {meta.filters.map((filter) => {
                const draftKey = filter.key as keyof typeof draft;
                return (
                    <div key={filter.key} className={`${prefix}-group`}>
                        <label className={`${prefix}-label`}>{filter.label}</label>
                        <select
                            className={`${prefix}-select`}
                            aria-label={FILTER_ARIA_LABELS[filter.key]}
                            value={draft[draftKey]}
                            onChange={(event) => setDraft((prev) => ({ ...prev, [draftKey]: event.target.value }))}
                        >
                            <option value="">All</option>
                            {filterOptionSets[filter.optionsKey].map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>
                );
            })}
        </>
    ), [draft, filterOptionSets, meta.filters]);

    return (
        <>
            <div className="hp cat-home" data-testid={`category-page-${type}`}>
                <nav className="cat-home-breadcrumb" aria-label="Breadcrumb">
                    <Link href="/">Home</Link>
                    <span className="cat-home-breadcrumb-sep">/</span>
                    <span className="cat-home-breadcrumb-current">{meta.title}</span>
                </nav>

                <section className="hp-hero cat-home-hero">
                    <div className="cat-home-kicker">Homepage-style browsing</div>
                    <div className="cat-home-hero-panel">
                        <div className="cat-home-hero-copy">
                            <div className="cat-home-icon" aria-hidden="true">{meta.icon}</div>
                            <div>
                                <h1 className="hp-hero-title">
                                    {lead ? `${lead} ` : ''}
                                    <span className="hp-hero-accent">{accent}</span>
                                </h1>
                                <p className="hp-hero-sub">{meta.description}</p>
                            </div>
                        </div>
                        <div className="cat-home-stats" aria-label="Category summary">
                            <div className="cat-home-stat">
                                <span className="cat-home-stat-value">{loading ? '...' : (total ?? cards.length).toLocaleString()}</span>
                                <span className="cat-home-stat-label">Live updates</span>
                            </div>
                            <div className="cat-home-stat">
                                <span className="cat-home-stat-value">{urgentItems.length.toLocaleString()}</span>
                                <span className="cat-home-stat-label">Closing soon</span>
                            </div>
                            <div className="cat-home-stat">
                                <span className="cat-home-stat-value">{activeFilters.length.toLocaleString()}</span>
                                <span className="cat-home-stat-label">Active filters</span>
                            </div>
                        </div>
                    </div>

                    <form
                        className="hp-search cat-home-search"
                        role="search"
                        onSubmit={(event) => {
                            event.preventDefault();
                            applyFilters();
                        }}
                    >
                        <span className="hp-search-icon" aria-hidden="true">🔍</span>
                        <input
                            className="hp-search-input"
                            type="search"
                            placeholder={meta.searchPlaceholder}
                            value={draft.search}
                            onChange={(event) => setDraft((prev) => ({ ...prev, search: event.target.value }))}
                            aria-label={meta.searchPlaceholder}
                        />
                        <button className="hp-search-btn" type="submit">Search</button>
                    </form>
                </section>

                <nav className="hp-cats cat-home-cats" aria-label="Browse categories">
                    {CATEGORY_LINKS.map((category) => (
                        <Link
                            key={category.type}
                            href={category.href}
                            className={`hp-cat-card cat-home-cat-card${category.type === type ? ' is-active' : ''}`}
                        >
                            <span className="hp-cat-icon">{category.icon}</span>
                            <span className="hp-cat-label">{category.label}</span>
                        </Link>
                    ))}
                </nav>

                <section className="home-dense-box cat-home-filter-card" data-testid="jobs-filter-panel">
                    <div className="home-dense-box-header">
                        <h2>Refine {meta.title}</h2>
                        <button type="button" className="cat-home-filter-reset" onClick={resetFilters}>Reset all</button>
                    </div>
                    <div className="cat-home-filter-grid">
                        {renderFilterFields('cat-home-filter')}
                        <div className="cat-home-filter-group">
                            <label className="cat-home-filter-label">Sort by</label>
                            <select
                                className="cat-home-filter-select"
                                value={sort}
                                onChange={(event) => updateParam('sort', event.target.value)}
                            >
                                {SORT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="cat-home-filter-actions">
                            <button type="button" className="cat-home-filter-apply" onClick={applyFilters}>Apply filters</button>
                        </div>
                    </div>
                </section>

                <section className="home-dense-box cat-home-results-box">
                    <div className="cat-home-results-head">
                        <div>
                            <div className="home-dense-box-header">
                                <h2>{meta.title} feed</h2>
                            </div>
                            <p className="cat-home-results-copy">{resultSummary}</p>
                        </div>
                        <div className="cat-home-results-controls">
                            <button type="button" className="cat-home-mobile-filter" onClick={() => setSheetOpen(true)}>
                                Filters
                                {activeFilters.length > 0 && <span className="cat-home-filter-badge">{activeFilters.length}</span>}
                            </button>
                            <select
                                className="cat-home-toolbar-sort"
                                value={sort}
                                onChange={(event) => updateParam('sort', event.target.value)}
                                aria-label="Sort results"
                            >
                                {SORT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <div className="cat-home-view-toggle" role="group" aria-label="View mode">
                                <button
                                    type="button"
                                    className={`cat-home-view-btn${viewMode === 'compact' ? ' active' : ''}`}
                                    onClick={() => updateParam('view', 'compact')}
                                    title="List view"
                                >
                                    List
                                </button>
                                <button
                                    type="button"
                                    className={`cat-home-view-btn${viewMode === 'card' ? ' active' : ''}`}
                                    onClick={() => updateParam('view', 'card')}
                                    title="Card view"
                                >
                                    Cards
                                </button>
                            </div>
                        </div>
                    </div>

                    {activeFilters.length > 0 && (
                        <div className="cat-home-active-filters">
                            {activeFilters.map((filter) => (
                                <span key={filter.key} className="cat-home-active-tag">
                                    {filter.label}
                                    <button type="button" onClick={() => removeFilter(filter.key)} aria-label={`Remove ${filter.label}`}>
                                        x
                                    </button>
                                </span>
                            ))}
                            <button type="button" className="cat-home-clear-all" onClick={resetFilters}>Clear all</button>
                        </div>
                    )}

                    <div className="cat-home-highlights">
                        <div className="cat-home-chip-rail">
                            <span className="cat-home-chip-label">Popular searches</span>
                            {meta.chips.map((chip) => (
                                <button
                                    key={chip}
                                    type="button"
                                    className={`cat-home-chip${search === chip ? ' active' : ''}`}
                                    onClick={() => {
                                        const nextSearch = search === chip ? '' : chip;
                                        setDraft((prev) => ({ ...prev, search: nextSearch }));
                                        updateParam('q', nextSearch);
                                        trackEvent('chip_click', { type, chip });
                                    }}
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>

                        {!loading && urgentItems.length > 0 && meta.urgentLabel && (
                            <div className="cat-home-urgent" aria-label={meta.urgentLabel}>
                                <span className="cat-home-urgent-label">{meta.urgentLabel}</span>
                                <div className="cat-home-urgent-links">
                                    {urgentItems.map((card) => {
                                        const remaining = daysUntil(card.deadline);
                                        return (
                                            <Link key={card.id} href={buildAnnouncementDetailPath(card.type, card.slug)} className="cat-home-urgent-link">
                                                <span>{card.title.length > 44 ? `${card.title.slice(0, 44)}...` : card.title}</span>
                                                {remaining !== null && remaining >= 0 && (
                                                    <span className="cat-home-urgent-days">{remaining === 0 ? 'Today' : `${remaining}d`}</span>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
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
                            <p>Try another keyword, clear a filter, or check again after the next official update.</p>
                        </div>
                    )}

                    {!loading && fetchError && (
                        <div className="cat-empty cat-empty-error">
                            <span className="cat-empty-icon">⚠️</span>
                            <h3>Unable to load {meta.title.toLowerCase()}</h3>
                            <p>The category feed did not load successfully. Try again and we will refetch the latest updates.</p>
                            <button type="button" className="cat-home-filter-apply" onClick={() => void fetchCards()}>Retry</button>
                        </div>
                    )}

                    {hasMore && !loading && (
                        <div className="cat-load-more">
                            <button
                                type="button"
                                className="cat-load-more-btn"
                                onClick={() => void fetchCards(nextCursor)}
                                disabled={loadingMore}
                            >
                                {loadingMore ? 'Loading...' : 'Load more updates'}
                            </button>
                        </div>
                    )}
                </section>
            </div>

            {sheetOpen && (
                <div className="cat-sheet-overlay" onClick={() => setSheetOpen(false)}>
                    <div className="cat-sheet" onClick={(event) => event.stopPropagation()}>
                        <div className="cat-sheet-handle"><span /></div>
                        <div className="cat-sheet-header">
                            <h3>Refine {meta.title}</h3>
                            <button type="button" className="cat-sheet-close" onClick={() => setSheetOpen(false)}>x</button>
                        </div>
                        <div className="cat-sheet-body">
                            <div className="cat-sheet-group">
                                <label className="cat-sheet-label">Search</label>
                                <input
                                    className="cat-sheet-input"
                                    type="search"
                                    placeholder={meta.searchPlaceholder}
                                    value={draft.search}
                                    onChange={(event) => setDraft((prev) => ({ ...prev, search: event.target.value }))}
                                />
                            </div>
                            {renderFilterFields('cat-sheet')}
                            <div className="cat-sheet-group">
                                <label className="cat-sheet-label">Sort by</label>
                                <select
                                    className="cat-sheet-select"
                                    value={sort}
                                    onChange={(event) => updateParam('sort', event.target.value)}
                                >
                                    {SORT_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="cat-sheet-footer">
                            <button type="button" className="cat-sheet-apply" onClick={applyFilters}>Apply filters</button>
                            <button type="button" className="cat-sheet-reset" onClick={resetFilters}>Reset</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
