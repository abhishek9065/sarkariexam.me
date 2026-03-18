import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { getBookmarkIds, getHomepageFeed, getSearchSuggestions } from '../utils/api';
import { buildAnnouncementDetailPath } from '../utils/trackingLinks';
import type { SourceTag } from '../utils/trackingLinks';
import { trackEvent, trackScrollDepth } from '../utils/analytics';
import { AuthContext } from '../context/auth-context';
import type { AnnouncementCard, ContentType, HomepageFeedSections, SearchSuggestion } from '../types';

import './HomePage.css';

/* ─── Homepage v6 — Phase 2 Premium UX ─── */

const CATEGORIES: Array<{ key: string; label: string; icon: string; to: string }> = [
    { key: 'jobs', label: 'Latest Jobs', icon: '💼', to: '/jobs' },
    { key: 'results', label: 'Results', icon: '📊', to: '/results' },
    { key: 'admit', label: 'Admit Cards', icon: '🎫', to: '/admit-card' },
    { key: 'answer', label: 'Answer Keys', icon: '🔑', to: '/answer-key' },
    { key: 'syllabus', label: 'Syllabus', icon: '📚', to: '/syllabus' },
    { key: 'admission', label: 'Admissions', icon: '🎓', to: '/admission' },
];

const TYPE_LABELS: Record<ContentType, string> = {
    job: 'Job', result: 'Result', 'admit-card': 'Admit Card',
    'answer-key': 'Answer Key', syllabus: 'Syllabus', admission: 'Admission',
};

const FILTER_TABS: Array<{ key: 'all' | ContentType; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'job', label: 'Jobs' },
    { key: 'result', label: 'Results' },
    { key: 'admit-card', label: 'Admit Cards' },
    { key: 'answer-key', label: 'Answer Keys' },
];

const MOBILE_MAJOR_TABS: Array<{ key: 'job' | 'admit-card' | 'result'; label: string }> = [
    { key: 'job', label: 'Latest Jobs' },
    { key: 'admit-card', label: 'Admit Card' },
    { key: 'result', label: 'Result' },
];

type DenseBoxItem = {
    id: string;
    title: string;
    href: string;
    meta: string;
    badge: string;
};

/* ─── Preference Picker (anonymous users) ─── */
const PREF_KEY = 'sr_user_prefs';
const PREF_OPTIONS: Array<{ key: ContentType; label: string; icon: string }> = [
    { key: 'job', label: 'Government Jobs', icon: '💼' },
    { key: 'result', label: 'Exam Results', icon: '📊' },
    { key: 'admit-card', label: 'Admit Cards', icon: '🎫' },
    { key: 'answer-key', label: 'Answer Keys', icon: '🔑' },
];
const HOMEPAGE_EMPTY_SECTIONS: HomepageFeedSections = {
    job: [],
    result: [],
    'admit-card': [],
    'answer-key': [],
    syllabus: [],
    admission: [],
};

function getSavedPrefs(): ContentType[] {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || '[]'); } catch { return []; }
}

function savePrefs(prefs: ContentType[]) {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* noop */ }
}

function hasDismissedPicker(): boolean {
    try { return localStorage.getItem(PREF_KEY) !== null; } catch { return true; }
}

/* ─── Helpers ─── */
function timeAgo(dateStr?: string | null): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function isNew(dateStr?: string | null): boolean {
    if (!dateStr) return false;
    return Date.now() - new Date(dateStr).getTime() < 3 * 24 * 3600_000;
}

function dateGroup(dateStr?: string | null): 'today' | 'week' | 'older' {
    if (!dateStr) return 'older';
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 24 * 3600_000) return 'today';
    if (diff < 7 * 24 * 3600_000) return 'week';
    return 'older';
}

const GROUP_LABELS: Record<string, string> = {
    today: '📌 Today',
    week: '📅 This Week',
    older: '📁 Earlier',
};

/* ─── Skeleton ─── */
function UpdateSkeleton() {
    return (
        <div className="hp-update-skeleton" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="hp-update-skeleton-row">
                    <div className="skeleton" style={{ width: 64, height: 24, borderRadius: 12 }} />
                    <div className="skeleton" style={{ flex: 1, height: 18, borderRadius: 6 }} />
                    <div className="skeleton" style={{ width: 40, height: 14, borderRadius: 6 }} />
                    <div className="skeleton" style={{ width: 56, height: 14, borderRadius: 6 }} />
                </div>
            ))}
        </div>
    );
}

/* ─── Error State ─── */
function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <section className="hp-error-state">
            <span className="hp-error-icon">⚡</span>
            <h3>Unable to load updates</h3>
            <p>Something went wrong while fetching the latest data. Please try again.</p>
            <button type="button" className="hp-error-retry" onClick={onRetry}>🔄 Retry</button>
        </section>
    );
}

/* ─── Empty Box State ─── */
function EmptyBoxState({ label, href }: { label: string; href: string }) {
    return (
        <div className="hp-empty-box">
            <span className="hp-empty-icon">📭</span>
            <p>No {label} updates yet</p>
            <Link to={href} className="hp-empty-link">Browse {label} →</Link>
        </div>
    );
}

function DenseBoxSkeleton() {
    return (
        <ul className="section-card-list hp-dense-skeleton" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, index) => (
                <li key={index} className="hp-dense-skeleton-item">
                    <span className="skeleton hp-dense-skeleton-bar hp-dense-skeleton-title" />
                    <span className="skeleton hp-dense-skeleton-bar hp-dense-skeleton-meta" />
                </li>
            ))}
        </ul>
    );
}

function DenseBoxSection({
    title,
    viewAllTo,
    items,
    emptyLabel,
    emptyHref,
    testId,
    loading = false,
}: {
    title: string;
    viewAllTo: string;
    items: DenseBoxItem[];
    emptyLabel: string;
    emptyHref: string;
    testId: string;
    loading?: boolean;
}) {
    return (
        <article className="home-dense-box" data-testid={testId}>
            <div className="home-dense-box-header">
                <h2>{title}</h2>
                <Link to={viewAllTo}>View all</Link>
            </div>
            {loading ? (
                <DenseBoxSkeleton />
            ) : items.length > 0 ? (
                <ul className="section-card-list">
                    {items.map((item) => (
                        <li key={item.id}>
                            <Link to={item.href} className="home-dense-box-link">
                                <span>{item.title}</span>
                                <small>{item.meta}</small>
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : (
                <EmptyBoxState label={emptyLabel} href={emptyHref} />
            )}
        </article>
    );
}

/* ─── Preference Picker Component ─── */
function PreferencePicker({ onDone }: { onDone: (prefs: ContentType[]) => void }) {
    const [selected, setSelected] = useState<Set<ContentType>>(new Set());

    const toggle = (key: ContentType) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const handleSave = () => {
        const prefs = Array.from(selected);
        savePrefs(prefs);
        trackEvent('pref_picker_done', { count: prefs.length, types: prefs.join(',') });
        onDone(prefs);
    };

    const handleSkip = () => {
        savePrefs([]);
        trackEvent('pref_picker_skip');
        onDone([]);
    };

    return (
        <section className="hp-pref-picker">
            <h2 className="hp-pref-title">What are you looking for?</h2>
            <p className="hp-pref-desc">Select your interests to see personalized updates</p>
            <div className="hp-pref-options">
                {PREF_OPTIONS.map((opt) => (
                    <button
                        key={opt.key}
                        type="button"
                        className={`hp-pref-opt${selected.has(opt.key) ? ' active' : ''}`}
                        onClick={() => toggle(opt.key)}
                    >
                        <span className="hp-pref-opt-icon">{opt.icon}</span>
                        <span className="hp-pref-opt-label">{opt.label}</span>
                        {selected.has(opt.key) && <span className="hp-pref-check">✓</span>}
                    </button>
                ))}
            </div>
            <div className="hp-pref-actions">
                <button type="button" className="hp-pref-save" onClick={handleSave} disabled={selected.size === 0}>
                    Show me updates →
                </button>
                <button type="button" className="hp-pref-skip" onClick={handleSkip}>
                    Skip, show everything
                </button>
            </div>
        </section>
    );
}

/* ─── Page Component ─── */
export function HomePage() {
    const navigate = useNavigate();
    const authContext = useContext(AuthContext);
    const user = authContext?.user;
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | ContentType>('all');
    const [userPrefs, setUserPrefs] = useState<ContentType[]>(getSavedPrefs());
    const [showPicker, setShowPicker] = useState(!user && !hasDismissedPicker());

    // Predictive Search State
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestIdx, setSelectedSuggestIdx] = useState(-1);
    const searchRef = useRef<HTMLFormElement>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // Fetch predictive search suggestions
    useEffect(() => {
        const q = searchQuery.trim();
        if (!q || q.length < 2) {
            setSuggestions([]);
            setSelectedSuggestIdx(-1);
            return;
        }
        let active = true;
        const timer = setTimeout(async () => {
            try {
                const res = await getSearchSuggestions(q);
                if (active && mountedRef.current) setSuggestions(res.data || []);
                setSelectedSuggestIdx(-1); // Reset highlight on new results
            } catch {
                if (active && mountedRef.current) setSuggestions([]);
            }
        }, 300);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [searchQuery]);

    // Handle click outside for suggestions dropdown
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /* Track scroll depth */
    useEffect(() => {
        const cleanup = trackScrollDepth('home');
        return cleanup;
    }, []);

    useEffect(() => {
        if (user) {
            setShowPicker(false);
        }
    }, [user]);

    const homepageQuery = useQuery({
        queryKey: ['homepage-feed'],
        queryFn: () => getHomepageFeed(),
    });

    const bookmarkIdsQuery = useQuery({
        queryKey: ['bookmark-ids', user?.id ?? 'anonymous'],
        queryFn: () => getBookmarkIds(),
        enabled: Boolean(user) && homepageQuery.isSuccess,
    });

    const updates = homepageQuery.data?.data.latest ?? [];
    const homepageSections = homepageQuery.data?.data.sections ?? HOMEPAGE_EMPTY_SECTIONS;
    const bookmarkedIds = useMemo(() => new Set(bookmarkIdsQuery.data?.data ?? []), [bookmarkIdsQuery.data]);
    const loading = homepageQuery.isPending;
    const showLoadError = homepageQuery.isError && updates.length === 0;

    /* Filter + personalization logic */
    const filteredUpdates = useMemo(() => {
        const list = activeFilter === 'all' ? updates : updates.filter((u) => u.type === activeFilter);
        return list.slice(0, 15);
    }, [updates, activeFilter]);

    const makeDenseItems = useCallback((
        cards: AnnouncementCard[],
        source: SourceTag,
        _fallbackPath: string,
        count = 10
    ): DenseBoxItem[] => {
        return cards.slice(0, count).map((card) => {
            const fallbackHref = `${_fallbackPath}?source=${source}`;
            const href = card.slug ? buildAnnouncementDetailPath(card.type, card.slug, source) : fallbackHref;
            return {
                id: card.id,
                title: card.title,
                href,
                meta: card.organization || timeAgo(card.postedAt),
                badge: TYPE_LABELS[card.type],
            };
        });
    }, []);

    const denseJobs = useMemo(() => makeDenseItems(homepageSections.job, 'home_box_jobs', '/jobs'), [homepageSections.job, makeDenseItems]);
    const denseResults = useMemo(() => makeDenseItems(homepageSections.result, 'home_box_results', '/results'), [homepageSections.result, makeDenseItems]);
    const denseAdmit = useMemo(() => makeDenseItems(homepageSections['admit-card'], 'home_box_admit', '/admit-card'), [homepageSections['admit-card'], makeDenseItems]);
    const denseAnswerKey = useMemo(() => makeDenseItems(homepageSections['answer-key'], 'home_box_answer_key', '/answer-key'), [homepageSections['answer-key'], makeDenseItems]);
    const denseSyllabus = useMemo(() => makeDenseItems(homepageSections.syllabus, 'home_box_syllabus', '/syllabus'), [homepageSections.syllabus, makeDenseItems]);
    const denseAdmission = useMemo(() => makeDenseItems(homepageSections.admission, 'home_box_admission', '/admission'), [homepageSections.admission, makeDenseItems]);
    const denseImportant = useMemo(() => makeDenseItems(updates, 'home_box_important', '/jobs'), [makeDenseItems, updates]);
    const denseCertificate = useMemo(() => makeDenseItems(homepageSections['admit-card'], 'home_box_certificate', '/admit-card'), [homepageSections['admit-card'], makeDenseItems]);

    const [mobileMajorTab, setMobileMajorTab] = useState<'job' | 'admit-card' | 'result'>('job');
    const mobileMajorItems = useMemo(() => {
        if (mobileMajorTab === 'job') return denseJobs.slice(0, 10);
        if (mobileMajorTab === 'admit-card') return denseAdmit.slice(0, 10);
        return denseResults.slice(0, 10);
    }, [denseAdmit, denseJobs, denseResults, mobileMajorTab]);

    /* Group items by date */
    const groupedUpdates = useMemo(() => {
        const groups: Array<{ key: string; label: string; items: AnnouncementCard[] }> = [];
        const groupMap = new Map<string, AnnouncementCard[]>();

        for (const card of filteredUpdates) {
            const g = dateGroup(card.postedAt);
            if (!groupMap.has(g)) groupMap.set(g, []);
            groupMap.get(g)!.push(card);
        }

        for (const key of ['today', 'week', 'older']) {
            const items = groupMap.get(key);
            if (items && items.length > 0) {
                groups.push({ key, label: GROUP_LABELS[key], items });
            }
        }

        return groups;
    }, [filteredUpdates]);

    /* Personalized "For You" items */
    const forYouItems = useMemo(() => {
        if (userPrefs.length === 0) return [];
        return updates.filter((u) => userPrefs.includes(u.type)).slice(0, 6);
    }, [updates, userPrefs]);

    /* Continue reading (bookmarked) */
    const continueReading = useMemo(() => {
        if (bookmarkedIds.size === 0) return [];
        return updates.filter((u) => bookmarkedIds.has(u.id)).slice(0, 4);
    }, [updates, bookmarkedIds]);

    const handleSearch = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const q = searchQuery.trim();
        if (!q) return;
        trackEvent('home_search', { query: q });
        navigate(`/jobs?q=${encodeURIComponent(q)}&source=home`);
    }, [searchQuery, navigate]);

    const handleCardClick = useCallback((card: AnnouncementCard) => {
        trackEvent('card_click', { type: card.type, slug: card.slug, source: 'home_latest' });
    }, []);

    /* ─── UX: Keyboard Navigation for Search ─── */
    const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions || suggestions.length === 0) return;
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedSuggestIdx((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedSuggestIdx((prev) => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === 'Enter' && selectedSuggestIdx >= 0) {
            e.preventDefault();
            const s = suggestions[selectedSuggestIdx];
            trackEvent('search_suggest_click', { slug: s.slug });
            navigate(buildAnnouncementDetailPath(s.type, s.slug, 'search_overlay' as SourceTag));
        }
    }, [showSuggestions, suggestions, selectedSuggestIdx, navigate]);

    const handleFilterChange = useCallback((key: 'all' | ContentType) => {
        setActiveFilter(key);
        trackEvent('filter_change', { tab: key });
    }, []);

    const handleRetry = useCallback(() => {
        void homepageQuery.refetch();
        if (user) {
            void bookmarkIdsQuery.refetch();
        }
    }, [bookmarkIdsQuery, homepageQuery, user]);

    return (
        <Layout>
            <div className="hp" data-testid="home-mvp">
                <div className="home-v4-shell" data-testid="home-v4-shell">
                    {/* ═══ HERO ═══ */}
                    <section className="hp-hero">
                        <div className="hp-hero-glow" />
                        <div className="hp-hero-orbs">
                            <span /><span /><span />
                        </div>
                        <h1 className="hp-hero-title">
                            Sarkari<span className="hp-hero-accent">Exams</span>.me
                        </h1>
                        <p className="hp-hero-sub">
                            Government Jobs, Results &amp; Exam Updates — All in One Place
                        </p>
                        <form className="hp-search" onSubmit={handleSearch} role="search" ref={searchRef}>
                            <span className="hp-search-icon" aria-hidden="true">🔍</span>
                            <input
                                className="hp-search-input"
                                type="search"
                                placeholder="Search jobs, exams, results..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                onKeyDown={handleSearchKeyDown}
                                aria-label="Search government exams and jobs"
                            />
                            <button className="hp-search-btn" type="submit">Search</button>

                            {/* Predictive Search Dropdown */}
                            {showSuggestions && searchQuery.trim().length >= 2 && (
                                <div className="hp-search-suggestions">
                                    {suggestions.length > 0 ? (
                                        <ul className="hp-search-suggest-list">
                                            {suggestions.map((s, idx) => (
                                                <li key={idx}>
                                                    <Link
                                                        to={buildAnnouncementDetailPath(s.type, s.slug, 'search_overlay' as SourceTag)}
                                                        className={`hp-search-suggest-link ${selectedSuggestIdx === idx ? 'focused-suggestion' : ''}`}
                                                        style={selectedSuggestIdx === idx ? { backgroundColor: 'var(--color-gray-100)' } : {}}
                                                        onClick={() => trackEvent('search_suggest_click', { slug: s.slug })}
                                                    >
                                                        <span className="hp-suggest-icon">{CATEGORIES.find(c => c.key === s.type || c.to.includes(s.type))?.icon || '📄'}</span>
                                                        <div className="hp-suggest-text">
                                                            <strong className="hp-suggest-title">{s.title}</strong>
                                                            <span className="hp-suggest-meta">{TYPE_LABELS[s.type] || s.type} {s.organization ? `• ${s.organization}` : ''}</span>
                                                        </div>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="hp-search-suggest-empty">No exact matches found</div>
                                    )}
                                </div>
                            )}
                        </form>
                    </section>

                    {/* ═══ CATEGORY CARDS ═══ */}
                    <nav className="hp-cats" aria-label="Browse by category">
                        {CATEGORIES.map((cat) => (
                            <Link key={cat.key} to={cat.to} className="hp-cat-card">
                                <span className="hp-cat-icon">{cat.icon}</span>
                                <span className="hp-cat-label">{cat.label}</span>
                            </Link>
                        ))}
                    </nav>

                    {/* ═══ ERROR STATE ═══ */}
                    {showLoadError && <ErrorState onRetry={handleRetry} />}

                    <section className="home-v3-grid home-v3-top-grid" data-testid="home-v3-top-grid">
                        <DenseBoxSection
                            title="Result"
                            viewAllTo="/results?source=home_box_results"
                            items={denseResults}
                            emptyLabel="Result"
                            emptyHref="/results"
                            testId="home-v3-dense-box-results"
                            loading={loading}
                        />
                        <DenseBoxSection
                            title="Admit Card"
                            viewAllTo="/admit-card?source=home_box_admit"
                            items={denseAdmit}
                            emptyLabel="Admit Card"
                            emptyHref="/admit-card"
                            testId="home-v3-dense-box-admit"
                            loading={loading}
                        />
                        <DenseBoxSection
                            title="Latest Jobs"
                            viewAllTo="/jobs?source=home_box_jobs"
                            items={denseJobs}
                            emptyLabel="Latest Jobs"
                            emptyHref="/jobs"
                            testId="home-v3-dense-box-jobs"
                            loading={loading}
                        />
                    </section>

                    <section className="home-v3-grid home-v3-middle-grid" data-testid="home-v3-middle-grid">
                        <DenseBoxSection
                            title="Answer Key"
                            viewAllTo="/answer-key?source=home_box_answer_key"
                            items={denseAnswerKey}
                            emptyLabel="Answer Key"
                            emptyHref="/answer-key"
                            testId="home-v3-dense-box-answer-key"
                            loading={loading}
                        />
                        <DenseBoxSection
                            title="Syllabus"
                            viewAllTo="/syllabus?source=home_box_syllabus"
                            items={denseSyllabus}
                            emptyLabel="Syllabus"
                            emptyHref="/syllabus"
                            testId="home-v3-dense-box-syllabus"
                            loading={loading}
                        />
                        <DenseBoxSection
                            title="Admission"
                            viewAllTo="/admission?source=home_box_admission"
                            items={denseAdmission}
                            emptyLabel="Admission"
                            emptyHref="/admission"
                            testId="home-v3-dense-box-admission"
                            loading={loading}
                        />
                    </section>

                    <section className="home-v3-grid home-v3-bottom-grid" data-testid="home-v3-bottom-grid">
                        <DenseBoxSection
                            title="Admit Card Download"
                            viewAllTo="/admit-card?source=home_box_certificate"
                            items={denseCertificate}
                            emptyLabel="Admit Card"
                            emptyHref="/admit-card"
                            testId="home-v3-dense-box-certificate"
                            loading={loading}
                        />
                        <DenseBoxSection
                            title="Important"
                            viewAllTo="/jobs?source=home_box_important"
                            items={denseImportant}
                            emptyLabel="Important"
                            emptyHref="/jobs"
                            testId="home-v3-dense-box-important"
                            loading={loading}
                        />
                    </section>

                    <section className="home-mobile-tabs" data-testid="home-mobile-tabs">
                        <div className="home-mobile-tablist" role="tablist" aria-label="Homepage major sections">
                            {MOBILE_MAJOR_TABS.map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={mobileMajorTab === tab.key}
                                    className={`home-mobile-tab${mobileMajorTab === tab.key ? ' active' : ''}`}
                                    onClick={() => setMobileMajorTab(tab.key)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="home-mobile-major-panel" data-testid="home-mobile-major-panel">
                            <h3 data-testid="home-mobile-major-title">
                                {MOBILE_MAJOR_TABS.find((tab) => tab.key === mobileMajorTab)?.label ?? 'Latest Jobs'}
                            </h3>
                            {loading ? (
                                <DenseBoxSkeleton />
                            ) : mobileMajorItems.length > 0 ? (
                                <ul className="home-mobile-major-list">
                                    {mobileMajorItems.map((item) => (
                                        <li key={item.id}>
                                            <Link to={item.href} className="home-dense-box-link">
                                                <span>{item.title}</span>
                                                <small>{item.meta}</small>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="home-mobile-major-empty">No updates available.</p>
                            )}
                        </div>
                    </section>

                    {/* ═══ PREFERENCE PICKER (anonymous, first visit) ═══ */}
                    {showPicker && (
                        <PreferencePicker onDone={(prefs) => {
                            setUserPrefs(prefs);
                            setShowPicker(false);
                            if (prefs.length > 0) setActiveFilter(prefs[0]);
                        }} />
                    )}

                    {/* ═══ FOR YOU (personalized, when prefs exist) ═══ */}
                    {!showPicker && forYouItems.length > 0 && (
                        <section className="hp-for-you">
                            <div className="hp-section-header">
                                <h2 className="hp-section-title">⚡ For You</h2>
                                <span className="hp-section-badge">Personalized</span>
                            </div>
                            <div className="hp-for-you-grid">
                                {forYouItems.map((card) => (
                                    <Link
                                        key={card.id}
                                        to={buildAnnouncementDetailPath(card.type, card.slug, 'home_latest')}
                                        className="hp-for-you-card"
                                        onClick={() => handleCardClick(card)}
                                    >
                                        <span className={`hp-type-badge hp-type-${card.type}`}>{TYPE_LABELS[card.type]}</span>
                                        <span className="hp-for-you-title">{card.title}</span>
                                        {card.organization && <span className="hp-for-you-org">🏛️ {card.organization}</span>}
                                        <span className="hp-for-you-time">{timeAgo(card.postedAt)}</span>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ═══ CONTINUE READING (logged-in + bookmarked) ═══ */}
                    {user && continueReading.length > 0 && (
                        <section className="hp-continue">
                            <div className="hp-section-header">
                                <h2 className="hp-section-title">📑 Continue Reading</h2>
                                <Link to="/bookmarks" className="hp-section-link">View All →</Link>
                            </div>
                            <div className="hp-continue-list">
                                {continueReading.map((card) => (
                                    <Link
                                        key={card.id}
                                        to={buildAnnouncementDetailPath(card.type, card.slug, 'home_latest')}
                                        className="hp-continue-item"
                                        onClick={() => handleCardClick(card)}
                                    >
                                        <span className={`hp-type-badge hp-type-${card.type}`}>{TYPE_LABELS[card.type]}</span>
                                        <span className="hp-continue-title">{card.title}</span>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ═══ LATEST UPDATES ═══ */}
                    <section className="hp-updates">
                        <div className="hp-updates-header">
                            <h2 className="hp-updates-title">Latest Updates</h2>
                            <div className="hp-filter-chips" role="group" aria-label="Filter updates">
                                {FILTER_TABS.map((tab) => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        aria-pressed={activeFilter === tab.key}
                                        className={`hp-filter-chip${activeFilter === tab.key ? ' active' : ''}`}
                                        onClick={() => handleFilterChange(tab.key)}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {loading ? (
                            <UpdateSkeleton />
                        ) : filteredUpdates.length === 0 ? (
                            <div className="hp-empty">
                                <span>📭</span>
                                <p>No updates found. Check back soon!</p>
                            </div>
                        ) : (
                            <div className="hp-grouped-updates animate-fade-in">
                                {groupedUpdates.map((group) => (
                                    <div key={group.key} className="hp-date-group">
                                        <h3 className="hp-date-label">{group.label}</h3>
                                        <ul className="hp-update-list">
                                            {group.items.map((card) => (
                                                <li key={card.id}>
                                                    <Link
                                                        to={buildAnnouncementDetailPath(card.type, card.slug, 'home_latest')}
                                                        className="hp-update-row"
                                                        onClick={() => handleCardClick(card)}
                                                    >
                                                        <span className={`hp-type-badge hp-type-${card.type}`}>
                                                            {TYPE_LABELS[card.type]}
                                                        </span>
                                                        <span className="hp-update-title">
                                                            {isNew(card.postedAt) && <span className="hp-new-dot" aria-label="New" />}
                                                            {card.title}
                                                        </span>
                                                        <span className="hp-update-meta">
                                                            {card.viewCount != null && card.viewCount > 0 && (
                                                                <span className="hp-update-views" title="Views">👁 {card.viewCount.toLocaleString()}</span>
                                                            )}
                                                            {card.organization && (
                                                                <span className="hp-update-org">{card.organization}</span>
                                                            )}
                                                            <time className="hp-update-time">{timeAgo(card.postedAt)}</time>
                                                        </span>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!loading && filteredUpdates.length > 0 && (
                            <div className="hp-view-all">
                                <Link to="/jobs" className="hp-view-all-btn">View All Jobs →</Link>
                                <Link to="/results" className="hp-view-all-btn hp-view-all-sec">View All Results →</Link>
                            </div>
                        )}
                    </section>

                    {/* ═══ COMPACT DISCLAIMER ═══ */}
                    <details className="hp-disclaimer">
                        <summary className="hp-disclaimer-summary">ℹ️ Disclaimer — Tap to expand</summary>
                        <p className="hp-disclaimer-text">
                            SarkariExams.me is not a government website. Information is sourced from official notifications and verified to the
                            best of our ability. Always verify details from the official source before applying. We are not responsible for any
                            discrepancy in the information provided.
                        </p>
                    </details>
                </div>
            </div>
        </Layout>
    );
}
