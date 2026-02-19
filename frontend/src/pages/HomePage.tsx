import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { getAnnouncementCards, getBookmarks } from '../utils/api';
import { buildAnnouncementDetailPath } from '../utils/trackingLinks';
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
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="hp-update-skeleton-row">
                    <div className="skeleton" style={{ width: 56, height: 24, borderRadius: 12 }} />
                    <div className="skeleton" style={{ flex: 1, height: 18, borderRadius: 6 }} />
                    <div className="skeleton" style={{ width: 48, height: 14, borderRadius: 6 }} />
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
    const { user } = useContext(AuthContext);
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
                const [jobs, results, admits, answerKeys] = await Promise.all([
                    getAnnouncementCards({ type: 'job', limit: 6, sort: 'newest' }),
                    getAnnouncementCards({ type: 'result', limit: 6, sort: 'newest' }),
                    getAnnouncementCards({ type: 'admit-card', limit: 6, sort: 'newest' }),
                    getAnnouncementCards({ type: 'answer-key', limit: 4, sort: 'newest' }),
                ]);
                if (!mounted) return;

                const all = [
                    ...jobs.data, ...results.data, ...admits.data, ...answerKeys.data,
                ].sort((a, b) => {
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
        let list = activeFilter === 'all' ? updates : updates.filter((u) => u.type === activeFilter);
        return list.slice(0, 15);
    }, [updates, activeFilter]);

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
                {/* ═══ HERO ═══ */}
                <section className="hp-hero">
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
                        <div className="hp-filter-chips" role="tablist" aria-label="Filter updates">
                            {FILTER_TABS.map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeFilter === tab.key}
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
                        <div className="hp-grouped-updates">
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
        </Layout>
    );
}










