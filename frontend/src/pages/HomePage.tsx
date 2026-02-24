import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { getAnnouncementCards, getBookmarks } from '../utils/api';
import { buildAnnouncementDetailPath } from '../utils/trackingLinks';
import type { SourceTag } from '../utils/trackingLinks';
import { trackEvent, trackScrollDepth } from '../utils/analytics';
import { AuthContext } from '../context/auth-context';
import type { AnnouncementCard, ContentType } from '../types';

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
    const [loading, setLoading] = useState(true);
    const [updates, setUpdates] = useState<AnnouncementCard[]>([]);
    const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
    const [activeFilter, setActiveFilter] = useState<'all' | ContentType>('all');
    const [userPrefs, setUserPrefs] = useState<ContentType[]>(getSavedPrefs());
    const [showPicker, setShowPicker] = useState(!user && !hasDismissedPicker());

    /* Track scroll depth */
    useEffect(() => {
        const cleanup = trackScrollDepth('home');
        return cleanup;
    }, []);

    /* Fetch latest items */
    useEffect(() => {
        let mounted = true;
        setLoading(true);

        (async () => {
            try {
                // Fetch basic content types in parallel
                const contentTypes: ContentType[] = ['job', 'result', 'admit-card', 'answer-key', 'syllabus', 'admission'];
                const results = await Promise.all(
                    contentTypes.map(t => getAnnouncementCards({ type: t, limit: 12, sort: 'newest' }))
                );

                if (!mounted) return;

                const all = results.flatMap(res => res.data).sort((a, b) => {
                    const da = a.postedAt ? new Date(a.postedAt).getTime() : 0;
                    const db = b.postedAt ? new Date(b.postedAt).getTime() : 0;
                    return db - da;
                });

                const seen = new Set<string>();
                setUpdates(all.filter((c) => { if (seen.has(c.id)) return false; seen.add(c.id); return true; }));
            } catch (err) {
                console.error('Homepage fetch error:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => { mounted = false; };
    }, []);

    /* Fetch bookmarks for logged-in user */
    useEffect(() => {
        if (!user) return;
        let mounted = true;
        (async () => {
            try {
                const res = await getBookmarks();
                if (mounted) setBookmarkedIds(new Set((res.data || []).map((b: { announcementId?: string; id?: string }) => b.announcementId || b.id || '')));
            } catch { /* noop */ }
        })();
        return () => { mounted = false; };
    }, [user]);

    /* Filter + personalization logic */
    const filteredUpdates = useMemo(() => {
        const list = activeFilter === 'all' ? updates : updates.filter((u) => u.type === activeFilter);
        return list.slice(0, 15);
    }, [updates, activeFilter]);

    const updatesByType = useMemo(() => {
        const map: Record<ContentType, AnnouncementCard[]> = {
            job: [],
            result: [],
            'admit-card': [],
            'answer-key': [],
            syllabus: [],
            admission: [],
        };
        for (const card of updates) {
            map[card.type].push(card);
        }
        return map;
    }, [updates]);

    const makeDenseItems = useCallback((
        cards: AnnouncementCard[],
        source: SourceTag,
        fallbackPath: string,
        count = 10
    ): DenseBoxItem[] => {
        const normalized = cards.slice(0, count).map((card) => {
            const fallbackHref = `${fallbackPath}?source=${source}`;
            const href = card.slug ? buildAnnouncementDetailPath(card.type, card.slug, source) : fallbackHref;
            return {
                id: card.id,
                title: card.title,
                href,
                meta: card.organization || timeAgo(card.postedAt),
                badge: TYPE_LABELS[card.type],
            };
        });

        while (normalized.length < count) {
            const idx = normalized.length + 1;
            normalized.push({
                id: `fallback-${source}-${idx}`,
                title: `View more updates (${idx})`,
                href: `${fallbackPath}?source=${source}`,
                meta: 'Official updates',
                badge: 'Info',
            });
        }
        return normalized;
    }, []);

    const denseJobs = useMemo(() => makeDenseItems(updatesByType.job, 'home_box_jobs', '/jobs'), [makeDenseItems, updatesByType.job]);
    const denseResults = useMemo(() => makeDenseItems(updatesByType.result, 'home_box_results', '/results'), [makeDenseItems, updatesByType.result]);
    const denseAdmit = useMemo(() => makeDenseItems(updatesByType['admit-card'], 'home_box_admit', '/admit-card'), [makeDenseItems, updatesByType['admit-card']]);
    const denseAnswerKey = useMemo(() => makeDenseItems(updatesByType['answer-key'], 'home_box_answer_key', '/answer-key'), [makeDenseItems, updatesByType['answer-key']]);
    const denseSyllabus = useMemo(() => makeDenseItems(updatesByType.syllabus, 'home_box_syllabus', '/syllabus'), [makeDenseItems, updatesByType.syllabus]);
    const denseAdmission = useMemo(() => makeDenseItems(updatesByType.admission, 'home_box_admission', '/admission'), [makeDenseItems, updatesByType.admission]);
    const denseImportant = useMemo(() => makeDenseItems(updates, 'home_box_important', '/jobs'), [makeDenseItems, updates]);
    const denseCertificate = useMemo(() => makeDenseItems(updatesByType['admit-card'], 'home_box_certificate', '/admit-card'), [makeDenseItems, updatesByType['admit-card']]);

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

    const handleFilterChange = useCallback((key: 'all' | ContentType) => {
        setActiveFilter(key);
        trackEvent('filter_change', { tab: key });
    }, []);

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
                        <form className="hp-search" onSubmit={handleSearch} role="search">
                            <span className="hp-search-icon" aria-hidden="true">🔍</span>
                            <input
                                className="hp-search-input"
                                type="search"
                                placeholder="Search jobs, exams, results..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                aria-label="Search government exams and jobs"
                            />
                            <button className="hp-search-btn" type="submit">Search</button>
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

                    <section className="home-v3-grid home-v3-top-grid" data-testid="home-v3-top-grid">
                        <article className="home-dense-box" data-testid="home-v3-dense-box-results">
                            <div className="home-dense-box-header">
                                <h2>Result</h2>
                                <Link to="/results?source=home_box_results">View all</Link>
                            </div>
                            <ul className="section-card-list">
                                {denseResults.slice(0, 10).map((item) => (
                                    <li key={item.id}>
                                        <Link to={item.href} className="home-dense-box-link">
                                            <span>{item.title}</span>
                                            <small>{item.meta}</small>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </article>

                        <article className="home-dense-box" data-testid="home-v3-dense-box-admit">
                            <div className="home-dense-box-header">
                                <h2>Admit Card</h2>
                                <Link to="/admit-card?source=home_box_admit">View all</Link>
                            </div>
                            <ul className="section-card-list">
                                {denseAdmit.slice(0, 10).map((item) => (
                                    <li key={item.id}>
                                        <Link to={item.href} className="home-dense-box-link">
                                            <span>{item.title}</span>
                                            <small>{item.meta}</small>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </article>

                        <article className="home-dense-box" data-testid="home-v3-dense-box-jobs">
                            <div className="home-dense-box-header">
                                <h2>Latest Jobs</h2>
                                <Link to="/jobs?source=home_box_jobs">View all</Link>
                            </div>
                            <ul className="section-card-list">
                                {denseJobs.slice(0, 10).map((item) => (
                                    <li key={item.id}>
                                        <Link to={item.href} className="home-dense-box-link">
                                            <span>{item.title}</span>
                                            <small>{item.meta}</small>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </article>
                    </section>

                    <section className="home-v3-grid home-v3-middle-grid" data-testid="home-v3-middle-grid">
                        <article className="home-dense-box" data-testid="home-v3-dense-box-answer-key">
                            <div className="home-dense-box-header">
                                <h2>Answer Key</h2>
                                <Link to="/answer-key?source=home_box_answer_key">View all</Link>
                            </div>
                            <ul className="section-card-list">
                                {denseAnswerKey.slice(0, 10).map((item) => (
                                    <li key={item.id}>
                                        <Link to={item.href} className="home-dense-box-link">
                                            <span>{item.title}</span>
                                            <small>{item.meta}</small>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </article>

                        <article className="home-dense-box" data-testid="home-v3-dense-box-syllabus">
                            <div className="home-dense-box-header">
                                <h2>Syllabus</h2>
                                <Link to="/syllabus?source=home_box_syllabus">View all</Link>
                            </div>
                            <ul className="section-card-list">
                                {denseSyllabus.slice(0, 10).map((item) => (
                                    <li key={item.id}>
                                        <Link to={item.href} className="home-dense-box-link">
                                            <span>{item.title}</span>
                                            <small>{item.meta}</small>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </article>

                        <article className="home-dense-box" data-testid="home-v3-dense-box-admission">
                            <div className="home-dense-box-header">
                                <h2>Admission</h2>
                                <Link to="/admission?source=home_box_admission">View all</Link>
                            </div>
                            <ul className="section-card-list">
                                {denseAdmission.slice(0, 10).map((item) => (
                                    <li key={item.id}>
                                        <Link to={item.href} className="home-dense-box-link">
                                            <span>{item.title}</span>
                                            <small>{item.meta}</small>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </article>
                    </section>

                    <section className="home-v3-grid home-v3-bottom-grid" data-testid="home-v3-bottom-grid">
                        <article className="home-dense-box" data-testid="home-v3-dense-box-certificate">
                            <div className="home-dense-box-header">
                                <h2>Certificate Verification</h2>
                                <Link to="/admit-card?source=home_box_certificate">View all</Link>
                            </div>
                            <ul className="section-card-list">
                                {denseCertificate.slice(0, 10).map((item) => (
                                    <li key={item.id}>
                                        <Link to={item.href} className="home-dense-box-link">
                                            <span>{item.title}</span>
                                            <small>{item.meta}</small>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </article>

                        <article className="home-dense-box" data-testid="home-v3-dense-box-important">
                            <div className="home-dense-box-header">
                                <h2>Important</h2>
                                <Link to="/jobs?source=home_box_important">View all</Link>
                            </div>
                            <ul className="section-card-list">
                                {denseImportant.slice(0, 10).map((item) => (
                                    <li key={item.id}>
                                        <Link to={item.href} className="home-dense-box-link">
                                            <span>{item.title}</span>
                                            <small>{item.meta}</small>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </article>
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




