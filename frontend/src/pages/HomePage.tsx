import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { HomeMobileTabs } from '../components/home/HomeMobileTabs';
import { HomeSectionPanel } from '../components/home/HomeSectionPanel';
import { getAnnouncementCards } from '../utils/api';
import { buildAnnouncementDetailPath } from '../utils/trackingLinks';
import type { AnnouncementCard } from '../types';

import './HomePage.css';

/* Homepage v4 — Premium 2026 Design */

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

/* ─── Animated Counter Hook ─── */
function useAnimatedCounter(target: number, duration = 1200): number {
    const [value, setValue] = useState(0);
    const frameRef = useRef<number>(0);

    useEffect(() => {
        if (target <= 0) { setValue(0); return; }
        const start = performance.now();
        const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) frameRef.current = requestAnimationFrame(tick);
        };
        frameRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameRef.current);
    }, [target, duration]);

    return value;
}

/* ─── Scroll Reveal Hook ─── */
function useScrollReveal<T extends HTMLElement>(): React.RefObject<T | null> {
    const ref = useRef<T | null>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.classList.add('home-scroll-visible');
                    observer.unobserve(el);
                }
            },
            { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    return ref;
}

/* ─── ScrollSection component ─── */
function ScrollSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    const ref = useScrollReveal<HTMLDivElement>();
    return (
        <div ref={ref} className={`home-scroll-section ${className}`}>
            {children}
        </div>
    );
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

    const animatedTotal = useAnimatedCounter(totalUpdates);

    /* ─── Ticker items: latest 8 from all sections merged ─── */
    const tickerItems = useMemo(() => {
        const all = [
            ...sections.jobs.slice(0, 3),
            ...sections.results.slice(0, 3),
            ...sections.admitCards.slice(0, 2),
        ].sort((a, b) => {
            const da = a.postedAt ? new Date(a.postedAt).getTime() : 0;
            const db = b.postedAt ? new Date(b.postedAt).getTime() : 0;
            return db - da;
        });
        return all.slice(0, 8);
    }, [sections.jobs, sections.results, sections.admitCards]);

    const handleSearch = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const q = searchQuery.trim();
        if (!q) return;
        navigate(`/jobs?q=${encodeURIComponent(q)}&source=home`);
    }, [searchQuery, navigate]);

    return (
        <Layout>
            <div className="home-v3" data-testid="home-v4-shell">
                {/* ═══ HERO SECTION ═══ */}
                <div className="home-hero">
                    <div className="home-hero-content">
                        <h1>Your Gateway to Government Careers</h1>
                        <p className="home-hero-tagline">
                            Latest Sarkari Jobs, Results, Admit Cards &amp; Exam Notifications — updated in real time.
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
                                <span className="home-hero-stat-value">{animatedTotal}</span>
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

                {/* ═══ BREAKING NEWS TICKER ═══ */}
                {tickerItems.length > 0 && !loading && (
                    <div className="home-ticker">
                        <div className="home-ticker-badge">
                            <span className="home-ticker-live-dot" />
                            Live
                        </div>
                        <div className="home-ticker-track">
                            <div className="home-ticker-scroll">
                                {/* Duplicate for seamless loop */}
                                {[...tickerItems, ...tickerItems].map((item, i) => (
                                    <Link
                                        key={`${item.id}-${i}`}
                                        to={buildAnnouncementDetailPath(item.type, item.slug, 'home_ticker')}
                                        className="home-ticker-item"
                                    >
                                        {item.title}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ QUICK ACCESS CATEGORY GRID ═══ */}
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
                    <ScrollSection>
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
                    </ScrollSection>
                )}

                {/* ═══ MOBILE TABS (visible only on mobile) ═══ */}
                <HomeMobileTabs
                    tabs={[
                        { key: 'job', title: 'Latest Jobs', viewMoreTo: '/jobs', sourceTag: 'home_box_jobs', items: sections.jobs.slice(0, 10) },
                        { key: 'admit-card', title: 'Admit Card', viewMoreTo: '/admit-card', sourceTag: 'home_box_admit', items: sections.admitCards.slice(0, 10) },
                        { key: 'result', title: 'Result', viewMoreTo: '/results', sourceTag: 'home_box_results', items: sections.results.slice(0, 10) },
                    ]}
                />

                {/* ═══ ROW 1: Result | Admit Card | Latest Jobs ═══ */}
                <ScrollSection>
                    <div className="home-section-label">📋 Latest Updates</div>
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
                            maxItems={15}
                        />
                    </div>
                </ScrollSection>

                {/* ═══ ROW 2: Answer Key | Syllabus | Admission ═══ */}
                <ScrollSection>
                    <div className="home-section-label">📝 Exam Resources</div>
                    <div className="home-section-grid home-v3-middle-grid" data-testid="home-v3-middle-grid">
                        <HomeSectionPanel
                            title="Answer Key"
                            icon="🔑"
                            viewMoreTo="/answer-key"
                            items={sections.answerKeys}
                            sourceTag="home_box_answer_key"
                            testId="home-v3-dense-box-answer-key"
                            cardClass="section-card-answer"
                            loading={loading}
                            maxItems={10}
                        />
                        <HomeSectionPanel
                            title="Syllabus"
                            icon="📚"
                            viewMoreTo="/syllabus"
                            items={sections.syllabus}
                            sourceTag="home_box_syllabus"
                            testId="home-v3-dense-box-syllabus"
                            cardClass="section-card-syllabus"
                            loading={loading}
                            maxItems={10}
                        />
                        <HomeSectionPanel
                            title="Admission"
                            icon="🎓"
                            viewMoreTo="/admission"
                            items={sections.admissions}
                            sourceTag="home_box_admission"
                            testId="home-v3-dense-box-admission"
                            cardClass="section-card-admission"
                            loading={loading}
                            maxItems={10}
                        />
                    </div>
                </ScrollSection>

                {/* ═══ ROW 3: Certificate Verification | Important Links ═══ */}
                <ScrollSection>
                    <div className="home-section-label">⭐ More Resources</div>
                    <div className="home-section-grid home-v3-third-grid home-v3-bottom-grid" data-testid="home-v3-bottom-grid">
                        <HomeSectionPanel
                            title="Certificate Verification"
                            icon="📜"
                            viewMoreTo="/results?q=certificate"
                            items={sections.certificates}
                            sourceTag="home_box_certificate"
                            testId="home-v3-dense-box-certificate"
                            cardClass="section-card-certificate"
                            loading={loading}
                            maxItems={8}
                        />
                        <HomeSectionPanel
                            title="Important"
                            icon="⚡"
                            viewMoreTo="/jobs?sort=views"
                            items={sections.important}
                            sourceTag="home_box_important"
                            testId="home-v3-dense-box-important"
                            cardClass="section-card-important"
                            loading={loading}
                            maxItems={8}
                        />
                    </div>
                </ScrollSection>

                {/* ═══ Empty state ═══ */}
                {!loading && !homepageReady && (
                    <div className="home-empty-state">
                        <span className="home-empty-state-icon">📭</span>
                        <h3>No announcements available yet</h3>
                        <p>Please check back shortly for the latest updates.</p>
                    </div>
                )}
            </div>
        </Layout>
    );
}
