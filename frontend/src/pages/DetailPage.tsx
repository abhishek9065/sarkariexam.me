import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { Layout } from '../components/Layout';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { getAnnouncementBySlug, getAnnouncementCards } from '../utils/api';
import type { Announcement, AnnouncementCard as CardType, ContentType } from '../types';

const TYPE_LABELS: Record<ContentType, string> = {
    job: 'Latest Jobs',
    result: 'Results',
    'admit-card': 'Admit Cards',
    'answer-key': 'Answer Keys',
    admission: 'Admissions',
    syllabus: 'Syllabus',
};

const TYPE_ROUTES: Record<ContentType, string> = {
    job: '/jobs',
    result: '/results',
    'admit-card': '/admit-card',
    'answer-key': '/answer-key',
    admission: '/admission',
    syllabus: '/syllabus',
};

function formatDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric',
        });
    } catch {
        return '—';
    }
}

function formatSalary(min?: number, max?: number): string | null {
    if (!min && !max) return null;
    if (min && max) return `₹${min.toLocaleString()} – ₹${max.toLocaleString()}`;
    if (min) return `₹${min.toLocaleString()}+`;
    return `Up to ₹${max!.toLocaleString()}`;
}

export function DetailPage({ type }: { type: ContentType }) {
    const { slug } = useParams<{ slug: string }>();
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [related, setRelated] = useState<CardType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) return;
        setLoading(true);
        setError(null);

        (async () => {
            try {
                const res = await getAnnouncementBySlug(type, slug);
                setAnnouncement(res.data);

                try {
                    const rel = await getAnnouncementCards({ type, limit: 6, sort: 'newest' });
                    setRelated(rel.data.filter((item) => item.slug !== slug).slice(0, 3));
                } catch {
                    setRelated([]);
                }
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Failed to load announcement');
            } finally {
                setLoading(false);
            }
        })();
    }, [type, slug]);

    if (loading) {
        return (
            <Layout>
                <div className="detail-skeleton animate-fade-in">
                    <div className="skeleton" style={{ height: 28, width: '70%', marginBottom: 16 }} />
                    <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 32 }} />
                    <div className="skeleton" style={{ height: 120, width: '100%', marginBottom: 24 }} />
                    <div className="skeleton" style={{ height: 16, width: '90%', marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 16, width: '80%', marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 16, width: '60%' }} />
                </div>
            </Layout>
        );
    }

    if (error || !announcement) {
        return (
            <Layout>
                <div className="detail-error animate-fade-in">
                    <span style={{ fontSize: '3rem' }}>😕</span>
                    <h2>Not Found</h2>
                    <p className="text-muted">{error || 'Announcement not found.'}</p>
                    <Link to={TYPE_ROUTES[type]} className="btn btn-primary" style={{ marginTop: 16 }}>
                        ← Back to {TYPE_LABELS[type]}
                    </Link>
                </div>
            </Layout>
        );
    }

    const a = announcement;
    const salary = formatSalary(a.salaryMin, a.salaryMax);

    return (
        <Layout>
            <article className="detail-page animate-fade-in">
                <nav className="detail-breadcrumb">
                    <Link to="/">Home</Link>
                    <span className="breadcrumb-sep">/</span>
                    <Link to={TYPE_ROUTES[type]}>{TYPE_LABELS[type]}</Link>
                    <span className="breadcrumb-sep">/</span>
                    <span className="breadcrumb-current">{a.title}</span>
                </nav>

                <header className="detail-header">
                    <span className={`badge badge-${a.type}`} style={{ marginBottom: 8 }}>
                        {TYPE_LABELS[a.type]}
                    </span>
                    <h1 className="detail-title">{a.title}</h1>

                    <div className="detail-meta">
                        {a.organization && <span>🏛️ {a.organization}</span>}
                        {a.location && <span>📍 {a.location}</span>}
                        {a.postedAt && <span>📅 Posted {formatDate(a.postedAt)}</span>}
                        <span>👁️ {(a.viewCount ?? 0).toLocaleString()} views</span>
                    </div>
                </header>

                <section className="detail-quick-slab card">
                    <div className="detail-quick-item">
                        <span>Deadline</span>
                        <strong>{formatDate(a.deadline)}</strong>
                    </div>
                    <div className="detail-quick-item">
                        <span>Qualification</span>
                        <strong>{a.minQualification || 'As per notice'}</strong>
                    </div>
                    <div className="detail-quick-item">
                        <span>Total Posts</span>
                        <strong>{a.totalPosts ? a.totalPosts.toLocaleString() : '—'}</strong>
                    </div>
                    <div className="detail-quick-item">
                        <span>Salary</span>
                        <strong>{salary || 'As per notice'}</strong>
                    </div>
                </section>

                <div className="detail-body-grid">
                    <div className="detail-content">
                        <div className="detail-info-grid">
                            {a.minQualification && (
                                <div className="detail-info-item">
                                    <span className="detail-info-label">Qualification</span>
                                    <span className="detail-info-value">{a.minQualification}</span>
                                </div>
                            )}
                            {a.ageLimit && (
                                <div className="detail-info-item">
                                    <span className="detail-info-label">Age Limit</span>
                                    <span className="detail-info-value">{a.ageLimit}</span>
                                </div>
                            )}
                            {a.applicationFee && (
                                <div className="detail-info-item">
                                    <span className="detail-info-label">Application Fee</span>
                                    <span className="detail-info-value">{a.applicationFee}</span>
                                </div>
                            )}
                            {a.cutoffMarks && (
                                <div className="detail-info-item">
                                    <span className="detail-info-label">Cut-off Marks</span>
                                    <span className="detail-info-value">{a.cutoffMarks}</span>
                                </div>
                            )}
                        </div>

                        {a.content && (
                            <div className="detail-body-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(a.content) }} />
                        )}
                    </div>

                    <aside className="detail-sidebar">
                        <div className="detail-action-panel card">
                            {a.externalLink ? (
                                <a
                                    href={a.externalLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-accent btn-lg detail-apply-btn"
                                >
                                    Apply / Official Website ↗
                                </a>
                            ) : (
                                <button type="button" className="btn btn-outline btn-lg detail-apply-btn" disabled>
                                    Link Unavailable
                                </button>
                            )}
                            <Link to={TYPE_ROUTES[type]} className="btn btn-outline detail-sidebar-secondary-btn">
                                More {TYPE_LABELS[type]}
                            </Link>
                        </div>

                        {a.importantDates && a.importantDates.length > 0 && (
                            <div className="detail-dates card">
                                <h3>📅 Important Dates</h3>
                                <ul className="dates-list">
                                    {a.importantDates.map((date, index) => (
                                        <li key={date.id ?? index} className="date-item">
                                            <span className="date-label">{date.eventName}</span>
                                            <span className="date-value">{formatDate(date.eventDate)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {a.tags && a.tags.length > 0 && (
                            <div className="detail-tags card">
                                <h4>Tags</h4>
                                <div className="tags-list">
                                    {a.tags.map((tag) => (
                                        <span key={tag.id} className="tag">{tag.name}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </aside>
                </div>

                {related.length > 0 && (
                    <section className="detail-related">
                        <h2>Related Updates</h2>
                        <div className="grid-auto">
                            {related.map((card) => (
                                <AnnouncementCard key={card.id} card={card} sourceTag="detail_related" />
                            ))}
                        </div>
                    </section>
                )}
            </article>
        </Layout>
    );
}
