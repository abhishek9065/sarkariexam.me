import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { SearchOverlay } from '../components/SearchOverlay';
import { FeaturedAnnouncementGrid, type FeaturedTile } from '../components/home/FeaturedAnnouncementGrid';
import { HomeColumnSection } from '../components/home/HomeColumnSection';
import { HomeHorizontalSection } from '../components/home/HomeHorizontalSection';
import { HomeAdmissionSection } from '../components/home/HomeAdmissionSection';
import { HomeEducationalContent } from '../components/home/HomeEducationalContent';
import { getAnnouncementCards, getTrendingSearches } from '../utils/api';
import type { AnnouncementCard } from '../types';
import { buildAnnouncementDetailPath } from '../utils/trackingLinks';

interface HomeSectionFeed {
    jobs: AnnouncementCard[];
    results: AnnouncementCard[];
    admitCards: AnnouncementCard[];
    answerKeys: AnnouncementCard[];
    syllabus: AnnouncementCard[];
    admissions: AnnouncementCard[];
    important: AnnouncementCard[];
}

const QUICK_FILTERS: Array<{ label: string; to: string }> = [
    { label: 'Central Govt', to: '/jobs?q=central+government' },
    { label: 'State Jobs', to: '/jobs?q=state+government' },
    { label: '12th Pass', to: '/jobs?qualification=12th' },
    { label: 'Graduation', to: '/jobs?qualification=graduate' },
    { label: 'Defence', to: '/jobs?q=defence' },
    { label: 'Railway', to: '/jobs?q=railway' },
];

const FALLBACK_POPULAR = ['UPSC', 'SSC', 'RRB', 'Bank PO', 'JEE Main'];

const FEATURED_COLOR_CLASSES = [
    'featured-olive',
    'featured-blue',
    'featured-orange',
    'featured-red',
    'featured-green',
    'featured-magenta',
    'featured-sky',
    'featured-teal',
];

function buildFallbackFeaturedTiles(): FeaturedTile[] {
    return [
        { id: 'f1', title: 'Railway Group D', subtitle: 'Apply Online', href: buildAnnouncementDetailPath('job', 'railway-group-d', 'home_featured'), colorClass: 'featured-olive' },
        { id: 'f2', title: 'India Post GDS', subtitle: 'Apply Online', href: buildAnnouncementDetailPath('job', 'india-post-gds', 'home_featured'), colorClass: 'featured-blue' },
        { id: 'f3', title: 'UPBED 2026', subtitle: 'Apply Now', href: buildAnnouncementDetailPath('admission', 'upbed-2026', 'home_featured'), colorClass: 'featured-orange' },
        { id: 'f4', title: 'RRB ALP Admit Card', subtitle: 'Download', href: buildAnnouncementDetailPath('admit-card', 'rrb-alp-admit-card', 'home_featured'), colorClass: 'featured-red' },
        { id: 'f5', title: 'Army Agniveer', subtitle: 'Apply Online', href: buildAnnouncementDetailPath('job', 'army-agniveer', 'home_featured'), colorClass: 'featured-green' },
        { id: 'f6', title: 'NEET UG 2026', subtitle: 'Apply Online', href: buildAnnouncementDetailPath('admission', 'neet-ug-2026', 'home_featured'), colorClass: 'featured-magenta' },
        { id: 'f7', title: 'UPSC IAS', subtitle: 'Apply Online', href: buildAnnouncementDetailPath('job', 'upsc-ias-pre', 'home_featured'), colorClass: 'featured-sky' },
        { id: 'f8', title: 'SSC CGL 2026', subtitle: 'Apply Online', href: buildAnnouncementDetailPath('job', 'ssc-cgl-2026', 'home_featured'), colorClass: 'featured-teal' },
    ];
}

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

function buildFeaturedFromCards(cards: AnnouncementCard[]): FeaturedTile[] {
    const seeded = cards.slice(0, 8).map((card, index) => ({
        id: card.id,
        title: card.title,
        subtitle: card.type === 'admit-card' ? 'Download' : 'Apply Online',
        href: buildAnnouncementDetailPath(card.type, card.slug, 'home_featured'),
        colorClass: FEATURED_COLOR_CLASSES[index % FEATURED_COLOR_CLASSES.length],
    }));

    if (seeded.length < 8) {
        const fallback = buildFallbackFeaturedTiles();
        for (const tile of fallback) {
            if (seeded.length >= 8) break;
            seeded.push({ ...tile, id: `${tile.id}-${seeded.length}` });
        }
    }

    return seeded;
}

export function HomePage() {
    const [searchOpen, setSearchOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [popularSearches, setPopularSearches] = useState<string[]>(FALLBACK_POPULAR);
    const [featuredTiles, setFeaturedTiles] = useState<FeaturedTile[]>(buildFallbackFeaturedTiles());
    const [sections, setSections] = useState<HomeSectionFeed>({
        jobs: [],
        results: [],
        admitCards: [],
        answerKeys: [],
        syllabus: [],
        admissions: [],
        important: [],
    });

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const [jobsRes, resultsRes, admitRes, answerRes, syllabusRes, admissionRes, importantRes, trendingRes] = await Promise.all([
                    getAnnouncementCards({ type: 'job', limit: 18, sort: 'newest' }),
                    getAnnouncementCards({ type: 'result', limit: 18, sort: 'newest' }),
                    getAnnouncementCards({ type: 'admit-card', limit: 18, sort: 'newest' }),
                    getAnnouncementCards({ type: 'answer-key', limit: 10, sort: 'newest' }),
                    getAnnouncementCards({ type: 'syllabus', limit: 10, sort: 'newest' }),
                    getAnnouncementCards({ type: 'admission', limit: 10, sort: 'newest' }),
                    getAnnouncementCards({ limit: 10, sort: 'views' }),
                    getTrendingSearches(30, 8),
                ]);

                if (!mounted) return;

                setSections({
                    jobs: jobsRes.data,
                    results: resultsRes.data,
                    admitCards: admitRes.data,
                    answerKeys: answerRes.data,
                    syllabus: syllabusRes.data,
                    admissions: dedupeCards(admissionRes.data),
                    important: importantRes.data,
                });
                setFeaturedTiles(buildFeaturedFromCards([...jobsRes.data, ...resultsRes.data, ...admitRes.data]));

                const trends = (trendingRes.data || [])
                    .map((entry) => entry.query?.trim())
                    .filter((query): query is string => Boolean(query));
                if (trends.length > 0) {
                    setPopularSearches(trends.slice(0, 8));
                }
            } catch (error) {
                console.error('Failed to fetch homepage sections:', error);
                if (mounted) {
                    setSections({
                        jobs: createFallbackCards('job', 'jobs', 8),
                        results: createFallbackCards('result', 'results', 8),
                        admitCards: createFallbackCards('admit-card', 'admit', 8),
                        answerKeys: createFallbackCards('answer-key', 'answer-key', 4),
                        syllabus: createFallbackCards('syllabus', 'syllabus', 4),
                        admissions: createFallbackCards('admission', 'admission', 10),
                        important: createFallbackCards('job', 'important', 4),
                    });
                    setFeaturedTiles(buildFallbackFeaturedTiles());
                    setPopularSearches(FALLBACK_POPULAR);
                }
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
        return (
            sections.jobs.length > 0
            || sections.results.length > 0
            || sections.admitCards.length > 0
            || sections.answerKeys.length > 0
            || sections.syllabus.length > 0
            || sections.admissions.length > 0
            || sections.important.length > 0
        );
    }, [loading, sections]);

    return (
        <Layout>
            <section className="hero-section home-hero-dense">
                <div className="hero-bg" />
                <div className="hero-content animate-slide-up">
                    <h1 className="hero-title">
                        Your Gateway to <span className="hero-accent">Government Careers</span>
                    </h1>
                    <p className="hero-subtitle">
                        Discover high-signal job alerts, admit cards, results, and exam updates in one dense dashboard.
                    </p>
                    <button type="button" className="hero-search-btn" onClick={() => setSearchOpen(true)}>
                        <span className="hero-search-icon">🔍</span>
                        <span>Search jobs, exams, organizations...</span>
                    </button>

                    <div className="home-hero-filters">
                        {QUICK_FILTERS.map((item) => (
                            <Link key={item.label} to={item.to} className="home-hero-filter-chip">
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    <div className="home-popular-searches" data-testid="popular-searches">
                        <span className="home-popular-label">Popular:</span>
                        {popularSearches.map((query) => (
                            <Link key={query} to={`/jobs?q=${encodeURIComponent(query)}`} className="home-popular-chip">
                                {query}
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <FeaturedAnnouncementGrid tiles={featuredTiles} />

            <section className="home-columns" data-testid="home-dense-columns">
                <HomeColumnSection
                    title="Latest Jobs"
                    viewMoreTo="/jobs"
                    items={sections.jobs}
                    sourceTag="home_column_jobs"
                />
                <HomeColumnSection
                    title="Results"
                    viewMoreTo="/results"
                    items={sections.results}
                    sourceTag="home_column_results"
                />
                <HomeColumnSection
                    title="Admit Cards"
                    viewMoreTo="/admit-card"
                    items={sections.admitCards}
                    sourceTag="home_column_admit"
                />
            </section>

            <section className="home-horizontal-stack" data-testid="home-secondary-sections">
                <HomeHorizontalSection
                    title="Answer Key"
                    viewMoreTo="/answer-key"
                    items={sections.answerKeys}
                    sourceTag="home_horizontal_answer_key"
                />
                <HomeHorizontalSection
                    title="Syllabus"
                    viewMoreTo="/syllabus"
                    items={sections.syllabus}
                    sourceTag="home_horizontal_syllabus"
                />
                <HomeHorizontalSection
                    title="Admission"
                    viewMoreTo="/admission"
                    items={sections.admissions}
                    sourceTag="home_horizontal_admission"
                />
                <HomeHorizontalSection
                    title="Important Links"
                    viewMoreTo="/jobs"
                    items={sections.important}
                    sourceTag="home_horizontal_important"
                />
            </section>

            <HomeAdmissionSection items={sections.admissions} />
            <HomeEducationalContent />

            {!loading && !homepageReady && (
                <div className="empty-state">
                    <span className="empty-state-icon">📭</span>
                    <h3>No announcements available yet</h3>
                    <p className="text-muted">Please check back shortly for the latest updates.</p>
                </div>
            )}

            <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        </Layout>
    );
}

