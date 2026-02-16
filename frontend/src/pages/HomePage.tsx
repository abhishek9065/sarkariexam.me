import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { HomeMobileTabs } from '../components/home/HomeMobileTabs';
import { HomeSectionPanel } from '../components/home/HomeSectionPanel';
import { getAnnouncementCards } from '../utils/api';
import { buildAnnouncementDetailPath } from '../utils/trackingLinks';
import type { AnnouncementCard } from '../types';

import './HomePage.css';

interface HomeDenseSections {
    jobs: AnnouncementCard[];
    results: AnnouncementCard[];
    admitCards: AnnouncementCard[];
    answerKeys: AnnouncementCard[];
    syllabus: AnnouncementCard[];
    admissions: AnnouncementCard[];
    important: AnnouncementCard[];
    certificates: AnnouncementCard[];
}

const CERTIFICATE_KEYWORD_REGEX = /\b(certificate|verification|epic|download)\b/i;

function createFallbackCards(type: AnnouncementCard['type'], prefix: string, count: number): AnnouncementCard[] {
    return Array.from({ length: count }).map((_, index) => ({
        id: `${prefix}-${index}`,
        title: `${prefix.toUpperCase()} update ${index + 1}`,
        slug: `${prefix}-update-${index + 1}`,
        type,
        category: prefix,
        organization: 'SarkariExams',
        postedAt: new Date().toISOString(),
        deadline: null,
        viewCount: 0,
    }));
}

function dedupeCards(items: AnnouncementCard[]): AnnouncementCard[] {
    const unique = new Map<string, AnnouncementCard>();
    for (const item of items) {
        if (!unique.has(item.id)) {
            unique.set(item.id, item);
        }
    }
    return Array.from(unique.values());
}

function isCertificateLike(card: AnnouncementCard): boolean {
    const candidate = `${card.title} ${card.category ?? ''} ${card.organization ?? ''}`;
    return CERTIFICATE_KEYWORD_REGEX.test(candidate);
}

function buildCertificateCards(
    keywordCards: AnnouncementCard[],
    admissionCards: AnnouncementCard[],
    resultCards: AnnouncementCard[],
    topViewCards: AnnouncementCard[],
    limit = 5,
): AnnouncementCard[] {
    const selected: AnnouncementCard[] = [];
    const seen = new Set<string>();

    const pushIfNew = (card: AnnouncementCard) => {
        if (seen.has(card.id)) return;
        seen.add(card.id);
        selected.push(card);
    };

    for (const card of keywordCards) {
        if (isCertificateLike(card)) {
            pushIfNew(card);
            if (selected.length >= limit) return selected;
        }
    }

    for (const card of [...admissionCards, ...resultCards]) {
        if (isCertificateLike(card)) {
            pushIfNew(card);
            if (selected.length >= limit) return selected;
        }
    }

    for (const card of topViewCards) {
        pushIfNew(card);
        if (selected.length >= limit) return selected;
    }

    return selected;
}



export function HomePage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sourceMode, setSourceMode] = useState<'live' | 'fallback'>('live');
    const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
    const [sections, setSections] = useState<HomeDenseSections>({
        jobs: [],
        results: [],
        admitCards: [],
        answerKeys: [],
        syllabus: [],
        admissions: [],
        important: [],
        certificates: [],
    });

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const [
                    jobsRes,
                    resultsRes,
                    admitRes,
                    answerRes,
                    syllabusRes,
                    admissionRes,
                    importantRes,
                    certificateRes,
                    verificationRes,
                ] = await Promise.all([
                    getAnnouncementCards({ type: 'job', limit: 20, sort: 'newest' }),
                    getAnnouncementCards({ type: 'result', limit: 20, sort: 'newest' }),
                    getAnnouncementCards({ type: 'admit-card', limit: 20, sort: 'newest' }),
                    getAnnouncementCards({ type: 'answer-key', limit: 20, sort: 'newest' }),
                    getAnnouncementCards({ type: 'syllabus', limit: 20, sort: 'newest' }),
                    getAnnouncementCards({ type: 'admission', limit: 20, sort: 'newest' }),
                    getAnnouncementCards({ limit: 20, sort: 'views' }),
                    getAnnouncementCards({ search: 'certificate', limit: 20, sort: 'newest' }),
                    getAnnouncementCards({ search: 'verification', limit: 20, sort: 'newest' }),
                ]);

                if (!mounted) return;

                const keywordCards = dedupeCards([...certificateRes.data, ...verificationRes.data]);
                const certificateCards = buildCertificateCards(
                    keywordCards,
                    admissionRes.data,
                    resultsRes.data,
                    importantRes.data,
                    15,
                );

                setSections({
                    jobs: jobsRes.data,
                    results: resultsRes.data,
                    admitCards: admitRes.data,
                    answerKeys: answerRes.data,
                    syllabus: syllabusRes.data,
                    admissions: admissionRes.data,
                    important: importantRes.data,
                    certificates: certificateCards,
                });
                setSourceMode('live');
                setLastUpdatedAt(new Date().toISOString());
            } catch (error) {
                console.error('Failed to fetch homepage sections:', error);
                if (!mounted) return;

                setSections({
                    jobs: createFallbackCards('job', 'jobs', 20),
                    results: createFallbackCards('result', 'results', 20),
                    admitCards: createFallbackCards('admit-card', 'admit-card', 20),
                    answerKeys: createFallbackCards('answer-key', 'answer-key', 5),
                    syllabus: createFallbackCards('syllabus', 'syllabus', 5),
                    admissions: createFallbackCards('admission', 'admission', 12),
                    important: createFallbackCards('job', 'important', 5),
                    certificates: createFallbackCards('result', 'certificate', 5),
                });
                setSourceMode('fallback');
                setLastUpdatedAt(new Date().toISOString());
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    const homepageReady = useMemo(() => {
        if (loading) return false;
        return Object.values(sections).some((items) => items.length > 0);
    }, [loading, sections]);

    /** Build featured links for the top grid (like sarkariresult.com's trending table) */
    const featuredItems = useMemo(() => {
        const items: { title: string; slug: string; type: AnnouncementCard['type']; badge: 'apply' | 'admit' | 'declared' | 'new' }[] = [];
        const seen = new Set<string>();
        const addItem = (card: AnnouncementCard, badge: 'apply' | 'admit' | 'declared' | 'new') => {
            if (seen.has(card.id) || items.length >= 12) return;
            seen.add(card.id);
            items.push({ title: card.title, slug: card.slug, type: card.type, badge });
        };

        // Top jobs → "Apply Online"
        sections.jobs.slice(0, 4).forEach((c) => addItem(c, 'apply'));
        // Top admit cards → "Admit Card"
        sections.admitCards.slice(0, 3).forEach((c) => addItem(c, 'admit'));
        // Top results → "Declared"
        sections.results.slice(0, 3).forEach((c) => addItem(c, 'declared'));
        // Fill remaining from important
        sections.important.slice(0, 4).forEach((c) => addItem(c, 'new'));

        return items;
    }, [sections.jobs, sections.admitCards, sections.results, sections.important]);

    const handleHeroSearchSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        const trimmed = searchQuery.trim();
        if (!trimmed) return;
        navigate(`/jobs?q=${encodeURIComponent(trimmed)}&source=home`);
    };

    const badgeLabels: Record<string, string> = {
        apply: 'Apply Online',
        admit: 'Admit Card',
        declared: 'Declared',
        new: 'New',
    };

    return (
        <Layout>
            <section className="home-v4-shell" data-testid="home-v4-shell">
                {/* Quick Links Row — like sarkariresult.com's app/social buttons */}
                <div className="home-quick-links">
                    <Link to="/jobs" className="home-quick-link">Latest Jobs</Link>
                    <Link to="/results" className="home-quick-link green">Results</Link>
                    <Link to="/admit-card" className="home-quick-link blue">Admit Card</Link>
                    <Link to="/answer-key" className="home-quick-link purple">Answer Key</Link>
                    <Link to="/syllabus" className="home-quick-link">Syllabus</Link>
                    <Link to="/admission" className="home-quick-link green">Admission</Link>
                </div>

                {/* Featured Links Grid — like sarkariresult.com's centered trending table */}
                {featuredItems.length > 0 && (
                    <div className="home-featured-grid" data-testid="home-featured-grid">
                        {featuredItems.map((item) => (
                            <div className="home-featured-item" key={item.slug}>
                                <div>
                                    <Link to={buildAnnouncementDetailPath(item.type, item.slug, 'home_featured')}>
                                        {item.title}
                                    </Link>
                                    <span className={`home-featured-badge home-featured-badge-${item.badge}`}>
                                        {badgeLabels[item.badge]}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Compact Search Strip */}
                <div className="home-search-strip">
                    <h1>Sarkari Exam Updates</h1>
                    <form onSubmit={handleHeroSearchSubmit}>
                        <input
                            type="text"
                            className="input"
                            placeholder="Search SSC, UPSC, Railway, Bank..."
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            aria-label="Search exams"
                        />
                        <button type="submit" className="btn">Search</button>
                    </form>
                    <p className="home-v4-status-line">
                        <span className={`home-v4-status-pill ${sourceMode === 'live' ? 'live' : 'fallback'}`}>
                            {sourceMode === 'live' ? 'Live' : 'Offline'}
                        </span>
                        {lastUpdatedAt ? (
                            <span>Updated {new Date(lastUpdatedAt).toLocaleTimeString('en-IN')}</span>
                        ) : null}
                    </p>
                </div>

                {/* Mobile Tabs (visible only on mobile) */}
                <HomeMobileTabs
                    tabs={[
                        {
                            key: 'job',
                            title: 'Latest Jobs',
                            viewMoreTo: '/jobs',
                            sourceTag: 'home_box_jobs',
                            items: sections.jobs.slice(0, 10),
                        },
                        {
                            key: 'admit-card',
                            title: 'Admit Card',
                            viewMoreTo: '/admit-card',
                            sourceTag: 'home_box_admit',
                            items: sections.admitCards.slice(0, 10),
                        },
                        {
                            key: 'result',
                            title: 'Result',
                            viewMoreTo: '/results',
                            sourceTag: 'home_box_results',
                            items: sections.results.slice(0, 10),
                        },
                    ]}
                />

                {/* Single-Column Stacked Sections — sarkariresult.com order */}
                <div className="home-v4-section-grid home-v3-top-grid" data-testid="home-v3-top-grid">
                    <HomeSectionPanel
                        title="Result"
                        subtitle=""
                        viewMoreTo="/results"
                        items={sections.results}
                        sourceTag="home_box_results"
                        testId="home-v3-dense-box-results"
                        className="home-v4-panel home-v4-panel-result"
                        loading={loading}
                        maxItems={15}
                    />
                    <HomeSectionPanel
                        title="Answer Key"
                        subtitle=""
                        viewMoreTo="/answer-key"
                        items={sections.answerKeys}
                        sourceTag="home_box_answer_key"
                        testId="home-v3-dense-box-answer-key"
                        className="home-v4-panel home-v4-panel-answer"
                        loading={loading}
                        maxItems={15}
                    />
                    <HomeSectionPanel
                        title="Certificate Verification"
                        subtitle=""
                        viewMoreTo="/results?q=certificate"
                        items={sections.certificates}
                        sourceTag="home_box_certificate"
                        testId="home-v3-dense-box-certificate"
                        className="home-v4-panel home-v4-panel-certificate"
                        loading={loading}
                        maxItems={15}
                    />
                </div>

                <div className="home-v4-section-grid home-v3-bottom-grid" data-testid="home-v3-bottom-grid">
                    <HomeSectionPanel
                        title="Admit Card"
                        subtitle=""
                        viewMoreTo="/admit-card"
                        items={sections.admitCards}
                        sourceTag="home_box_admit"
                        testId="home-v3-dense-box-admit"
                        className="home-v4-panel home-v4-panel-admit home-dense-box-area-admit"
                        loading={loading}
                        maxItems={15}
                    />
                    <HomeSectionPanel
                        title="Syllabus"
                        subtitle=""
                        viewMoreTo="/syllabus"
                        items={sections.syllabus}
                        sourceTag="home_box_syllabus"
                        testId="home-v3-dense-box-syllabus"
                        className="home-v4-panel home-v4-panel-syllabus home-dense-box-area-syllabus"
                        loading={loading}
                        maxItems={15}
                    />
                    <HomeSectionPanel
                        title="Important"
                        subtitle=""
                        viewMoreTo="/jobs?sort=views"
                        items={sections.important}
                        sourceTag="home_box_important"
                        testId="home-v3-dense-box-important"
                        className="home-v4-panel home-v4-panel-important home-dense-box-area-important"
                        loading={loading}
                        maxItems={15}
                    />
                    <HomeSectionPanel
                        title="Latest Jobs"
                        subtitle=""
                        viewMoreTo="/jobs"
                        items={sections.jobs}
                        sourceTag="home_box_jobs"
                        testId="home-v3-dense-box-jobs"
                        className="home-v4-panel home-v4-panel-jobs home-dense-box-area-jobs"
                        loading={loading}
                        maxItems={15}
                    />
                    <HomeSectionPanel
                        title="Admission"
                        subtitle=""
                        viewMoreTo="/admission"
                        items={sections.admissions}
                        sourceTag="home_box_admission"
                        testId="home-v3-dense-box-admission"
                        className="home-v4-panel home-v4-panel-admission home-dense-box-area-admission"
                        loading={loading}
                        maxItems={15}
                    />
                </div>
            </section>

            {!loading && !homepageReady && (
                <div className="empty-state">
                    <span className="empty-state-icon">📭</span>
                    <h3>No announcements available yet</h3>
                    <p className="text-muted">Please check back shortly for the latest updates.</p>
                </div>
            )}
        </Layout>
    );
}

