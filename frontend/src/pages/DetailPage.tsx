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

const TYPE_ICONS: Record<ContentType, string> = {
    job: '💼',
    result: '📊',
    'admit-card': '🎫',
    'answer-key': '🔑',
    admission: '🎓',
    syllabus: '📚',
};

const TYPE_COLORS: Record<ContentType, string> = {
    job: '#0069d9',
    result: '#0f9d58',
    'admit-card': '#f97316',
    'answer-key': '#7c3aed',
    admission: '#be185d',
    syllabus: '#0284c7',
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

function formatRelativeDate(dateStr?: string | null): string | null {
    if (!dateStr) return null;
    try {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return null;
    } catch {
        return null;
    }
}

function formatSalary(min?: number, max?: number): string | null {
    if (!min && !max) return null;
    if (min && max) return `₹${min.toLocaleString()} – ₹${max.toLocaleString()}`;
    if (min) return `₹${min.toLocaleString()}+`;
    return `Up to ₹${max!.toLocaleString()}`;
}

function getDeadlineStatus(deadline?: string | null): { label: string; className: string; icon: string } | null {
    if (!deadline) return null;
    const now = new Date();
    const dl = new Date(deadline);
    const diffDays = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Expired', className: 'detail-deadline-expired', icon: '⛔' };
    if (diffDays <= 3) return { label: `${diffDays} days left`, className: 'detail-deadline-urgent', icon: '🔥' };
    if (diffDays <= 7) return { label: `${diffDays} days left`, className: 'detail-deadline-soon', icon: '⏰' };
    return { label: formatDate(deadline), className: 'detail-deadline-normal', icon: '📅' };
}

export function DetailPage({ type }: { type: ContentType }) {
    const { slug } = useParams<{ slug: string }>();
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [related, setRelated] = useState<CardType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        if (!slug) return;
        setLoading(true);
        setError(null);

        (async () => {
            try {
                const res = await getAnnouncementBySlug(type, slug);
                setAnnouncement(res.data);

                try {
                    const rel = await getAnnouncementCards({ type, limit: 6, sort: 'newest' });
                    setRelated(rel.data.filter((item) => item.slug !== slug).slice(0, 4));
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
                <div className="detail-premium-skeleton animate-fade-in">
                    <div className="detail-skeleton-breadcrumb">
                        <div className="skeleton" style={{ height: 14, width: 200 }} />
                    </div>
                    <div className="detail-skeleton-hero">
                        <div className="skeleton" style={{ height: 20, width: 100, marginBottom: 16 }} />
                        <div className="skeleton" style={{ height: 32, width: '80%', marginBottom: 12 }} />
                        <div className="skeleton" style={{ height: 16, width: '50%', marginBottom: 24 }} />
                        <div className="detail-skeleton-stats">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />
                            ))}
                        </div>
                    </div>
                    <div className="detail-skeleton-body">
                        <div className="detail-skeleton-main">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="skeleton" style={{ height: 16, width: `${90 - i * 8}%`, marginBottom: 10 }} />
                            ))}
                        </div>
                        <div className="detail-skeleton-side">
                            <div className="skeleton" style={{ height: 48, borderRadius: 12, marginBottom: 12 }} />
                            <div className="skeleton" style={{ height: 48, borderRadius: 12, marginBottom: 12 }} />
                            <div className="skeleton" style={{ height: 160, borderRadius: 12 }} />
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    if (error || !announcement) {
        return (
            <Layout>
                <div className="detail-error-premium animate-fade-in">
                    <div className="detail-error-icon">😕</div>
                    <h2>Announcement Not Found</h2>
                    <p className="text-muted">{error || 'This announcement may have been removed or is no longer available.'}</p>
                    <div className="detail-error-actions">
                        <Link to={TYPE_ROUTES[type]} className="btn btn-accent">
                            ← Browse {TYPE_LABELS[type]}
                        </Link>
                        <Link to="/" className="btn btn-outline">
                            Go Home
                        </Link>
                    </div>
                </div>
            </Layout>
        );
    }

    const a = announcement;
    const salary = formatSalary(a.salaryMin, a.salaryMax);
    const deadlineStatus = getDeadlineStatus(a.deadline);
    const relativeDate = formatRelativeDate(a.postedAt);
    const typeColor = TYPE_COLORS[a.type];

    /* Build quick-info items dynamically */
    const quickInfoItems: Array<{ icon: string; label: string; value: string; highlight?: boolean }> = [];
    if (a.deadline) quickInfoItems.push({ icon: '📅', label: 'Last Date', value: formatDate(a.deadline), highlight: !!deadlineStatus && deadlineStatus.className !== 'detail-deadline-normal' });
    if (a.minQualification) quickInfoItems.push({ icon: '🎓', label: 'Qualification', value: a.minQualification });
    if (a.totalPosts) quickInfoItems.push({ icon: '👥', label: 'Total Posts', value: a.totalPosts.toLocaleString() });
    if (salary) quickInfoItems.push({ icon: '💰', label: 'Salary', value: salary });
    if (a.ageLimit) quickInfoItems.push({ icon: '📋', label: 'Age Limit', value: a.ageLimit });
    if (a.applicationFee) quickInfoItems.push({ icon: '💳', label: 'Application Fee', value: a.applicationFee });
    if (a.cutoffMarks) quickInfoItems.push({ icon: '📊', label: 'Cut-off Marks', value: a.cutoffMarks });
    if (a.difficulty) quickInfoItems.push({ icon: '🎯', label: 'Difficulty', value: a.difficulty.charAt(0).toUpperCase() + a.difficulty.slice(1) });

    return (
        <Layout>
            <article className="detail-premium animate-fade-in">
                {/* Breadcrumb */}
                <nav className="detail-breadcrumb-premium">
                    <Link to="/">Home</Link>
                    <span className="breadcrumb-chevron">›</span>
                    <Link to={TYPE_ROUTES[type]}>{TYPE_LABELS[type]}</Link>
                    <span className="breadcrumb-chevron">›</span>
                    <span className="breadcrumb-current">{a.title}</span>
                </nav>

                {/* Hero Section */}
                <header className="detail-hero" style={{ '--detail-accent': typeColor } as React.CSSProperties}>
                    <div className="detail-hero-top">
                        <span className={`detail-type-badge detail-type-${a.type}`}>
                            {TYPE_ICONS[a.type]} {TYPE_LABELS[a.type]}
                        </span>
                        {deadlineStatus && (
                            <span className={`detail-deadline-badge ${deadlineStatus.className}`}>
                                {deadlineStatus.icon} {deadlineStatus.label}
                            </span>
                        )}
                    </div>

                    <h1 className="detail-hero-title">{a.title}</h1>

                    <div className="detail-hero-meta">
                        {a.organization && (
                            <span className="detail-meta-chip">
                                <span className="detail-meta-icon">🏛️</span> {a.organization}
                            </span>
                        )}
                        {a.location && (
                            <span className="detail-meta-chip">
                                <span className="detail-meta-icon">📍</span> {a.location}
                            </span>
                        )}
                        <span className="detail-meta-chip">
                            <span className="detail-meta-icon">👁️</span> {(a.viewCount ?? 0).toLocaleString()} views
                        </span>
                        {relativeDate && (
                            <span className="detail-meta-chip detail-meta-time">
                                <span className="detail-meta-icon">🕐</span> {relativeDate}
                            </span>
                        )}
                    </div>

                    {/* Quick Info Grid */}
                    {quickInfoItems.length > 0 && (
                        <div className="detail-quick-grid">
                            {quickInfoItems.map((item, index) => (
                                <div key={index} className={`detail-quick-card${item.highlight ? ' detail-quick-highlight' : ''}`}>
                                    <span className="detail-quick-icon">{item.icon}</span>
                                    <div className="detail-quick-text">
                                        <span className="detail-quick-label">{item.label}</span>
                                        <strong className="detail-quick-value">{item.value}</strong>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </header>

                {/* Main Body */}
                <div className="detail-body-premium">
                    {/* Content Column */}
                    <div className="detail-main-col">
                        {/* Info Table */}
                        {(a.minQualification || a.ageLimit || a.applicationFee || a.cutoffMarks || a.totalPosts || salary) && (
                            <section className="detail-info-table-section">
                                <h2 className="detail-section-title">
                                    <span className="detail-section-icon">📋</span>
                                    Quick Overview
                                </h2>
                                <div className="detail-info-table">
                                    {a.organization && (
                                        <div className="detail-info-row">
                                            <span className="detail-info-key">Organization</span>
                                            <span className="detail-info-val">{a.organization}</span>
                                        </div>
                                    )}
                                    {a.totalPosts != null && a.totalPosts > 0 && (
                                        <div className="detail-info-row">
                                            <span className="detail-info-key">Total Posts</span>
                                            <span className="detail-info-val">{a.totalPosts.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {a.minQualification && (
                                        <div className="detail-info-row">
                                            <span className="detail-info-key">Qualification</span>
                                            <span className="detail-info-val">{a.minQualification}</span>
                                        </div>
                                    )}
                                    {a.ageLimit && (
                                        <div className="detail-info-row">
                                            <span className="detail-info-key">Age Limit</span>
                                            <span className="detail-info-val">{a.ageLimit}</span>
                                        </div>
                                    )}
                                    {a.applicationFee && (
                                        <div className="detail-info-row">
                                            <span className="detail-info-key">Application Fee</span>
                                            <span className="detail-info-val">{a.applicationFee}</span>
                                        </div>
                                    )}
                                    {salary && (
                                        <div className="detail-info-row">
                                            <span className="detail-info-key">Salary</span>
                                            <span className="detail-info-val detail-info-salary">{salary}</span>
                                        </div>
                                    )}
                                    {a.cutoffMarks && (
                                        <div className="detail-info-row">
                                            <span className="detail-info-key">Cut-off Marks</span>
                                            <span className="detail-info-val">{a.cutoffMarks}</span>
                                        </div>
                                    )}
                                    {a.deadline && (
                                        <div className="detail-info-row">
                                            <span className="detail-info-key">Last Date</span>
                                            <span className={`detail-info-val ${deadlineStatus?.className || ''}`}>{formatDate(a.deadline)}</span>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Important Dates inline for mobile */}
                        {a.importantDates && a.importantDates.length > 0 && (
                            <section className="detail-dates-inline">
                                <h2 className="detail-section-title">
                                    <span className="detail-section-icon">📅</span>
                                    Important Dates
                                </h2>
                                <div className="detail-dates-timeline">
                                    {a.importantDates.map((date, index) => (
                                        <div key={date.id ?? index} className="detail-date-row">
                                            <span className="detail-date-dot" />
                                            <div className="detail-date-content">
                                                <span className="detail-date-event">{date.eventName}</span>
                                                <span className="detail-date-value">{formatDate(date.eventDate)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Rich Content */}
                        {a.content && (
                            <section className="detail-content-section">
                                <h2 className="detail-section-title">
                                    <span className="detail-section-icon">📝</span>
                                    Full Details
                                </h2>
                                <div className="detail-content-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(a.content) }} />
                            </section>
                        )}

                        {/* Tags */}
                        {a.tags && a.tags.length > 0 && (
                            <div className="detail-tags-premium">
                                {a.tags.map((tag) => (
                                    <span key={tag.id} className="detail-tag">{tag.name}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <aside className="detail-sidebar-premium">
                        {/* CTA Card */}
                        <div className="detail-cta-card" style={{ '--detail-accent': typeColor } as React.CSSProperties}>
                            {a.externalLink ? (
                                <a
                                    href={a.externalLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="detail-cta-btn detail-cta-primary"
                                >
                                    <span>Apply / Official Link</span>
                                    <span className="detail-cta-arrow">↗</span>
                                </a>
                            ) : (
                                <button type="button" className="detail-cta-btn detail-cta-disabled" disabled>
                                    Link Not Available Yet
                                </button>
                            )}
                            <Link to={TYPE_ROUTES[type]} className="detail-cta-btn detail-cta-secondary">
                                More {TYPE_LABELS[type]} →
                            </Link>
                        </div>

                        {/* Important Dates sidebar (desktop) */}
                        {a.importantDates && a.importantDates.length > 0 && (
                            <div className="detail-sidebar-card detail-sidebar-dates">
                                <h3>📅 Important Dates</h3>
                                <ul className="detail-sidebar-dates-list">
                                    {a.importantDates.map((date, index) => (
                                        <li key={date.id ?? index}>
                                            <span className="detail-sidebar-date-event">{date.eventName}</span>
                                            <span className="detail-sidebar-date-val">{formatDate(date.eventDate)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Share Card */}
                        <div className="detail-sidebar-card detail-share-card">
                            <h3>📤 Share This</h3>
                            <div className="detail-share-buttons">
                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent(a.title + ' - ' + window.location.href)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="detail-share-btn detail-share-whatsapp"
                                >
                                    💬 WhatsApp
                                </a>
                                <a
                                    href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(a.title)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="detail-share-btn detail-share-telegram"
                                >
                                    ✈️ Telegram
                                </a>
                                <button
                                    type="button"
                                    className="detail-share-btn detail-share-copy"
                                    onClick={() => { navigator.clipboard.writeText(window.location.href); }}
                                >
                                    🔗 Copy Link
                                </button>
                            </div>
                        </div>

                        {/* Tags sidebar */}
                        {a.tags && a.tags.length > 0 && (
                            <div className="detail-sidebar-card">
                                <h3>🏷️ Tags</h3>
                                <div className="detail-sidebar-tags">
                                    {a.tags.map((tag) => (
                                        <span key={tag.id} className="detail-tag">{tag.name}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </aside>
                </div>

                {/* Related */}
                {related.length > 0 && (
                    <section className="detail-related-premium">
                        <h2 className="detail-section-title">
                            <span className="detail-section-icon">🔗</span>
                            Related {TYPE_LABELS[type]}
                        </h2>
                        <div className="detail-related-grid">
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
