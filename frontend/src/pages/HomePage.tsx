import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { getAnnouncementCards } from '../utils/api';
import { buildAnnouncementDetailPath } from '../utils/trackingLinks';
import type { AnnouncementCard, ContentType } from '../types';

import './HomePage.css';

/* ─── Homepage v5 — Phase 1 Minimal MVP ─── */

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

/* ─── Page Component ─── */
export function HomePage() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [updates, setUpdates] = useState<AnnouncementCard[]>([]);
    const [activeFilter, setActiveFilter] = useState<'all' | ContentType>('all');

    /* Fetch only latest items — lightweight */
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

    const filteredUpdates = useMemo(() => {
        const list = activeFilter === 'all' ? updates : updates.filter((u) => u.type === activeFilter);
        return list.slice(0, 12);
    }, [updates, activeFilter]);

    const handleSearch = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const q = searchQuery.trim();
        if (!q) return;
        navigate(`/jobs?q=${encodeURIComponent(q)}&source=home`);
    }, [searchQuery, navigate]);

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
                                    onClick={() => setActiveFilter(tab.key)}
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
                        <ul className="hp-update-list">
                            {filteredUpdates.map((card) => (
                                <li key={card.id}>
                                    <Link
                                        to={buildAnnouncementDetailPath(card.type, card.slug, 'home_latest')}
                                        className="hp-update-row"
                                    >
                                        <span className={`hp-type-badge hp-type-${card.type}`}>
                                            {TYPE_LABELS[card.type]}
                                        </span>
                                        <span className="hp-update-title">
                                            {isNew(card.postedAt) && <span className="hp-new-dot" aria-label="New" />}
                                            {card.title}
                                        </span>
                                        <span className="hp-update-meta">
                                            {card.organization && (
                                                <span className="hp-update-org">{card.organization}</span>
                                            )}
                                            <time className="hp-update-time">{timeAgo(card.postedAt)}</time>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}

                    {!loading && filteredUpdates.length > 0 && (
                        <div className="hp-view-all">
                            <Link to="/jobs" className="hp-view-all-btn">View All Jobs →</Link>
                            <Link to="/results" className="hp-view-all-btn hp-view-all-sec">View All Results →</Link>
                        </div>
                    )}
                </section>
            </div>
        </Layout>
    );
}










