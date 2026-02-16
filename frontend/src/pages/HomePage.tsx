import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { HomeMobileTabs } from '../components/home/HomeMobileTabs';
import { HomeSectionPanel } from '../components/home/HomeSectionPanel';
import { getAnnouncementCards } from '../utils/api';
import { buildAnnouncementDetailPath } from '../utils/trackingLinks';
import type { AnnouncementCard } from '../types';

import './HomePage.css';

/* ─── Types ─── */
interface HomeSections {
    jobs: AnnouncementCard[];
    results: AnnouncementCard[];
    admitCards: AnnouncementCard[];
    answerKeys: AnnouncementCard[];
    syllabus: AnnouncementCard[];
    admissions: AnnouncementCard[];
    important: AnnouncementCard[];
    certificates: AnnouncementCard[];
}

/* ─── Constants ─── */
const CERTIFICATE_KEYWORD_REGEX = /\b(certificate|verification|epic|download)\b/i;

const CATEGORIES = [
    { key: 'jobs', label: 'Latest Jobs', icon: '💼', to: '/jobs', cls: 'home-cat-jobs' },
    { key: 'results', label: 'Results', icon: '📊', to: '/results', cls: 'home-cat-results' },
    { key: 'admit', label: 'Admit Card', icon: '🎫', to: '/admit-card', cls: 'home-cat-admit' },
    { key: 'answer', label: 'Answer Key', icon: '🔑', to: '/answer-key', cls: 'home-cat-answer' },
    { key: 'syllabus', label: 'Syllabus', icon: '📚', to: '/syllabus', cls: 'home-cat-syllabus' },
    { key: 'admission', label: 'Admission', icon: '🎓', to: '/admission', cls: 'home-cat-admission' },
] as const;

/* ─── Helpers ─── */
function createFallbackCards(type: AnnouncementCard['type'], prefix: string, count: number): AnnouncementCard[] {
    return Array.from({ length: count }).map((_, i) => ({
        id: `${prefix}-${i}`,
        title: `${prefix.toUpperCase()} update ${i + 1}`,
        slug: `${prefix}-update-${i + 1}`,
        type,
        category: prefix,
        organization: 'SarkariExams',
        postedAt: new Date().toISOString(),
        deadline: null,
        viewCount: 0,
    }));
}

function dedupeCards(items: AnnouncementCard[]): AnnouncementCard[] {
    const seen = new Map<string, AnnouncementCard>();
    for (const c of items) if (!seen.has(c.id)) seen.set(c.id, c);
    return Array.from(seen.values());
}

function isCertificateLike(card: AnnouncementCard): boolean {
    return CERTIFICATE_KEYWORD_REGEX.test(`${card.title} ${card.category ?? ''} ${card.organization ?? ''}`);
}

function buildCertificateCards(
    keywordCards: AnnouncementCard[],
    admissionCards: AnnouncementCard[],
    resultCards: AnnouncementCard[],
    topViewCards: AnnouncementCard[],
    limit = 10,
): AnnouncementCard[] {
    const selected: AnnouncementCard[] = [];
    const seen = new Set<string>();
    const push = (c: AnnouncementCard) => {
        if (seen.has(c.id)) return;
        seen.add(c.id);
        selected.push(c);
    };
    for (const c of keywordCards) if (isCertificateLike(c)) { push(c); if (selected.length >= limit) return selected; }
    for (const c of [...admissionCards, ...resultCards]) if (isCertificateLike(c)) { push(c); if (selected.length >= limit) return selected; }
    for (const c of topViewCards) { push(c); if (selected.length >= limit) return selected; }
    return selected;
}

/* ─── Component ─── */
export function HomePage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sourceMode, setSourceMode] = useState<'live' | 'fallback'>('live');
    const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
    const [sections, setSections] = useState<HomeSections>({
        jobs: [], results: [], admitCards: [], answerKeys: [],
        syllabus: [], admissions: [], important: [], certificates: [],
    });

    /* ─── Data Fetching ─── */
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const [jobsRes, resultsRes, admitRes, answerRes, syllabusRes, admissionRes, importantRes, certRes, verifyRes] =
                    await Promise.all([
                        getAnnouncementCards({ type: 'job', limit: 20, sort: 'newest' }),
                        getAnnouncementCards({ type: 'result', limit: 20, sort: 'newest' }),
                        getAnnouncementCards({ type: 'admit-card', limit: 20, sort: 'newest' }),
                        getAnnouncementCards({ type: 'answer-key', limit: 15, sort: 'newest' }),
                        getAnnouncementCards({ type: 'syllabus', limit: 15, sort: 'newest' }),
                        getAnnouncementCards({ type: 'admission', limit: 15, sort: 'newest' }),
                        getAnnouncementCards({ limit: 15, sort: 'views' }),
                        getAnnouncementCards({ search: 'certificate', limit: 16, sort: 'newest' }),
                        getAnnouncementCards({ search: 'verification', limit: 16, sort: 'newest' }),
                    ]);
                if (!mounted) return;

                const keywordCards = dedupeCards([...certRes.data, ...verifyRes.data]);
                setSections({
                    jobs: jobsRes.data,
                    results: resultsRes.data,
                    admitCards: admitRes.data,
                    answerKeys: answerRes.data,
                    syllabus: syllabusRes.data,
                    admissions: admissionRes.data,
                    important: importantRes.data,
                    certificates: buildCertificateCards(keywordCards, admissionRes.data, resultsRes.data, importantRes.data, 10),
                });
                setSourceMode('live');
                setLastUpdatedAt(new Date().toISOString());
            } catch (err) {
                console.error('Failed to fetch homepage sections:', err);
                if (!mounted) return;
                setSections({
                    jobs: createFallbackCards('job', 'jobs', 10),
                    results: createFallbackCards('result', 'results', 10),
                    admitCards: createFallbackCards('admit-card', 'admit-card', 10),
                    answerKeys: createFallbackCards('answer-key', 'answer-key', 5),
                    syllabus: createFallbackCards('syllabus', 'syllabus', 5),
                    admissions: createFallbackCards('admission', 'admission', 5),
                    important: createFallbackCards('job', 'important', 5),
                    certificates: createFallbackCards('result', 'certificate', 5),
                });
                setSourceMode('fallback');
                setLastUpdatedAt(new Date().toISOString());
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    const homepageReady = useMemo(
        () => !loading && Object.values(sections).some((s) => s.length > 0),
        [loading, sections],
    );

    /* ─── Spotlight: pick 3 top items from jobs, results, admit ─── */
    const spotlightCards = useMemo(() => {
        const picks: { card: AnnouncementCard; badge: string; badgeCls: string }[] = [];
        if (sections.jobs[0]) picks.push({ card: sections.jobs[0], badge: 'Apply Online', badgeCls: 'home-spotlight-badge-job' });
        if (sections.results[0]) picks.push({ card: sections.results[0], badge: 'Result Out', badgeCls: 'home-spotlight-badge-result' });
        if (sections.admitCards[0]) picks.push({ card: sections.admitCards[0], badge: 'Admit Card', badgeCls: 'home-spotlight-badge-admit' });
        return picks;
    }, [sections.jobs, sections.results, sections.admitCards]);

    /* ─── Total count for hero stats ─── */
    const totalUpdates = useMemo(
        () => Object.values(sections).reduce((sum, arr) => sum + arr.length, 0),
        [sections],
    );

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const q = searchQuery.trim();
        if (!q) return;
        navigate(`/jobs?q=${encodeURIComponent(q)}&source=home`);
    };

    return (
        <Layout>
            <div className="home-v3" data-testid="home-v4-shell">
                {/* ═══ HERO SECTION ═══ */}
                <div className="home-hero">
                    <div className="home-hero-content">
                        <h1>Your Gateway to Government Careers</h1>
                        <p className="home-hero-tagline">
                            Latest Sarkari Jobs, Results, Admit Cards & Exam Notifications — updated in real time.
                        </p>
                        <form className="home-hero-search" onSubmit={handleSearch}>
                            <input
                                type="text"
                                placeholder="Search SSC, UPSC, Railway, Bank exams..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                aria-label="Search exams"
                            />
                            <button type="submit">Search</button>
                        </form>
                        <div className="home-hero-stats">
                            <div className="home-hero-stat">
                                <span className="home-hero-stat-dot" />
                                <span className="home-hero-stat-value">{totalUpdates}</span>
                                <span>Live Updates</span>
                            </div>
                            {lastUpdatedAt && (
                                <div className="home-hero-stat">
                                    <span>🕐</span>
                                    <span>Updated {new Date(lastUpdatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            )}
                            <div className="home-hero-stat">
                                <span>{sourceMode === 'live' ? '🟢' : '🟡'}</span>
                                <span>{sourceMode === 'live' ? 'Live' : 'Cached'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══ CATEGORY NAV PILLS ═══ */}
                <nav className="home-categories" aria-label="Browse by category">
                    {CATEGORIES.map((cat) => (
                        <Link key={cat.key} to={cat.to} className={`home-cat-pill ${cat.cls}`}>
                            <span className="home-cat-pill-icon">{cat.icon}</span>
                            {cat.label}
                        </Link>
                    ))}
                </nav>

                {/* ═══ TRENDING SPOTLIGHT ═══ */}
                {spotlightCards.length > 0 && !loading && (
                    <section className="home-spotlight">
                        <h2 className="home-spotlight-title">
                            <span>🔥</span> Trending Right Now
                        </h2>
                        <div className="home-spotlight-grid">
                            {spotlightCards.map(({ card, badge, badgeCls }) => (
                                <Link
                                    key={card.id}
                                    to={buildAnnouncementDetailPath(card.type, card.slug, 'home_featured')}
                                    className="home-spotlight-card"
                                    data-type={card.type}
                                >
                                    <span className={`home-spotlight-badge ${badgeCls}`}>{badge}</span>
                                    <span className="home-spotlight-card-title">{card.title}</span>
                                    <span className="home-spotlight-card-org">{card.organization || 'Government of India'}</span>
                                    {card.viewCount ? (
                                        <span className="home-spotlight-card-views">👁 {card.viewCount.toLocaleString()} views</span>
                                    ) : null}
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* ═══ MOBILE TABS (visible only on mobile) ═══ */}
                <HomeMobileTabs
                    tabs={[
                        { key: 'job', title: 'Latest Jobs', viewMoreTo: '/jobs', sourceTag: 'home_box_jobs', items: sections.jobs.slice(0, 10) },
}

                    function buildCertificateCards(
                keywordCards: AnnouncementCard[],
                admissionCards: AnnouncementCard[],
                resultCards: AnnouncementCard[],
                topViewCards: AnnouncementCard[],
                limit = 10,
                ): AnnouncementCard[] {
    const selected: AnnouncementCard[] = [];
                const seen = new Set<string>();
    const push = (c: AnnouncementCard) => {
        if (seen.has(c.id)) return;
                    seen.add(c.id);
                    selected.push(c);
    };
                    for (const c of keywordCards) if (isCertificateLike(c)) {push(c); if (selected.length >= limit) return selected; }
                    for (const c of [...admissionCards, ...resultCards]) if (isCertificateLike(c)) {push(c); if (selected.length >= limit) return selected; }
                    for (const c of topViewCards) {push(c); if (selected.length >= limit) return selected; }
                    return selected;
}

                    /* ─── Component ─── */
                    export function HomePage() {
    const navigate = useNavigate();
                    const [loading, setLoading] = useState(true);
                    const [searchQuery, setSearchQuery] = useState('');
                    const [sourceMode, setSourceMode] = useState<'live' | 'fallback'>('live');
                    const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
                    const [sections, setSections] = useState<HomeSections>({
                        jobs: [], results: [], admitCards: [], answerKeys: [],
                        syllabus: [], admissions: [], important: [], certificates: [],
    });

    /* ─── Data Fetching ─── */
    useEffect(() => {
                            let mounted = true;
        (async () => {
            try {
                const [jobsRes, resultsRes, admitRes, answerRes, syllabusRes, admissionRes, importantRes, certRes, verifyRes] =
                        await Promise.all([
                        getAnnouncementCards({type: 'job', limit: 20, sort: 'newest' }),
                        getAnnouncementCards({type: 'result', limit: 20, sort: 'newest' }),
                        getAnnouncementCards({type: 'admit-card', limit: 20, sort: 'newest' }),
                        getAnnouncementCards({type: 'answer-key', limit: 15, sort: 'newest' }),
                        getAnnouncementCards({type: 'syllabus', limit: 15, sort: 'newest' }),
                        getAnnouncementCards({type: 'admission', limit: 15, sort: 'newest' }),
                        getAnnouncementCards({limit: 15, sort: 'views' }),
                        getAnnouncementCards({search: 'certificate', limit: 16, sort: 'newest' }),
                        getAnnouncementCards({search: 'verification', limit: 16, sort: 'newest' }),
                        ]);
                        if (!mounted) return;

                        const keywordCards = dedupeCards([...certRes.data, ...verifyRes.data]);
                        setSections({
                            jobs: jobsRes.data,
                        results: resultsRes.data,
                        admitCards: admitRes.data,
                        answerKeys: answerRes.data,
                        syllabus: syllabusRes.data,
                        admissions: admissionRes.data,
                        important: importantRes.data,
                        certificates: buildCertificateCards(keywordCards, admissionRes.data, resultsRes.data, importantRes.data, 10),
                });
                        setSourceMode('live');
                        setLastUpdatedAt(new Date().toISOString());
            } catch (err) {
                            console.error('Failed to fetch homepage sections:', err);
                        if (!mounted) return;
                        setSections({
                            jobs: createFallbackCards('job', 'jobs', 10),
                        results: createFallbackCards('result', 'results', 10),
                        admitCards: createFallbackCards('admit-card', 'admit-card', 10),
                        answerKeys: createFallbackCards('answer-key', 'answer-key', 5),
                        syllabus: createFallbackCards('syllabus', 'syllabus', 5),
                        admissions: createFallbackCards('admission', 'admission', 5),
                        important: createFallbackCards('job', 'important', 5),
                        certificates: createFallbackCards('result', 'certificate', 5),
                });
                        setSourceMode('fallback');
                        setLastUpdatedAt(new Date().toISOString());
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {mounted = false; };
    }, []);

                        const homepageReady = useMemo(
        () => !loading && Object.values(sections).some((s) => s.length > 0),
                        [loading, sections],
                        );

    /* ─── Spotlight: pick 3 top items from jobs, results, admit ─── */
    const spotlightCards = useMemo(() => {
        const picks: {card: AnnouncementCard; badge: string; badgeCls: string }[] = [];
                        if (sections.jobs[0]) picks.push({card: sections.jobs[0], badge: 'Apply Online', badgeCls: 'home-spotlight-badge-job' });
                        if (sections.results[0]) picks.push({card: sections.results[0], badge: 'Result Out', badgeCls: 'home-spotlight-badge-result' });
                        if (sections.admitCards[0]) picks.push({card: sections.admitCards[0], badge: 'Admit Card', badgeCls: 'home-spotlight-badge-admit' });
                        return picks;
    }, [sections.jobs, sections.results, sections.admitCards]);

                        /* ─── Total count for hero stats ─── */
                        const totalUpdates = useMemo(
        () => Object.values(sections).reduce((sum, arr) => sum + arr.length, 0),
                        [sections],
                        );

    const handleSearch = (e: React.FormEvent) => {
                            e.preventDefault();
                        const q = searchQuery.trim();
                        if (!q) return;
                        navigate(`/jobs?q=${encodeURIComponent(q)}&source=home`);
    };

                        return (
                        <Layout>
                            <div className="home-v3" data-testid="home-v4-shell">
                                {/* ═══ HERO SECTION ═══ */}
                                <div className="home-hero">
                                    <div className="home-hero-content">
                                        <h1>Your Gateway to Government Careers</h1>
                                        <p className="home-hero-tagline">
                                            Latest Sarkari Jobs, Results, Admit Cards & Exam Notifications — updated in real time.
                                        </p>
                                        <form className="home-hero-search" onSubmit={handleSearch}>
                                            <input
                                                type="text"
                                                placeholder="Search SSC, UPSC, Railway, Bank exams..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                aria-label="Search exams"
                                            />
                                            <button type="submit">Search</button>
                                        </form>
                                        <div className="home-hero-stats">
                                            <div className="home-hero-stat">
                                                <span className="home-hero-stat-dot" />
                                                <span className="home-hero-stat-value">{totalUpdates}</span>
                                                <span>Live Updates</span>
                                            </div>
                                            {lastUpdatedAt && (
                                                <div className="home-hero-stat">
                                                    <span>🕐</span>
                                                    <span>Updated {new Date(lastUpdatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            )}
                                            <div className="home-hero-stat">
                                                <span>{sourceMode === 'live' ? '🟢' : '🟡'}</span>
                                                <span>{sourceMode === 'live' ? 'Live' : 'Cached'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ═══ CATEGORY NAV PILLS ═══ */}
                                <nav className="home-categories" aria-label="Browse by category">
                                    {CATEGORIES.map((cat) => (
                                        <Link key={cat.key} to={cat.to} className={`home-cat-pill ${cat.cls}`}>
                                            <span className="home-cat-pill-icon">{cat.icon}</span>
                                            {cat.label}
                                        </Link>
                                    ))}
                                </nav>

                                {/* ═══ TRENDING SPOTLIGHT ═══ */}
                                {spotlightCards.length > 0 && !loading && (
                                    <section className="home-spotlight">
                                        <h2 className="home-spotlight-title">
                                            <span>🔥</span> Trending Right Now
                                        </h2>
                                        <div className="home-spotlight-grid">
                                            {spotlightCards.map(({ card, badge, badgeCls }) => (
                                                <Link
                                                    key={card.id}
                                                    to={buildAnnouncementDetailPath(card.type, card.slug, 'home_featured')}
                                                    className="home-spotlight-card"
                                                    data-type={card.type}
                                                >
                                                    <span className={`home-spotlight-badge ${badgeCls}`}>{badge}</span>
                                                    <span className="home-spotlight-card-title">{card.title}</span>
                                                    <span className="home-spotlight-card-org">{card.organization || 'Government of India'}</span>
                                                    {card.viewCount ? (
                                                        <span className="home-spotlight-card-views">👁 {card.viewCount.toLocaleString()} views</span>
                                                    ) : null}
                                                </Link>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* ═══ MOBILE TABS (visible only on mobile) ═══ */}
                                <HomeMobileTabs
                                    tabs={[
                                        { key: 'job', title: 'Latest Jobs', viewMoreTo: '/jobs', sourceTag: 'home_box_jobs', items: sections.jobs.slice(0, 10) },
                                        { key: 'admit-card', title: 'Admit Card', viewMoreTo: '/admit-card', sourceTag: 'home_box_admit', items: sections.admitCards.slice(0, 10) },
                                        { key: 'result', title: 'Result', viewMoreTo: '/results', sourceTag: 'home_box_results', items: sections.results.slice(0, 10) },
                                    ]}
                                />

                                {/* ═══ SECTION GRID — 3 columns of modern cards ═══ */}
                                {/* Row 1: Result | Admit Card | Latest Jobs */}
                                <div className="home-section-grid home-v3-top-grid" data-testid="home-v3-top-grid">
                                    <HomeSectionPanel
                                        title="Result"
                                        icon="📊"
                                        viewMoreTo="/results"
                                        items={sections.results}
                                        sourceTag="home_box_results"
                                        testId="home-v3-dense-box-results"
                                        cardClass="section-card-results"
                                        loading={loading}
                                        maxItems={15}
                                    />
                                    <HomeSectionPanel
                                        title="Admit Card"
                                        icon="🎫"
                                        viewMoreTo="/admit-card"
                                        items={sections.admitCards}
                                        sourceTag="home_box_admit"
                                        testId="home-v3-dense-box-admit"
                                        cardClass="section-card-admit"
                                        loading={loading}
                                        maxItems={15}
                                    />
                                    <HomeSectionPanel
                                        title="Latest Jobs"
                                        icon="💼"
                                        viewMoreTo="/jobs"
                                        items={sections.jobs}
                                        sourceTag="home_box_jobs"
                                        testId="home-v3-dense-box-jobs"
                                        cardClass="section-card-jobs"
                                        loading={loading}
                        <span className="home-empty-state-icon">📭</span>
                                    <h3>No announcements available yet</h3>
                                    <p>Please check back shortly for the latest updates.</p>
                                </div>
                )}
                            </div>
                        </Layout>
                        );
}
