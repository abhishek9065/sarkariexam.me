import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { HomeMobileTabs } from '../components/home/HomeMobileTabs';
import { HomeSectionPanel } from '../components/home/HomeSectionPanel';
import { getAnnouncementCards } from '../utils/api';
import type { AnnouncementCard } from '../types';
import { buildAnnouncementDetailPath } from '../utils/trackingLinks';

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
const EXAM_PULSE = ['SSC CGL', 'UPSC', 'Railway', 'Bank PO', 'Police', 'Teaching'];
const FAST_LANES = [
    { label: 'All Jobs', to: '/jobs', description: 'Fresh vacancy board' },
    { label: 'Today Results', to: '/results', description: 'Declared scorecards' },
    { label: 'Admit Cards', to: '/admit-card', description: 'Download hall tickets' },
    { label: 'New Admissions', to: '/admission', description: 'UG, PG, Diploma' },
];

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

function sortByViews(items: AnnouncementCard[]): AnnouncementCard[] {
    return [...items].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
}

function toDeadlineTimestamp(value?: string | null): number {
    if (!value) return Number.POSITIVE_INFINITY;
    const ts = new Date(value).getTime();
    return Number.isFinite(ts) ? ts : Number.POSITIVE_INFINITY;
}

function formatDeadlineLabel(value?: string | null): string {
    if (!value) return 'TBA';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'TBA';
    const diffMs = date.getTime() - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Closed';
    if (diffDays === 0) return 'Today';
    if (diffDays <= 7) return `${diffDays}d left`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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
                    getAnnouncementCards({ type: 'answer-key', limit: 10, sort: 'newest' }),
                    getAnnouncementCards({ type: 'syllabus', limit: 10, sort: 'newest' }),
                    getAnnouncementCards({ type: 'admission', limit: 12, sort: 'newest' }),
                    getAnnouncementCards({ limit: 10, sort: 'views' }),
                    getAnnouncementCards({ search: 'certificate', limit: 16, sort: 'newest' }),
                    getAnnouncementCards({ search: 'verification', limit: 16, sort: 'newest' }),
                ]);

                if (!mounted) return;

                const keywordCards = dedupeCards([...certificateRes.data, ...verificationRes.data]);
                const certificateCards = buildCertificateCards(
                    keywordCards,
                    admissionRes.data,
                    resultsRes.data,
                    importantRes.data,
                    10,
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

    const spotlightCards = useMemo(() => {
        const merged = dedupeCards([
            ...sections.important,
            ...sections.jobs,
            ...sections.results,
        ]);
        return sortByViews(merged).slice(0, 6);
    }, [sections.important, sections.jobs, sections.results]);

    const deadlineRadar = useMemo(() => {
        const merged = dedupeCards([...sections.jobs, ...sections.admissions]);
        return merged
            .filter((item) => Boolean(item.deadline))
            .sort((a, b) => toDeadlineTimestamp(a.deadline) - toDeadlineTimestamp(b.deadline))
            .slice(0, 6);
    }, [sections.jobs, sections.admissions]);

    const handleHeroSearchSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        const trimmed = searchQuery.trim();
        if (!trimmed) return;
        navigate(`/jobs?q=${encodeURIComponent(trimmed)}&source=home`);
    };

    return (
        <Layout>
            <section className="home-v4-shell" data-testid="home-v4-shell">
                <header className="home-v4-hero card" data-testid="home-v4-hero">
                    <div className="home-v4-hero-copy">
                        <p className="home-v4-kicker">Sarkari Exams Command Center</p>
                        <h1>Track every government exam update in one live board.</h1>
                        <p>
                            Jobs, admit cards, results, answer keys, and admissions arranged for fast scanning on both
                            desktop and mobile.
                        </p>
                        <form className="home-v4-hero-search" onSubmit={handleHeroSearchSubmit}>
                            <input
                                type="text"
                                className="input"
                                placeholder="Search exam or recruitment (e.g., SSC, RRB, UPSC)"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                aria-label="Search exams"
                            />
                            <button type="submit" className="btn btn-accent">Search</button>
                        </form>
                        <p className="home-v4-status-line">
                            <span className={`home-v4-status-pill ${sourceMode === 'live' ? 'live' : 'fallback'}`}>
                                {sourceMode === 'live' ? 'Live feed' : 'Offline fallback'}
                            </span>
                            {lastUpdatedAt ? (
                                <span>Updated {new Date(lastUpdatedAt).toLocaleTimeString('en-IN')}</span>
                            ) : null}
                        </p>
                        <div className="home-v4-pulse-row" aria-label="Popular exam searches">
                            {EXAM_PULSE.map((item) => (
                                <Link
                                    key={item}
                                    to={`/jobs?q=${encodeURIComponent(item)}&source=home`}
                                    className="home-v4-pulse-chip"
                                >
                                    {item}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="home-v4-hero-metrics">
                        <Link to="/jobs" className="home-v4-metric-card">
                            <strong>{sections.jobs.length}</strong>
                            <span>Active Job Listings</span>
                        </Link>
                        <Link to="/results" className="home-v4-metric-card">
                            <strong>{sections.results.length}</strong>
                            <span>Fresh Result Notices</span>
                        </Link>
                        <Link to="/admit-card" className="home-v4-metric-card">
                            <strong>{sections.admitCards.length}</strong>
                            <span>Admit Card Alerts</span>
                        </Link>
                    </div>
                </header>

                <HomeMobileTabs
                    tabs={[
                        {
                            key: 'job',
                            title: 'Latest Jobs',
                            viewMoreTo: '/jobs',
                            sourceTag: 'home_box_jobs',
                            items: sections.jobs.slice(0, 8),
                        },
                        {
                            key: 'admit-card',
                            title: 'Admit Card',
                            viewMoreTo: '/admit-card',
                            sourceTag: 'home_box_admit',
                            items: sections.admitCards.slice(0, 8),
                        },
                        {
                            key: 'result',
                            title: 'Result',
                            viewMoreTo: '/results',
                            sourceTag: 'home_box_results',
                            items: sections.results.slice(0, 8),
                        },
                    ]}
                />

                <div className="home-v4-command-grid" data-testid="home-v4-command-grid">
                    <article className="home-v4-spotlight card" data-testid="home-v4-spotlight">
                        <header>
                            <h2>Spotlight Board</h2>
                            <p>Most viewed exam updates right now</p>
                        </header>
                        {spotlightCards.length === 0 ? (
                            <p className="home-v4-empty-inline">{loading ? 'Loading spotlight...' : 'No spotlight items yet.'}</p>
                        ) : (
                            <ol className="home-v4-spotlight-list">
                                {spotlightCards.map((item, index) => (
                                    <li key={item.id}>
                                        <span className="home-v4-rank">{String(index + 1).padStart(2, '0')}</span>
                                        <div>
                                            <Link
                                                to={buildAnnouncementDetailPath(item.type, item.slug, 'home_featured')}
                                            >
                                                {item.title}
                                            </Link>
                                            <p>{item.organization || 'Government update'}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </article>

                    <article className="home-v4-radar card" data-testid="home-v4-deadline-radar">
                        <header>
                            <h2>Deadline Radar</h2>
                            <p>Upcoming closing windows</p>
                        </header>
                        {deadlineRadar.length === 0 ? (
                            <p className="home-v4-empty-inline">{loading ? 'Loading deadline radar...' : 'No deadline data yet.'}</p>
                        ) : (
                            <ul className="home-v4-radar-list">
                                {deadlineRadar.map((item) => (
                                    <li key={item.id}>
                                        <Link to={buildAnnouncementDetailPath(item.type, item.slug, 'home_horizontal_important')}>
                                            {item.title}
                                        </Link>
                                        <span>{formatDeadlineLabel(item.deadline)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </article>

                    <article className="home-v4-fast-lanes card" data-testid="home-v4-fast-lanes">
                        <header>
                            <h2>Fast Lanes</h2>
                            <p>Jump directly to high-intent sections</p>
                        </header>
                        <div className="home-v4-fast-links">
                            {FAST_LANES.map((item) => (
                                <Link key={item.label} to={item.to}>
                                    <strong>{item.label}</strong>
                                    <span>{item.description}</span>
                                </Link>
                            ))}
                        </div>
                    </article>
                </div>

                <div className="home-v4-panels home-v3-top-grid" data-testid="home-v3-top-grid">
                    <HomeSectionPanel
                        title="Latest Jobs"
                        subtitle="Recruitment forms and vacancy drives"
                        viewMoreTo="/jobs"
                        items={sections.jobs}
                        sourceTag="home_box_jobs"
                        testId="home-v3-dense-box-jobs"
                        className="home-v4-panel home-v4-panel-jobs"
                        loading={loading}
                    />
                    <HomeSectionPanel
                        title="Admit Card"
                        subtitle="Hall ticket release tracker"
                        viewMoreTo="/admit-card"
                        items={sections.admitCards}
                        sourceTag="home_box_admit"
                        testId="home-v3-dense-box-admit"
                        className="home-v4-panel home-v4-panel-admit"
                        loading={loading}
                    />
                    <HomeSectionPanel
                        title="Result"
                        subtitle="Declared and updated scorecards"
                        viewMoreTo="/results"
                        items={sections.results}
                        sourceTag="home_box_results"
                        testId="home-v3-dense-box-results"
                        className="home-v4-panel home-v4-panel-result"
                        loading={loading}
                    />
                </div>

                <div className="home-v4-panels home-v3-bottom-grid" data-testid="home-v3-bottom-grid">
                    <HomeSectionPanel
                        title="Answer Key"
                        subtitle="Objection windows and official keys"
                        viewMoreTo="/answer-key"
                        items={sections.answerKeys}
                        sourceTag="home_box_answer_key"
                        testId="home-v3-dense-box-answer-key"
                        className="home-v4-panel home-v4-panel-answer home-dense-box-area-answer"
                        loading={loading}
                    />
                    <HomeSectionPanel
                        title="Syllabus"
                        subtitle="Pattern and topic blueprint"
                        viewMoreTo="/syllabus"
                        items={sections.syllabus}
                        sourceTag="home_box_syllabus"
                        testId="home-v3-dense-box-syllabus"
                        className="home-v4-panel home-v4-panel-syllabus home-dense-box-area-syllabus"
                        loading={loading}
                    />
                    <HomeSectionPanel
                        title="Admission"
                        subtitle="Counselling and admission updates"
                        viewMoreTo="/admission"
                        items={sections.admissions}
                        sourceTag="home_box_admission"
                        testId="home-v3-dense-box-admission"
                        className="home-v4-panel home-v4-panel-admission home-dense-box-area-admission"
                        loading={loading}
                    />
                    <HomeSectionPanel
                        title="Certificate Verification"
                        subtitle="Verification and document links"
                        viewMoreTo="/results?q=certificate"
                        items={sections.certificates}
                        sourceTag="home_box_certificate"
                        testId="home-v3-dense-box-certificate"
                        className="home-v4-panel home-v4-panel-certificate home-dense-box-area-certificate"
                        loading={loading}
                    />
                    <HomeSectionPanel
                        title="Important"
                        subtitle="High-impact notices by traffic"
                        viewMoreTo="/jobs?sort=views"
                        items={sections.important}
                        sourceTag="home_box_important"
                        testId="home-v3-dense-box-important"
                        className="home-v4-panel home-v4-panel-important home-dense-box-area-important"
                        loading={loading}
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
