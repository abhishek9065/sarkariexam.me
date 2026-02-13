import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { SEOHead } from '../../components/seo/SEOHead';
import { fetchAnnouncementBySlug, fetchAnnouncementsByType } from '../../utils/api';
import { formatDate } from '../../utils';
import type { Announcement, ContentType } from '../../types';
import { AppShell } from '../app/AppShell';
import { useCompareV3 } from '../hooks/useCompareV3';
import { useGlobalSearchV3 } from '../hooks/useGlobalSearchV3';
import { useTrackerV3 } from '../hooks/useTrackerV3';
import { CompareDrawerV3 } from '../components/shared/CompareDrawerV3';
import { AnnouncementListDense } from '../components/shared/AnnouncementListDense';

interface DetailPageV3Props {
    type?: ContentType;
}

const VALID_TYPES: ContentType[] = ['job', 'result', 'admit-card', 'answer-key', 'admission', 'syllabus'];

const normalizeType = (value?: string | null): ContentType | null => {
    if (!value) return null;
    if (VALID_TYPES.includes(value as ContentType)) return value as ContentType;
    if (value === 'jobs') return 'job';
    if (value === 'results') return 'result';
    if (value === 'admit-cards') return 'admit-card';
    return null;
};

export function DetailPageV3({ type }: DetailPageV3Props) {
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams<{ slug?: string; type?: string }>();
    const slug = params.slug;
    const routeType = normalizeType(params.type);
    const resolvedType = type || routeType || null;

    const [item, setItem] = useState<Announcement | null>(null);
    const [related, setRelated] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const compare = useCompareV3();
    const tracker = useTrackerV3();

    const search = useGlobalSearchV3({
        onOpenDetail: (targetType, targetSlug) => navigate(`/${targetType}/${targetSlug}`),
        onOpenCategory: (filter, query) => {
            const base = filter === 'result' ? '/results' : filter === 'admit-card' ? '/admit-card' : '/jobs';
            navigate(`${base}?search=${encodeURIComponent(query)}`);
        },
    });

    useEffect(() => {
        if (!slug) {
            setLoading(false);
            setError('Announcement slug is missing.');
            return;
        }

        let active = true;
        setLoading(true);
        setError(null);

        fetchAnnouncementBySlug(slug, location.search)
            .then(async (data) => {
                if (!active) return;
                if (!data) {
                    setItem(null);
                    setError('Announcement not found.');
                    return;
                }
                if (resolvedType && data.type !== resolvedType) {
                    setError('Announcement type mismatch.');
                }
                setItem(data);

                try {
                    const relatedItems = await fetchAnnouncementsByType(data.type, 30);
                    if (!active) return;
                    setRelated(relatedItems.filter((entry) => entry.slug !== data.slug).slice(0, 8));
                } catch {
                    if (!active) return;
                    setRelated([]);
                }
            })
            .catch((err) => {
                console.error('Failed to load detail:', err);
                if (!active) return;
                setError('Unable to load announcement details right now.');
            })
            .finally(() => {
                if (!active) return;
                setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [location.search, resolvedType, slug]);

    const canonical = `${window.location.origin}${location.pathname}${location.search}`;
    const isTracked = item ? tracker.isTracked(item.slug) : false;

    const officialLink = item?.externalLink && /^https?:\/\//i.test(item.externalLink)
        ? item.externalLink
        : null;

    const summaryCards = useMemo(() => {
        if (!item) return [];
        return [
            { label: 'Organization', value: item.organization || '-' },
            { label: 'Posts', value: item.totalPosts != null ? String(item.totalPosts) : '-' },
            { label: 'Deadline', value: item.deadline ? formatDate(item.deadline) : '-' },
            { label: 'Qualification', value: item.minQualification || '-' },
        ];
    }, [item]);

    const trackedSlugs = useMemo(() => new Set(tracker.items.map((entry) => entry.slug)), [tracker.items]);

    return (
        <>
            <SEOHead
                title={item?.title || 'Announcement Detail'}
                description={item?.content?.slice(0, 170) || 'Detailed notification with dates, links, and eligibility.'}
                canonicalUrl={canonical}
                ogType="article"
                keywords={[item?.organization || 'government', item?.type || 'jobs', 'sarkari exams']}
                publishedTime={item?.postedAt}
                modifiedTime={item?.updatedAt}
                jobPosting={item && item.type === 'job' ? {
                    title: item.title,
                    organization: item.organization || 'Government',
                    location: item.location || 'India',
                    deadline: item.deadline || undefined,
                    salary: item.salaryMin ? String(item.salaryMin) : undefined,
                    totalPosts: item.totalPosts || undefined,
                } : undefined}
            />

            <AppShell search={search} compareCount={compare.selections.length} onOpenCompare={compare.open}>
                {loading && <div className="sr3-surface sr3-loading">Loading announcement...</div>}
                {error && !loading && <div className="sr3-surface sr3-error">{error}</div>}

                {!loading && item && (
                    <>
                        <section className="sr3-section sr3-surface sr3-detail-hero">
                            <div>
                                <span className="sr3-badge blue">{item.type}</span>
                                <h1 className="sr3-home-title">{item.title}</h1>
                                <p className="sr3-section-subtitle">{item.organization || 'Government Department'}</p>
                            </div>
                            <div className="sr3-meta-row">
                                <button
                                    type="button"
                                    className="sr3-btn secondary"
                                    onClick={() => {
                                        if (!item) return;
                                        if (tracker.isTracked(item.slug)) {
                                            void tracker.untrack(item.slug);
                                        } else {
                                            void tracker.trackAnnouncement(item, 'saved');
                                        }
                                    }}
                                >
                                    {isTracked ? 'Untrack' : 'Track'}
                                </button>
                                {item.type === 'job' && (
                                    <button type="button" className="sr3-btn secondary" onClick={() => compare.add(item)}>
                                        Compare
                                    </button>
                                )}
                                {officialLink && (
                                    <a className="sr3-btn" href={officialLink} target="_blank" rel="noreferrer">
                                        Official Source
                                    </a>
                                )}
                            </div>
                        </section>

                        <section className="sr3-section sr3-surface sr3-detail-summary-grid">
                            {summaryCards.map((card) => (
                                <article key={card.label} className="sr3-detail-summary-card">
                                    <h2>{card.label}</h2>
                                    <p>{card.value}</p>
                                </article>
                            ))}
                        </section>

                        <section className="sr3-section sr3-two-col">
                            <article className="sr3-surface sr3-detail-content">
                                <h2 className="sr3-section-title">Notification Details</h2>
                                <p>{item.content || 'Official notification details will be updated here.'}</p>

                                <h3 className="sr3-section-title">Important Checklist</h3>
                                <ul className="sr3-detail-checklist">
                                    <li>Verify eligibility from official notice.</li>
                                    <li>Keep documents ready before application.</li>
                                    <li>Set reminders for admit card and result dates.</li>
                                    <li>Use official portal only for final submission.</li>
                                </ul>
                            </article>

                            <article className="sr3-surface sr3-detail-content">
                                <h2 className="sr3-section-title">Quick Facts</h2>
                                <ul className="sr3-detail-facts">
                                    <li><strong>Posted:</strong> {item.postedAt ? formatDate(item.postedAt) : '-'}</li>
                                    <li><strong>Updated:</strong> {item.updatedAt ? formatDate(item.updatedAt) : '-'}</li>
                                    <li><strong>Location:</strong> {item.location || 'All India'}</li>
                                    <li><strong>Age Limit:</strong> {item.ageLimit || '-'}</li>
                                    <li><strong>Application Fee:</strong> {item.applicationFee || '-'}</li>
                                </ul>

                                {officialLink ? (
                                    <a className="sr3-inline-link" href={officialLink} target="_blank" rel="noreferrer">
                                        Open official website
                                    </a>
                                ) : (
                                    <p className="sr3-section-subtitle">Official link unavailable. Verify from department website.</p>
                                )}
                            </article>
                        </section>

                        <AnnouncementListDense
                            title="Related Updates"
                            subtitle="You may also want to track these"
                            items={related}
                            limit={8}
                            trackedSlugs={trackedSlugs}
                            onTrackToggle={(relatedItem) => {
                                if (tracker.isTracked(relatedItem.slug)) {
                                    void tracker.untrack(relatedItem.slug);
                                    return;
                                }
                                void tracker.trackAnnouncement(relatedItem, 'saved');
                            }}
                            onCompareAdd={compare.add}
                        />

                        <section className="sr3-section sr3-surface sr3-detail-trust-note">
                            <h2 className="sr3-section-title">Trust Warning</h2>
                            <p className="sr3-section-subtitle">
                                Always cross-check dates, fee, and eligibility on official portals. SarkariExams.me links are for discovery only.
                            </p>
                        </section>
                    </>
                )}
            </AppShell>

            <CompareDrawerV3
                open={compare.isOpen}
                items={compare.selections}
                maxItems={compare.maxItems}
                onClose={compare.close}
                onClear={compare.clear}
                onRemove={compare.remove}
                onViewJob={(job) => {
                    navigate(`/${job.type}/${job.slug}`);
                    compare.close();
                }}
            />
        </>
    );
}

export default DetailPageV3;
