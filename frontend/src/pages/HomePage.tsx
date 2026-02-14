import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { HomeDenseBox } from '../components/home/HomeDenseBox';
import { HomeMobileTabs } from '../components/home/HomeMobileTabs';
import { getAnnouncementCards } from '../utils/api';
import type { AnnouncementCard } from '../types';

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
    const [loading, setLoading] = useState(true);
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
                    topViewsRes,
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
                    getAnnouncementCards({ limit: 10, sort: 'views' }),
                ]);

                if (!mounted) return;

                const keywordCards = dedupeCards([...certificateRes.data, ...verificationRes.data]);
                const certificateCards = buildCertificateCards(
                    keywordCards,
                    admissionRes.data,
                    resultsRes.data,
                    topViewsRes.data,
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

    return (
        <Layout>
            <section className="home-v3-shell" data-testid="home-v3-shell">
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

                <div className="home-v3-top-grid" data-testid="home-v3-top-grid">
                    <HomeDenseBox
                        title="Latest Jobs"
                        viewMoreTo="/jobs"
                        items={sections.jobs}
                        sourceTag="home_box_jobs"
                        testId="home-v3-dense-box-jobs"
                    />
                    <HomeDenseBox
                        title="Admit Card"
                        viewMoreTo="/admit-card"
                        items={sections.admitCards}
                        sourceTag="home_box_admit"
                        testId="home-v3-dense-box-admit"
                    />
                    <HomeDenseBox
                        title="Result"
                        viewMoreTo="/results"
                        items={sections.results}
                        sourceTag="home_box_results"
                        testId="home-v3-dense-box-results"
                    />
                </div>

                <div className="home-v3-bottom-grid" data-testid="home-v3-bottom-grid">
                    <HomeDenseBox
                        title="Answer Key"
                        viewMoreTo="/answer-key"
                        items={sections.answerKeys}
                        sourceTag="home_box_answer_key"
                        testId="home-v3-dense-box-answer-key"
                        className="home-dense-box-area-answer"
                    />
                    <HomeDenseBox
                        title="Syllabus"
                        viewMoreTo="/syllabus"
                        items={sections.syllabus}
                        sourceTag="home_box_syllabus"
                        testId="home-v3-dense-box-syllabus"
                        className="home-dense-box-area-syllabus"
                    />
                    <HomeDenseBox
                        title="Admission"
                        viewMoreTo="/admission"
                        items={sections.admissions}
                        sourceTag="home_box_admission"
                        testId="home-v3-dense-box-admission"
                        className="home-dense-box-area-admission"
                    />
                    <HomeDenseBox
                        title="Certificate Verification"
                        viewMoreTo="/results?q=certificate"
                        items={sections.certificates}
                        sourceTag="home_box_certificate"
                        testId="home-v3-dense-box-certificate"
                        className="home-dense-box-area-certificate"
                    />
                    <HomeDenseBox
                        title="Important"
                        viewMoreTo="/jobs?sort=views"
                        items={sections.important}
                        sourceTag="home_box_important"
                        testId="home-v3-dense-box-important"
                        className="home-dense-box-area-important"
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
