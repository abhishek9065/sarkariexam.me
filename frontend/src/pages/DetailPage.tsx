import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { Layout } from '../components/Layout';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { getAnnouncementBySlug, getAnnouncementCards, addBookmark, removeBookmark, getBookmarks } from '../utils/api';
import { trackEvent } from '../utils/analytics';
import type { Announcement, AnnouncementCard as CardType, ContentType } from '../types';
import './DetailPage.css';

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

const TYPE_CTA: Record<ContentType, string> = {
    job: 'Apply Online',
    result: 'Check Result',
    'admit-card': 'Download Admit Card',
    'answer-key': 'Download Answer Key',
    admission: 'Apply Now',
    syllabus: 'View Syllabus',
};

function formatDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return '—'; }
}

function formatRelativeDate(dateStr?: string | null): string | null {
    if (!dateStr) return null;
    try {
        const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return null;
    } catch { return null; }
}

function formatSalary(min?: number, max?: number): string | null {
    if (!min && !max) return null;
    if (min && max) return `₹${min.toLocaleString()} – ₹${max.toLocaleString()}`;
    if (min) return `₹${min.toLocaleString()}+`;
    return `Up to ₹${max!.toLocaleString()}`;
}

function getDeadlineStatus(deadline?: string | null): { label: string; className: string; icon: string } | null {
    if (!deadline) return null;
    const diffDays = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
    if (diffDays < 0) return { label: 'Expired', className: 'detail-deadline-expired', icon: '⛔' };
    if (diffDays === 0) return { label: 'Last day!', className: 'detail-deadline-urgent', icon: '🔥' };
    if (diffDays <= 3) return { label: `${diffDays} days left`, className: 'detail-deadline-urgent', icon: '🔥' };
    if (diffDays <= 7) return { label: `${diffDays} days left`, className: 'detail-deadline-soon', icon: '⏰' };
    return { label: formatDate(deadline), className: 'detail-deadline-normal', icon: '📅' };
}

function getStatusBadge(deadline?: string | null): { label: string; cls: string } {
    if (!deadline) return { label: 'Open', cls: 'detail-facts-open' };
    const d = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
    if (d < 0) return { label: 'Closed', cls: 'detail-facts-closed' };
    return { label: 'Open', cls: 'detail-facts-open' };
}

/* Extractable sections from rich HTML content for jump-nav */
interface JumpSection { id: string; label: string; icon: string }
function buildJumpSections(a: Announcement): JumpSection[] {
    const sections: JumpSection[] = [];
    sections.push({ id: 'overview', label: 'Overview', icon: '📋' });
    if (a.importantDates && a.importantDates.length > 0) sections.push({ id: 'dates', label: 'Important Dates', icon: '📅' });
    if (a.minQualification || a.ageLimit) sections.push({ id: 'eligibility', label: 'Eligibility', icon: '🎓' });
    if (a.applicationFee) sections.push({ id: 'fees', label: 'Fees', icon: '💳' });
    if (a.content) sections.push({ id: 'details', label: 'Full Details', icon: '📝' });
    if (a.externalLink) sections.push({ id: 'links', label: 'Important Links', icon: '🔗' });
    return sections;
}

export function DetailPage({ type }: { type: ContentType }) {
    const { slug } = useParams<{ slug: string }>();
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [related, setRelated] = useState<CardType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [bookmarked, setBookmarked] = useState(false);
    const [activeSection, setActiveSection] = useState('overview');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        if (!slug) return;
        let mounted = true;
        setLoading(true);
        setError(null);

        (async () => {
            try {
                const res = await getAnnouncementBySlug(type, slug);
                if (!mounted) return;
                setAnnouncement(res.data);
                trackEvent('detail_view', { type, slug });

                try {
                    const rel = await getAnnouncementCards({ type, limit: 8, sort: 'newest' });
                    if (mounted) setRelated(rel.data.filter((item) => item.slug !== slug).slice(0, 6));
                } catch { if (mounted) setRelated([]); }

                /* Check if bookmarked */
                try {
                    const bm = await getBookmarks();
                    if (mounted && Array.isArray(bm.data) && bm.data.some((b) => b.id === res.data.id)) {
                        setBookmarked(true);
                    }
                } catch { /* not logged in or error */ }
            } catch (err: unknown) {
                if (mounted) setError(err instanceof Error ? err.message : 'Failed to load announcement');
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => { mounted = false; };
    }, [type, slug]);

    /* Intersection observer for jump-nav active state */
    useEffect(() => {
        if (!announcement) return;
        const sectionIds = buildJumpSections(announcement).map((s) => s.id);
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                        break;
                    }
                }
            },
            { rootMargin: '-100px 0px -60% 0px', threshold: 0.1 },
        );
        for (const id of sectionIds) {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        }
        return () => observer.disconnect();
    }, [announcement]);

    const toggleBookmark = useCallback(async () => {
        if (!announcement) return;
        try {
            if (bookmarked) {
                await removeBookmark(announcement.id);
                setBookmarked(false);
                trackEvent('bookmark_remove', { slug: announcement.slug });
            } else {
                await addBookmark(announcement.id);
                setBookmarked(true);
                trackEvent('bookmark_add', { slug: announcement.slug });
            }
        } catch { /* not logged in */ }
    }, [announcement, bookmarked]);

    const handleCopyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard API not available */ }
    }, []);

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
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />
                            ))}
                        </div>
                    </div>
                    <div className="detail-skeleton-body">
                        <div className="detail-skeleton-main">
                            {[1, 2, 3, 4, 5].map((i) => (
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
                        <Link to={TYPE_ROUTES[type]} className="btn btn-accent">← Browse {TYPE_LABELS[type]}</Link>
                        <Link to="/" className="btn btn-outline">Go Home</Link>
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
    const statusBadge = getStatusBadge(a.deadline);
    const jumpSections = buildJumpSections(a);

    /* Key facts for sidebar */
    const keyFacts: Array<{ label: string; value: string; isLink?: boolean; href?: string }> = [];
    if (a.organization) keyFacts.push({ label: 'Organization', value: a.organization });
    if (a.totalPosts) keyFacts.push({ label: 'Total Vacancies', value: a.totalPosts.toLocaleString() });
    if (a.deadline) keyFacts.push({ label: 'Last Date', value: formatDate(a.deadline) });
    if (a.minQualification) keyFacts.push({ label: 'Qualification', value: a.minQualification });
    if (a.applicationFee) keyFacts.push({ label: 'Application Fee', value: a.applicationFee });
    if (salary) keyFacts.push({ label: 'Salary', value: salary });
    if (a.ageLimit) keyFacts.push({ label: 'Age Limit', value: a.ageLimit });
    if (a.externalLink) keyFacts.push({ label: 'Official Website', value: 'Visit →', isLink: true, href: a.externalLink });

    /* Quick-info grid items */
    const quickInfoItems: Array<{ icon: string; label: string; value: string; highlight?: boolean }> = [];
    if (a.deadline) quickInfoItems.push({ icon: '📅', label: 'Last Date', value: formatDate(a.deadline), highlight: !!deadlineStatus && deadlineStatus.className !== 'detail-deadline-normal' });
    if (a.minQualification) quickInfoItems.push({ icon: '🎓', label: 'Qualification', value: a.minQualification });
    if (a.totalPosts) quickInfoItems.push({ icon: '👥', label: 'Total Posts', value: a.totalPosts.toLocaleString() });
    if (salary) quickInfoItems.push({ icon: '💰', label: 'Salary', value: salary });
    if (a.ageLimit) quickInfoItems.push({ icon: '📋', label: 'Age Limit', value: a.ageLimit });
    if (a.applicationFee) quickInfoItems.push({ icon: '💳', label: 'Fee', value: a.applicationFee });
    if (a.cutoffMarks) quickInfoItems.push({ icon: '📊', label: 'Cut-off', value: a.cutoffMarks });
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

                    {/* Trust line */}
                    <div className="detail-trust-line">
                        <span>Updated: {formatDate(a.updatedAt)}</span>
                        {a.externalLink && (
                            <>
                                <span className="detail-trust-dot" />
                                <span>Source: <a href={a.externalLink} target="_blank" rel="noopener noreferrer">{(() => { try { return new URL(a.externalLink!).hostname; } catch { return 'Official Site'; } })()}</a> (Official)</span>
                            </>
                        )}
                    </div>

                    <div className="detail-hero-meta">
                        {a.organization && (
                            <span className="detail-meta-chip"><span className="detail-meta-icon">🏛️</span> {a.organization}</span>
                        )}
                        {a.location && (
                            <span className="detail-meta-chip"><span className="detail-meta-icon">📍</span> {a.location}</span>
                        )}
                        <span className="detail-meta-chip">
                            <span className="detail-meta-icon">👁️</span> {(a.viewCount ?? 0).toLocaleString()} views
                        </span>
                        {relativeDate && (
                            <span className="detail-meta-chip detail-meta-time"><span className="detail-meta-icon">🕐</span> {relativeDate}</span>
                        )}
                    </div>

                    {/* Hero CTA row (desktop) */}
                    <div className="detail-hero-cta-row">
                        {a.externalLink ? (
                            <a href={a.externalLink} target="_blank" rel="noopener noreferrer" className="detail-hero-cta-primary"
                                onClick={() => trackEvent('cta_click', { type, slug: a.slug, action: 'apply' })}>
                                ✅ {TYPE_CTA[a.type]} <span>↗</span>
                            </a>
                        ) : (
                            <span className="detail-hero-cta-disabled">Link Not Available Yet</span>
                        )}
                        <button type="button" className="detail-hero-cta-secondary" onClick={toggleBookmark}>
                            {bookmarked ? '🔖 Saved' : '🔖 Save'}
                        </button>
                        <button type="button" className="detail-hero-cta-secondary" onClick={handleCopyLink}>
                            {copied ? '✅ Copied!' : '🔗 Share'}
                        </button>
                    </div>

                    {/* Quick Info Grid */}
                    {quickInfoItems.length > 0 && (
                        <div className="detail-quick-grid">
                            {quickInfoItems.map((item, i) => (
                                <div key={i} className={`detail-quick-card${item.highlight ? ' detail-quick-highlight' : ''}`}>
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

                {/* Jump Navigation */}
                {jumpSections.length > 1 && (
                    <nav className="detail-jump-nav">
                        {jumpSections.map((s) => (
                            <a
                                key={s.id}
                                href={`#${s.id}`}
                                className={`detail-jump-link${activeSection === s.id ? ' active' : ''}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    setActiveSection(s.id);
                                }}
                            >
                                {s.icon} {s.label}
                            </a>
                        ))}
                    </nav>
                )}

                {/* Main Body */}
                <div className="detail-body-premium">
                    {/* Content Column */}
                    <div className="detail-main-col">
                        {/* Overview / Info Table */}
                        <section id="overview" className="detail-info-table-section">
                            <h2 className="detail-section-title"><span className="detail-section-icon">📋</span> Quick Overview</h2>
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
                                {a.deadline && (
                                    <div className="detail-info-row">
                                        <span className="detail-info-key">Last Date</span>
                                        <span className={`detail-info-val ${deadlineStatus?.className || ''}`}>{formatDate(a.deadline)}</span>
                                    </div>
                                )}
                                {salary && (
                                    <div className="detail-info-row">
                                        <span className="detail-info-key">Salary</span>
                                        <span className="detail-info-val detail-info-salary">{salary}</span>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Eligibility */}
                        {(a.minQualification || a.ageLimit) && (
                            <section id="eligibility" className="detail-info-table-section">
                                <h2 className="detail-section-title"><span className="detail-section-icon">🎓</span> Eligibility</h2>
                                <div className="detail-info-table">
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
                                </div>
                            </section>
                        )}

                        {/* Fees */}
                        {a.applicationFee && (
                            <section id="fees" className="detail-info-table-section">
                                <h2 className="detail-section-title"><span className="detail-section-icon">💳</span> Application Fee</h2>
                                <div className="detail-info-table">
                                    <div className="detail-info-row">
                                        <span className="detail-info-key">Fee</span>
                                        <span className="detail-info-val">{a.applicationFee}</span>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Important Dates */}
                        {a.importantDates && a.importantDates.length > 0 && (
                            <section id="dates" className="detail-dates-inline">
                                <h2 className="detail-section-title"><span className="detail-section-icon">📅</span> Important Dates</h2>
                                <div className="detail-dates-timeline">
                                    {a.importantDates.map((date, i) => (
                                        <div key={date.id ?? i} className="detail-date-row">
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
                            <section id="details" className="detail-content-section">
                                <h2 className="detail-section-title"><span className="detail-section-icon">📝</span> Full Details</h2>
                                <div className="detail-content-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(a.content) }} />
                            </section>
                        )}

                        {/* Important Links */}
                        {a.externalLink && (
                            <section id="links" className="detail-info-table-section">
                                <h2 className="detail-section-title"><span className="detail-section-icon">🔗</span> Important Links</h2>
                                <div className="detail-links-grid">
                                    <a href={a.externalLink} target="_blank" rel="noopener noreferrer" className="detail-link-btn detail-link-btn-primary"
                                        onClick={() => trackEvent('link_click', { type, slug: a.slug, action: 'apply' })}>
                                        <span className="detail-link-btn-icon">✅</span> {TYPE_CTA[a.type]}
                                    </a>
                                    <a href={a.externalLink} target="_blank" rel="noopener noreferrer" className="detail-link-btn">
                                        <span className="detail-link-btn-icon">📄</span> Download Notification
                                    </a>
                                    <a href={a.externalLink} target="_blank" rel="noopener noreferrer" className="detail-link-btn">
                                        <span className="detail-link-btn-icon">🌐</span> Official Website
                                    </a>
                                    <Link to={TYPE_ROUTES[type]} className="detail-link-btn">
                                        <span className="detail-link-btn-icon">📂</span> More {TYPE_LABELS[type]}
                                    </Link>
                                </div>
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

                        {/* Trust + Transparency */}
                        <div className="detail-trust-section">
                            <div className="detail-trust-disclaimer">
                                <span className="detail-trust-disclaimer-icon">🛡️</span>
                                <span>We do not collect application fees. Always apply on the official website. Information is sourced from official notifications and may change — verify on the official site before applying.</span>
                            </div>
                            <div className="detail-trust-actions">
                                <button type="button" className="detail-report-btn" onClick={() => trackEvent('report_issue', { slug: a.slug })}>
                                    🚩 Report Wrong Info
                                </button>
                                <button type="button" className="detail-report-btn" onClick={handleCopyLink}>
                                    🔗 {copied ? 'Copied!' : 'Share This Page'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <aside className="detail-sidebar-premium">
                        {/* Key Facts Box */}
                        <div className="detail-facts-card">
                            <div className="detail-facts-header">
                                <h3>📋 Key Facts</h3>
                            </div>
                            <div className="detail-facts-body">
                                {/* Status badge */}
                                <div className="detail-facts-row">
                                    <span className="detail-facts-key">Status</span>
                                    <span className={`detail-facts-status ${statusBadge.cls}`}>
                                        {statusBadge.label === 'Open' ? '🟢' : '🔴'} {statusBadge.label}
                                    </span>
                                </div>
                                {keyFacts.map((fact, i) => (
                                    <div key={i} className="detail-facts-row">
                                        <span className="detail-facts-key">{fact.label}</span>
                                        {fact.isLink && fact.href ? (
                                            <a href={fact.href} target="_blank" rel="noopener noreferrer" className="detail-facts-link">{fact.value}</a>
                                        ) : (
                                            <span className="detail-facts-val">{fact.value}</span>
                                        )}
                                    </div>
                                ))}
                                {a.updatedAt && (
                                    <div className="detail-facts-row">
                                        <span className="detail-facts-key">Updated</span>
                                        <span className="detail-facts-val">{formatDate(a.updatedAt)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CTA Card */}
                        <div className="detail-cta-card" style={{ '--detail-accent': typeColor } as React.CSSProperties}>
                            {a.externalLink ? (
                                <a href={a.externalLink} target="_blank" rel="noopener noreferrer" className="detail-cta-btn detail-cta-primary"
                                    onClick={() => trackEvent('cta_click', { type, slug: a.slug, action: 'apply' })}>
                                    <span>{TYPE_CTA[a.type]}</span>
                                    <span className="detail-cta-arrow">↗</span>
                                </a>
                            ) : (
                                <button type="button" className="detail-cta-btn detail-cta-disabled" disabled>Link Not Available Yet</button>
                            )}
                            <Link to={TYPE_ROUTES[type]} className="detail-cta-btn detail-cta-secondary">
                                More {TYPE_LABELS[type]} →
                            </Link>
                        </div>

                        {/* Important Dates (sidebar desktop) */}
                        {a.importantDates && a.importantDates.length > 0 && (
                            <div className="detail-sidebar-card detail-sidebar-dates">
                                <h3>📅 Important Dates</h3>
                                <ul className="detail-sidebar-dates-list">
                                    {a.importantDates.map((date, i) => (
                                        <li key={date.id ?? i}>
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
                                <a href={`https://wa.me/?text=${encodeURIComponent(a.title + ' - ' + window.location.href)}`}
                                    target="_blank" rel="noreferrer" className="detail-share-btn detail-share-whatsapp">
                                    💬 WhatsApp
                                </a>
                                <a href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(a.title)}`}
                                    target="_blank" rel="noreferrer" className="detail-share-btn detail-share-telegram">
                                    ✈️ Telegram
                                </a>
                                <button type="button" className="detail-share-btn detail-share-copy" onClick={handleCopyLink}>
                                    🔗 {copied ? 'Copied!' : 'Copy Link'}
                                </button>
                            </div>
                        </div>

                        {/* Tags sidebar */}
                        {a.tags && a.tags.length > 0 && (
                            <div className="detail-sidebar-card">
                                <h3>🏷️ Tags</h3>
                                <div className="detail-sidebar-tags">
                                    {a.tags.map((tag) => (<span key={tag.id} className="detail-tag">{tag.name}</span>))}
                                </div>
                            </div>
                        )}
                    </aside>
                </div>

                {/* Related (up to 6) */}
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

            {/* Sticky mobile CTA bar */}
            <div className="detail-sticky-cta">
                {a.externalLink ? (
                    <a href={a.externalLink} target="_blank" rel="noopener noreferrer" className="detail-sticky-primary"
                        onClick={() => trackEvent('sticky_cta_click', { type, slug: a.slug })}>
                        ✅ {TYPE_CTA[a.type]}
                    </a>
                ) : (
                    <span className="detail-sticky-primary" style={{ opacity: 0.5, pointerEvents: 'none' }}>
                        Link Not Available
                    </span>
                )}
                <button type="button" className={`detail-sticky-secondary${bookmarked ? ' bookmarked' : ''}`} onClick={toggleBookmark} title="Save">
                    {bookmarked ? '🔖' : '📑'}
                </button>
                <button type="button" className="detail-sticky-secondary" onClick={handleCopyLink} title="Share">
                    {copied ? '✅' : '🔗'}
                </button>
            </div>
        </Layout>
    );
}
