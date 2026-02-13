import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SEOHead } from '../../components/seo/SEOHead';
import type { Announcement, ContentType } from '../../types';
import { formatDate } from '../../utils';
import { AppShell } from '../app/AppShell';
import { CompareDrawerV3 } from '../components/shared/CompareDrawerV3';
import { useCompareV3 } from '../hooks/useCompareV3';
import { useDiscoveryDataV3 } from '../hooks/useDiscoveryDataV3';
import { useGlobalSearchV3 } from '../hooks/useGlobalSearchV3';
import { useTrackerV3 } from '../hooks/useTrackerV3';

interface CategoryPageV3Props {
    type: ContentType;
}

type QuickMode = 'all' | 'closing' | 'high-posts' | 'trending' | 'fresh';

const CATEGORY_TITLES: Record<ContentType, string> = {
    job: 'Government Jobs',
    result: 'Latest Results',
    'admit-card': 'Admit Cards',
    'answer-key': 'Answer Keys',
    admission: 'Admissions',
    syllabus: 'Syllabus',
};

const SORT_OPTIONS: Array<{ value: 'newest' | 'oldest' | 'deadline' | 'views'; label: string }> = [
    { value: 'newest', label: 'Newest' },
    { value: 'deadline', label: 'Deadline' },
    { value: 'views', label: 'Trending' },
    { value: 'oldest', label: 'Oldest' },
];

export function CategoryPageV3({ type }: CategoryPageV3Props) {
    const navigate = useNavigate();
    const location = useLocation();
    const compare = useCompareV3();
    const tracker = useTrackerV3();

    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const initialSearch = queryParams.get('search') || '';
    const initialCategory = queryParams.get('category') || '';
    const initialOrganization = queryParams.get('organization') || '';

    const [keyword, setKeyword] = useState(initialSearch);
    const [category, setCategory] = useState(initialCategory);
    const [organization, setOrganization] = useState(initialOrganization);
    const [sort, setSort] = useState<'newest' | 'oldest' | 'deadline' | 'views'>('newest');
    const [quickMode, setQuickMode] = useState<QuickMode>('all');

    const discovery = useDiscoveryDataV3({
        type,
        search: keyword,
        category,
        organization,
        sort,
        limit: 60,
    });

    const search = useGlobalSearchV3({
        onOpenDetail: (detailType, slug) => navigate(`/${detailType}/${slug}`),
        onOpenCategory: (filter, query) => {
            const path = filter === 'result'
                ? '/results'
                : filter === 'admit-card'
                    ? '/admit-card'
                    : '/jobs';
            navigate(`${path}?search=${encodeURIComponent(query)}`);
        },
    });

    const quickFilteredItems = useMemo(() => {
        if (quickMode === 'all') return discovery.items;
        if (quickMode === 'closing') {
            return discovery.items.filter((item) => {
                if (!item.deadline) return false;
                const days = Math.ceil((new Date(item.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return days >= 0 && days <= 7;
            });
        }
        if (quickMode === 'high-posts') {
            return discovery.items.filter((item) => (item.totalPosts ?? 0) >= 500);
        }
        if (quickMode === 'trending') {
            return discovery.items.filter((item) => (item.viewCount ?? 0) >= 1200);
        }
        return discovery.items.filter((item) => {
            if (!item.postedAt) return false;
            const posted = new Date(item.postedAt).getTime();
            return Date.now() - posted <= 3 * 24 * 60 * 60 * 1000;
        });
    }, [discovery.items, quickMode]);

    const toggleTrack = async (item: Announcement) => {
        if (tracker.isTracked(item.slug)) {
            await tracker.untrack(item.slug);
            return;
        }
        await tracker.trackAnnouncement(item, 'saved');
    };

    const trackedSlugs = useMemo(() => new Set(tracker.items.map((item) => item.slug)), [tracker.items]);
    const activeFilters = useMemo(() => [
        keyword && `Search: ${keyword}`,
        category && `Category: ${category}`,
        organization && `Org: ${organization}`,
        quickMode !== 'all' && `Mode: ${quickMode}`,
    ].filter(Boolean) as string[], [category, keyword, organization, quickMode]);

    const canonical = `${window.location.origin}${location.pathname}${location.search}`;

    return (
        <>
            <SEOHead
                title={`${CATEGORY_TITLES[type]} - SarkariExams`}
                description={`Dense listing of ${CATEGORY_TITLES[type].toLowerCase()} with quick compare and tracker actions.`}
                canonicalUrl={canonical}
                keywords={[CATEGORY_TITLES[type], 'sarkari', 'government jobs', 'latest notification']}
            />

            <AppShell search={search} compareCount={compare.selections.length} onOpenCompare={compare.open}>
                <section className="sr3-section sr3-surface sr3-category-head">
                    <div>
                        <h1 className="sr3-home-title">{CATEGORY_TITLES[type]}</h1>
                        <p className="sr3-section-subtitle">{quickFilteredItems.length} listings available in current view</p>
                    </div>
                    <div className="sr3-meta-row">
                        {activeFilters.length === 0 && <span className="sr3-badge blue">No active filters</span>}
                        {activeFilters.map((label) => <span key={label} className="sr3-badge green">{label}</span>)}
                    </div>
                </section>

                <section className="sr3-section sr3-surface sr3-filter-bar" aria-label="Filters">
                    <input
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        placeholder="Search by title, exam, board"
                        aria-label="Search keyword"
                    />
                    <input
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        placeholder="Category"
                        aria-label="Category filter"
                    />
                    <input
                        value={organization}
                        onChange={(event) => setOrganization(event.target.value)}
                        placeholder="Organization"
                        aria-label="Organization filter"
                    />
                    <select value={sort} onChange={(event) => setSort(event.target.value as 'newest' | 'oldest' | 'deadline' | 'views')}>
                        {SORT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </section>

                <section className="sr3-section sr3-surface sr3-quick-mode" aria-label="Quick mode">
                    {(['all', 'fresh', 'closing', 'high-posts', 'trending'] as QuickMode[]).map((mode) => (
                        <button
                            key={mode}
                            type="button"
                            className={`sr3-link-chip ${quickMode === mode ? 'active' : ''}`}
                            onClick={() => setQuickMode(mode)}
                        >
                            {mode.replace('-', ' ')}
                        </button>
                    ))}
                </section>

                {discovery.loading && <div className="sr3-surface sr3-loading">Loading listings...</div>}
                {discovery.error && <div className="sr3-surface sr3-error">{discovery.error}</div>}

                {!discovery.loading && quickFilteredItems.length === 0 && (
                    <section className="sr3-section sr3-surface">
                        <p className="sr3-empty">No listings match the current filters.</p>
                    </section>
                )}

                {quickFilteredItems.length > 0 && (
                    <section className="sr3-section sr3-surface sr3-dense-list">
                        <ol className="sr3-dense-items">
                            {quickFilteredItems.map((item) => (
                                <li key={item.id || item.slug} className="sr3-dense-item">
                                    <div className="sr3-dense-main">
                                        <Link to={`/${item.type}/${item.slug}`} className="sr3-dense-link">{item.title}</Link>
                                        <div className="sr3-dense-meta">
                                            <span>{item.organization || 'Government'}</span>
                                            {item.deadline && <span>Deadline: {formatDate(item.deadline)}</span>}
                                            {item.totalPosts != null && <span>Posts: {item.totalPosts}</span>}
                                        </div>
                                    </div>
                                    <div className="sr3-dense-actions">
                                        <button type="button" className="sr3-btn secondary" onClick={() => { void toggleTrack(item); }}>
                                            {trackedSlugs.has(item.slug) ? 'Untrack' : 'Track'}
                                        </button>
                                        {item.type === 'job' && (
                                            <button type="button" className="sr3-btn secondary" onClick={() => compare.add(item)}>
                                                Compare
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ol>

                        <footer className="sr3-card-foot">
                            {discovery.hasMore ? (
                                <button type="button" className="sr3-btn" onClick={() => { void discovery.loadMore(); }} disabled={discovery.loadingMore}>
                                    {discovery.loadingMore ? 'Loading...' : 'Load more'}
                                </button>
                            ) : (
                                <span className="sr3-section-subtitle">You reached the end of this list.</span>
                            )}
                        </footer>
                    </section>
                )}
            </AppShell>

            <CompareDrawerV3
                open={compare.isOpen}
                items={compare.selections}
                maxItems={compare.maxItems}
                onClose={compare.close}
                onClear={compare.clear}
                onRemove={compare.remove}
                onViewJob={(item) => {
                    navigate(`/${item.type}/${item.slug}`);
                    compare.close();
                }}
            />
        </>
    );
}

export default CategoryPageV3;
