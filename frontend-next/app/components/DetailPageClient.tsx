'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { AnnouncementCard } from '@/app/components/AnnouncementCard';
import { getAnnouncementBySlug, getAnnouncementCards, addBookmark, removeBookmark, getBookmarks } from '@/app/lib/api';
import { trackEvent } from '@/app/lib/analytics';
import type { Announcement, AnnouncementCard as CardType, ContentType } from '@/app/lib/types';
import '@/app/components/HomePage.css';
import '@/app/components/DetailPage.css';

/* ── JobDetails sub-types ── */
interface JDImportantDate { name: string; date: string }
interface JDApplicationFee { category: string; amount: number }
interface JDAgeRelaxation { category: string; years: number; maxAge: number }
interface JDVacancyDetail { category: string; male: number; female: number; total: number }
interface JDExamSubject { name: string; questions: number; marks: number }
interface JDSelectionStep { step: number; name: string; description: string }
interface JDImportantLink { label: string; url: string; type: 'primary' | 'secondary' }
interface JDFAQ { question: string; answer: string }

interface JobDetailsData {
    importantDates?: JDImportantDate[];
    applicationFees?: JDApplicationFee[];
    ageLimits?: { minAge: number; maxAge: number; asOnDate: string; relaxations: JDAgeRelaxation[] };
    vacancies?: { total: number; details: JDVacancyDetail[] };
    eligibility?: { nationality: string; domicile: string; education: string; additional: string[] };
    salary?: { payLevel: string; payScale: string; inHandSalary: string };
    physicalRequirements?: {
        male: { heightGeneral: string; heightSCST: string; chestNormal: string; chestExpanded: string; running: string };
        female: { heightGeneral: string; heightSCST: string; running: string };
    };
    examPattern?: { totalQuestions: number; totalMarks: number; duration: string; negativeMarking: string; subjects: JDExamSubject[] };
    selectionProcess?: JDSelectionStep[];
    howToApply?: string[];
    importantLinks?: JDImportantLink[];
    faqs?: JDFAQ[];
}

const TYPE_LABELS: Record<ContentType, string> = {
    job: 'Latest Jobs', result: 'Results', 'admit-card': 'Admit Cards',
    'answer-key': 'Answer Keys', admission: 'Admissions', syllabus: 'Syllabus',
};
const TYPE_ICONS: Record<ContentType, string> = {
    job: '💼', result: '📊', 'admit-card': '🎫',
    'answer-key': '🔑', admission: '🎓', syllabus: '📚',
};
const TYPE_ROUTES: Record<ContentType, string> = {
    job: '/jobs', result: '/results', 'admit-card': '/admit-card',
    'answer-key': '/answer-key', admission: '/admission', syllabus: '/syllabus',
};
const TYPE_CTA: Record<ContentType, string> = {
    job: 'Apply Online', result: 'Check Result', 'admit-card': 'Download Admit Card',
    'answer-key': 'Download Answer Key', admission: 'Apply Now', syllabus: 'View Syllabus',
};
const TYPE_SUMMARIES: Record<ContentType, string> = {
    job: 'Official recruitment summary, eligibility, deadlines, and apply links collected into one clean briefing.',
    result: 'Result release details, official links, and the key exam summary are grouped into one readable page.',
    'admit-card': 'Exam access details, admit card links, and supporting instructions stay visible in one structured layout.',
    'answer-key': 'Answer key links, objection windows, and the main exam context are organized into one focused page.',
    admission: 'Admission notice, course details, deadlines, and application links are grouped into one reliable reference.',
    syllabus: 'Syllabus, exam pattern, and useful supporting details are arranged into one quick reading surface.',
};
const CATEGORY_LINKS: Array<{ type: ContentType; label: string; icon: string; href: string }> = [
    { type: 'job', label: 'Latest Jobs', icon: '💼', href: '/jobs' },
    { type: 'result', label: 'Results', icon: '📊', href: '/results' },
    { type: 'admit-card', label: 'Admit Cards', icon: '🎫', href: '/admit-card' },
    { type: 'answer-key', label: 'Answer Keys', icon: '🔑', href: '/answer-key' },
    { type: 'syllabus', label: 'Syllabus', icon: '📚', href: '/syllabus' },
    { type: 'admission', label: 'Admissions', icon: '🎓', href: '/admission' },
];

/* ── Helpers ── */
function formatDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    try { return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return '—'; }
}

function formatSalary(min?: number, max?: number): string | null {
    if (!min && !max) return null;
    if (min && max) return `₹${min.toLocaleString('en-IN')} – ₹${max.toLocaleString('en-IN')}`;
    if (min) return `₹${min.toLocaleString('en-IN')}+`;
    return `Up to ₹${max!.toLocaleString('en-IN')}`;
}

function getDeadlineStatus(deadline?: string | null): { label: string; cls: string } | null {
    if (!deadline) return null;
    const d = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
    if (d < 0) return { label: 'Closed', cls: 'sr-badge-closed' };
    if (d === 0) return { label: '🔥 Last Day!', cls: 'sr-badge-urgent' };
    if (d <= 3) return { label: `🔥 ${d} Days Left`, cls: 'sr-badge-urgent' };
    if (d <= 7) return { label: `⏰ ${d} Days Left`, cls: 'sr-badge-soon' };
    return { label: '🟢 Open', cls: 'sr-badge-open' };
}

/* ── Jump-linked sections for scroll-nav ── */
interface SectionDef { id: string; label: string }
function buildSections(a: Announcement, jd?: JobDetailsData): SectionDef[] {
    const s: SectionDef[] = [];
    s.push({ id: 'overview', label: 'Overview' });
    if (jd?.importantDates?.length || (a.importantDates && a.importantDates.length > 0)) s.push({ id: 'dates', label: 'Important Dates' });
    if (jd?.applicationFees?.length || a.applicationFee) s.push({ id: 'fees', label: 'Application Fee' });
    if (jd?.ageLimits || a.ageLimit) s.push({ id: 'age', label: 'Age Limit' });
    if (jd?.eligibility || a.minQualification) s.push({ id: 'eligibility', label: 'Eligibility' });
    if (jd?.vacancies?.details?.length) s.push({ id: 'vacancy', label: 'Vacancy Details' });
    if (jd?.salary?.payLevel || jd?.salary?.payScale) s.push({ id: 'salary', label: 'Salary' });
    if (jd?.physicalRequirements) s.push({ id: 'physical', label: 'Physical Eligibility' });
    if (jd?.examPattern?.subjects?.length) s.push({ id: 'exam', label: 'Exam Pattern' });
    if (jd?.selectionProcess?.length) s.push({ id: 'selection', label: 'Selection Process' });
    if (jd?.howToApply?.length) s.push({ id: 'howtoapply', label: 'How to Apply' });
    if (a.content) s.push({ id: 'content', label: 'Full Details' });
    if (jd?.faqs?.length) s.push({ id: 'faq', label: 'FAQs' });
    s.push({ id: 'links', label: 'Important Links' });
    return s;
}

/* ═══════════════════════════════════════════════════════════
   DetailPage Component — SarkariResult-style single-column
   ═══════════════════════════════════════════════════════════ */
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
        setLoading(true); setError(null);
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
                try {
                    const bm = await getBookmarks();
                    if (mounted && Array.isArray(bm.data) && bm.data.some((b) => b.id === res.data.id)) setBookmarked(true);
                } catch { /* not logged in */ }
            } catch (err: unknown) {
                if (mounted) setError(err instanceof Error ? err.message : 'Failed to load announcement');
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [type, slug]);

    /* Intersection observer for scroll-spy */
    useEffect(() => {
        if (!announcement) return;
        const jd = announcement.jobDetails as JobDetailsData | undefined;
        const ids = buildSections(announcement, jd).map((s) => s.id);
        const observer = new IntersectionObserver(
            (entries) => { for (const e of entries) { if (e.isIntersecting) { setActiveSection(e.target.id); break; } } },
            { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 },
        );
        for (const id of ids) { const el = document.getElementById(id); if (el) observer.observe(el); }
        return () => observer.disconnect();
    }, [announcement]);

    const toggleBookmark = useCallback(async () => {
        if (!announcement) return;
        try {
            if (bookmarked) { await removeBookmark(announcement.id); setBookmarked(false); trackEvent('bookmark_remove', { slug: announcement.slug }); }
            else { await addBookmark(announcement.id); setBookmarked(true); trackEvent('bookmark_add', { slug: announcement.slug }); }
        } catch { /* not logged in */ }
    }, [announcement, bookmarked]);

    const handleCopyLink = useCallback(async () => {
        try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /**/ }
    }, []);

    const handlePrint = useCallback(() => {
        window.print(); trackEvent('print_page', { slug: announcement?.slug ?? '' });
    }, [announcement]);

    /* ── Loading skeleton ── */
    if (loading) {
        return (
            <>
                <div className="sr-detail-skeleton animate-fade-in">
                    <div className="skeleton" style={{ height: 14, width: 200, marginBottom: 16 }} />
                    <div className="skeleton" style={{ height: 28, width: '80%', marginBottom: 12 }} />
                    <div className="skeleton" style={{ height: 16, width: '50%', marginBottom: 24 }} />
                    <div className="sr-skeleton-grid">
                        {[1, 2, 3, 4].map(i => (<div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />))}
                    </div>
                    {[1, 2, 3].map(i => (<div key={i} className="skeleton" style={{ height: 120, borderRadius: 12, marginTop: 16 }} />))}
                </div>
            </>
        );
    }

    /* ── Error ── */
    if (error || !announcement) {
        return (
            <>
                <div className="sr-detail-error animate-fade-in">
                    <div className="sr-error-icon">😕</div>
                    <h2>Announcement Not Found</h2>
                    <p>{error || 'This announcement may have been removed or is no longer available.'}</p>
                    <div className="sr-error-actions">
                        <Link href={TYPE_ROUTES[type]} className="btn btn-accent">← Browse {TYPE_LABELS[type]}</Link>
                        <Link href="/" className="btn btn-outline">Go Home</Link>
                    </div>
                </div>
            </>
        );
    }

    const a = announcement;
    const jd = a.jobDetails as JobDetailsData | undefined;
    const salary = formatSalary(a.salaryMin, a.salaryMax);
    const deadline = getDeadlineStatus(a.deadline);
    const isClosed = deadline?.cls === 'sr-badge-closed';
    const sections = buildSections(a, jd);

    /* Countdown days for deadline stat */
    const daysLeft = a.deadline ? Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86_400_000) : null;
    const deadlineStatCls = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 ? 'sr-stat-deadline-urgent' : 'sr-stat-deadline';

    /* Stale data warning: > 30 days since last update */
    const daysSinceUpdate = Math.floor((Date.now() - new Date(a.updatedAt).getTime()) / 86_400_000);
    const isStale = daysSinceUpdate > 30;

    /* Filter related: hide expired, prioritize open listings */
    const openRelated = related.filter((card) => !card.deadline || new Date(card.deadline).getTime() > Date.now());
    const expiredRelated = related.filter((card) => card.deadline && new Date(card.deadline).getTime() <= Date.now());
    const filteredRelated = [...openRelated, ...expiredRelated].slice(0, 6);

    const toNum = (v: unknown) => { const n = typeof v === 'number' ? v : Number(v); return Number.isFinite(n) ? n : 0; };
    const fmtCount = (v?: number | null) => toNum(v).toLocaleString('en-IN');
    const heroSummary = [
        TYPE_SUMMARIES[a.type],
        a.organization ? `${a.organization} notification.` : '',
        a.location ? `Relevant for ${a.location}.` : '',
    ].filter(Boolean).join(' ');
    const postedLabel = formatDate(a.postedAt);
    const updatedLabel = formatDate(a.updatedAt);

    return (
        <>
            <div className="hp sr-home animate-fade-in">
            <article className="sr-detail" data-testid="detail-page" data-detail-type={type}>
                {/* ─── Breadcrumb ─── */}
                <nav className="sr-breadcrumb">
                    <Link href="/">Home</Link>
                    <span className="sr-bc-sep">›</span>
                    <Link href={TYPE_ROUTES[type]}>{TYPE_LABELS[type]}</Link>
                    <span className="sr-bc-sep">›</span>
                    <span className="sr-bc-current">{a.title}</span>
                </nav>

                <nav className="hp-cats sr-category-rail" aria-label="Browse public categories">
                    {CATEGORY_LINKS.map((category) => (
                        <Link
                            key={category.type}
                            href={category.href}
                            className={`hp-cat-card sr-category-card${category.type === type ? ' is-active' : ''}`}
                        >
                            <span className="hp-cat-icon">{category.icon}</span>
                            <span className="hp-cat-label">{category.label}</span>
                        </Link>
                    ))}
                </nav>

                {/* ─── Stale/Expired Warnings ─── */}
                {isClosed && (
                    <div className="sr-expired-banner">
                        ⚠️ This listing has <strong>expired</strong>. The deadline has passed and applications are no longer being accepted.
                    </div>
                )}
                {isStale && !isClosed && (
                    <div className="sr-stale-banner">
                        ℹ️ This page was last updated {daysSinceUpdate} days ago. Some information may have changed — please verify on the official website.
                    </div>
                )}

                {/* ─── Hero Header ─── */}
                <header className="sr-hero">
                    <div className="sr-hero-kicker-row">
                        <span className="sr-hero-kicker">{TYPE_ICONS[type]} {TYPE_LABELS[type]}</span>
                        {deadline && (
                            <span className={`sr-hero-status-pill ${deadline.cls}`}>
                                {deadline.label}
                                {daysLeft !== null && daysLeft > 0 && !isClosed ? ` • ${daysLeft}d left` : ''}
                            </span>
                        )}
                    </div>

                    <div className="sr-hero-layout">
                        <div className="sr-hero-primary">
                            <h1 className="sr-title">{a.title}</h1>
                            <p className="sr-hero-summary">{heroSummary}</p>
                            <div className="sr-hero-meta">
                                {a.organization && <span className="sr-hero-meta-chip">🏛 {a.organization}</span>}
                                {a.location && <span className="sr-hero-meta-chip">📍 {a.location}</span>}
                                <span className="sr-hero-meta-chip">🗓 Posted {postedLabel}</span>
                                <span className="sr-hero-meta-chip">🔄 Updated {updatedLabel}</span>
                                {a.viewCount != null && a.viewCount > 0 && (
                                    <span className="sr-hero-meta-chip">👁 {a.viewCount.toLocaleString('en-IN')} views</span>
                                )}
                            </div>
                        </div>

                        <div className="sr-hero-aside">
                            <div className="sr-stats-grid">
                                {a.totalPosts != null && a.totalPosts > 0 && (
                                    <div className="sr-stat-card sr-stat-vacancy">
                                        <span className="sr-stat-label">Total Posts</span>
                                        <strong className="sr-stat-value">{a.totalPosts.toLocaleString('en-IN')}</strong>
                                    </div>
                                )}
                                {a.deadline && (
                                    <div className={`sr-stat-card ${deadlineStatCls}`}>
                                        <span className="sr-stat-label">Last Date</span>
                                        <strong className="sr-stat-value">{formatDate(a.deadline)}</strong>
                                        {daysLeft !== null && daysLeft >= 0 && !isClosed && (
                                            <span className="sr-stat-countdown">{daysLeft === 0 ? 'Today!' : `${daysLeft} days left`}</span>
                                        )}
                                        {isClosed && <span className="sr-stat-countdown sr-stat-expired">Expired</span>}
                                    </div>
                                )}
                                {a.minQualification && (
                                    <div className="sr-stat-card sr-stat-qual">
                                        <span className="sr-stat-label">Qualification</span>
                                        <strong className="sr-stat-value">{a.minQualification}</strong>
                                    </div>
                                )}
                                {salary && (
                                    <div className="sr-stat-card sr-stat-salary">
                                        <span className="sr-stat-label">Salary</span>
                                        <strong className="sr-stat-value">{salary}</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="sr-action-bar hide-on-print">
                        {isClosed ? (
                            <span className="sr-btn-closed">❌ Application Closed</span>
                        ) : a.externalLink ? (
                            <a href={a.externalLink} target="_blank" rel="noopener noreferrer" className="sr-btn-primary"
                                onClick={() => trackEvent('cta_click', { type, slug: a.slug, action: 'apply' })}>
                                ✅ {TYPE_CTA[a.type]}
                            </a>
                        ) : (
                            <span className="sr-btn-disabled">Link Not Available Yet</span>
                        )}
                        <button type="button" className={`sr-btn-icon${bookmarked ? ' active' : ''}`} onClick={toggleBookmark} title={bookmarked ? "Saved" : "Save"}>
                            {bookmarked ? '🔖' : '📑'}
                        </button>
                        <button type="button" className="sr-btn-icon hide-mobile" onClick={handlePrint} title="Print">🖨️</button>
                        <button type="button" className="sr-btn-icon" onClick={handleCopyLink} title="Share">
                            {copied ? '✅' : '🔗'}
                        </button>
                    </div>
                </header>

                {/* ─── Sticky Section Nav ─── */}
                {sections.length > 1 && (
                    <nav className="sr-section-nav">
                        {sections.map((s) => (
                            <a key={s.id} href={`#${s.id}`}
                                className={`sr-nav-link${activeSection === s.id ? ' active' : ''}`}
                                onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActiveSection(s.id); }}>
                                {s.label}
                            </a>
                        ))}
                    </nav>
                )}

                {/* ═══ CONTENT SECTIONS ═══ */}
                <div className="sr-sections">

                    {/* ─── 1. Overview ─── */}
                    <section id="overview" className="sr-section sr-section-blue">
                        <h2 className="sr-section-title">📋 Quick Overview</h2>
                        <div className="sr-info-table">
                            {a.organization && <div className="sr-info-row"><span className="sr-info-key">Organization</span><span className="sr-info-val">{a.organization}</span></div>}
                            <div className="sr-info-row"><span className="sr-info-key">Post Name</span><span className="sr-info-val">{a.title}</span></div>
                            {a.totalPosts != null && a.totalPosts > 0 && <div className="sr-info-row"><span className="sr-info-key">Total Posts</span><span className="sr-info-val sr-highlight">{a.totalPosts.toLocaleString('en-IN')}</span></div>}
                            {a.deadline && <div className="sr-info-row"><span className="sr-info-key">Last Date</span><span className="sr-info-val sr-highlight-red">{formatDate(a.deadline)}</span></div>}
                            {salary && <div className="sr-info-row"><span className="sr-info-key">Salary</span><span className="sr-info-val sr-highlight-green">{salary}</span></div>}
                            {a.minQualification && <div className="sr-info-row"><span className="sr-info-key">Qualification</span><span className="sr-info-val">{a.minQualification}</span></div>}
                            {a.ageLimit && <div className="sr-info-row"><span className="sr-info-key">Age Limit</span><span className="sr-info-val">{a.ageLimit}</span></div>}
                            {a.applicationFee && <div className="sr-info-row"><span className="sr-info-key">Application Fee</span><span className="sr-info-val">{a.applicationFee}</span></div>}
                            {a.location && <div className="sr-info-row"><span className="sr-info-key">Location</span><span className="sr-info-val">{a.location}</span></div>}
                            {a.externalLink && (
                                <div className="sr-info-row">
                                    <span className="sr-info-key">Official Website</span>
                                    <a href={a.externalLink} target="_blank" rel="noopener noreferrer" className="sr-info-val sr-info-link">
                                        {(() => { try { return new URL(a.externalLink!).hostname; } catch { return 'Visit →'; } })()}
                                    </a>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ─── 2. Important Dates ─── */}
                    {((jd?.importantDates && jd.importantDates.length > 0) || (a.importantDates && a.importantDates.length > 0)) && (
                        <section id="dates" className="sr-section sr-section-purple">
                            <h2 className="sr-section-title">📅 Important Dates</h2>
                            <div className="sr-info-table">
                                {jd?.importantDates && jd.importantDates.length > 0
                                    ? jd.importantDates.map((d, i) => (
                                        <div key={i} className="sr-info-row">
                                            <span className="sr-info-key">{d.name}</span>
                                            <span className="sr-info-val sr-date-val">{formatDate(d.date)}</span>
                                        </div>
                                    ))
                                    : a.importantDates!.map((d, i) => (
                                        <div key={d.id ?? i} className="sr-info-row">
                                            <span className="sr-info-key">{d.eventName}</span>
                                            <span className="sr-info-val sr-date-val">{formatDate(d.eventDate)}</span>
                                        </div>
                                    ))
                                }
                            </div>
                        </section>
                    )}

                    {/* ─── 3. Application Fee ─── */}
                    {((jd?.applicationFees && jd.applicationFees.length > 0) || a.applicationFee) && (
                        <section id="fees" className="sr-section sr-section-green">
                            <h2 className="sr-section-title">💰 Application Fee</h2>
                            {jd?.applicationFees && jd.applicationFees.length > 0 ? (
                                <div className="sr-info-table">
                                    {jd.applicationFees.map((f, i) => (
                                        <div key={i} className="sr-info-row">
                                            <span className="sr-info-key">{f.category}</span>
                                            <span className="sr-info-val sr-fee-val">₹{f.amount.toLocaleString('en-IN')}/-</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="sr-info-table">
                                    <div className="sr-info-row">
                                        <span className="sr-info-key">Fee</span>
                                        <span className="sr-info-val">{a.applicationFee}</span>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {/* ─── 4. Age Limit ─── */}
                    {(jd?.ageLimits || a.ageLimit) && (
                        <section id="age" className="sr-section sr-section-cyan">
                            <h2 className="sr-section-title">👤 Age Limit</h2>
                            {jd?.ageLimits ? (
                                <>
                                    <div className="sr-age-boxes">
                                        <div className="sr-age-box">
                                            <span className="sr-age-label">Minimum Age</span>
                                            <strong className="sr-age-value">{jd.ageLimits.minAge || 18} Years</strong>
                                        </div>
                                        <div className="sr-age-box">
                                            <span className="sr-age-label">Maximum Age</span>
                                            <strong className="sr-age-value">{jd.ageLimits.maxAge || 30} Years</strong>
                                        </div>
                                    </div>
                                    {jd.ageLimits.asOnDate && <p className="sr-age-ason">As on {formatDate(jd.ageLimits.asOnDate)}</p>}
                                    <p className="sr-age-note">Age Relaxation Extra as per Rules</p>
                                    {jd.ageLimits.relaxations && jd.ageLimits.relaxations.length > 0 && (
                                        <div className="sr-table-wrap">
                                            <table className="sr-data-table">
                                                <thead><tr><th>Category</th><th>Relaxation</th><th>Max Age</th></tr></thead>
                                                <tbody>
                                                    {jd.ageLimits.relaxations.map((r, i) => (
                                                        <tr key={i}><td>{r.category}</td><td>{r.years} Years</td><td>{r.maxAge} Years</td></tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="sr-info-table">
                                    <div className="sr-info-row">
                                        <span className="sr-info-key">Age Limit</span>
                                        <span className="sr-info-val">{a.ageLimit}</span>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {/* ─── 5. Eligibility ─── */}
                    {(jd?.eligibility || a.minQualification) && (
                        <section id="eligibility" className="sr-section sr-section-indigo">
                            <h2 className="sr-section-title">📚 Eligibility Criteria</h2>
                            {jd?.eligibility ? (
                                <ul className="sr-eligibility-list">
                                    {jd.eligibility.nationality && <li><strong>Nationality:</strong> {jd.eligibility.nationality}</li>}
                                    {jd.eligibility.domicile && <li><strong>Domicile:</strong> {jd.eligibility.domicile}</li>}
                                    {jd.eligibility.education && <li><strong>Education:</strong> {jd.eligibility.education}</li>}
                                    {jd.eligibility.additional?.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            ) : (
                                <div className="sr-info-table">
                                    <div className="sr-info-row">
                                        <span className="sr-info-key">Qualification</span>
                                        <span className="sr-info-val">{a.minQualification}</span>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {/* ─── 6. Vacancy Details ─── */}
                    {jd?.vacancies?.details && jd.vacancies.details.length > 0 && (
                        <section id="vacancy" className="sr-section sr-section-amber">
                            <h2 className="sr-section-title">📊 Vacancy Details — Total: {fmtCount(jd.vacancies.total)} Posts</h2>
                            <div className="sr-table-wrap">
                                <table className="sr-data-table sr-vacancy-table">
                                    <thead><tr><th>Category</th><th>Male</th><th>Female</th><th>Total</th></tr></thead>
                                    <tbody>
                                        {jd.vacancies.details.map((v, i) => (
                                            <tr key={i}><td>{v.category}</td><td>{fmtCount(v.male)}</td><td>{fmtCount(v.female)}</td><td className="sr-total-cell">{fmtCount(v.total)}</td></tr>
                                        ))}
                                        <tr className="sr-total-row">
                                            <td><strong>Total</strong></td>
                                            <td><strong>{fmtCount(jd.vacancies.details.reduce((s, v) => s + toNum(v.male), 0))}</strong></td>
                                            <td><strong>{fmtCount(jd.vacancies.details.reduce((s, v) => s + toNum(v.female), 0))}</strong></td>
                                            <td className="sr-total-cell"><strong>{fmtCount(jd.vacancies.total)}</strong></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* ─── 7. Salary Details ─── */}
                    {jd?.salary && (jd.salary.payLevel || jd.salary.payScale) && (
                        <section id="salary" className="sr-section sr-section-emerald">
                            <h2 className="sr-section-title">💵 Salary Details</h2>
                            <div className="sr-salary-cards">
                                {jd.salary.payLevel && <div className="sr-salary-card"><span className="sr-salary-label">Pay Level</span><strong>{jd.salary.payLevel}</strong></div>}
                                {jd.salary.payScale && <div className="sr-salary-card"><span className="sr-salary-label">Pay Scale</span><strong>{jd.salary.payScale}</strong></div>}
                                {jd.salary.inHandSalary && <div className="sr-salary-card sr-salary-highlight"><span className="sr-salary-label">In-Hand Salary</span><strong>{jd.salary.inHandSalary}</strong></div>}
                            </div>
                        </section>
                    )}

                    {/* ─── 8. Physical Requirements ─── */}
                    {jd?.physicalRequirements && (
                        <section id="physical" className="sr-section sr-section-red">
                            <h2 className="sr-section-title">🏃 Physical Eligibility</h2>
                            <div className="sr-physical-grid">
                                {jd.physicalRequirements.male && (
                                    <div className="sr-physical-card sr-physical-male">
                                        <h3>👨 Male Candidates</h3>
                                        <ul>
                                            {jd.physicalRequirements.male.heightGeneral && <li>Height (General): {jd.physicalRequirements.male.heightGeneral}</li>}
                                            {jd.physicalRequirements.male.heightSCST && <li>Height (SC/ST): {jd.physicalRequirements.male.heightSCST}</li>}
                                            {jd.physicalRequirements.male.chestNormal && <li>Chest (Normal): {jd.physicalRequirements.male.chestNormal}</li>}
                                            {jd.physicalRequirements.male.chestExpanded && <li>Chest (Expanded): {jd.physicalRequirements.male.chestExpanded}</li>}
                                            {jd.physicalRequirements.male.running && <li>Running: {jd.physicalRequirements.male.running}</li>}
                                        </ul>
                                    </div>
                                )}
                                {jd.physicalRequirements.female && (
                                    <div className="sr-physical-card sr-physical-female">
                                        <h3>👩 Female Candidates</h3>
                                        <ul>
                                            {jd.physicalRequirements.female.heightGeneral && <li>Height (General): {jd.physicalRequirements.female.heightGeneral}</li>}
                                            {jd.physicalRequirements.female.heightSCST && <li>Height (SC/ST): {jd.physicalRequirements.female.heightSCST}</li>}
                                            {jd.physicalRequirements.female.running && <li>Running: {jd.physicalRequirements.female.running}</li>}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* ─── 9. Exam Pattern ─── */}
                    {jd?.examPattern?.subjects && jd.examPattern.subjects.length > 0 && (
                        <section id="exam" className="sr-section sr-section-pink">
                            <h2 className="sr-section-title">📝 Exam Pattern</h2>
                            <div className="sr-exam-meta">
                                {jd.examPattern.duration && <span>⏱️ Duration: {jd.examPattern.duration}</span>}
                                {jd.examPattern.totalQuestions > 0 && <span>📋 Questions: {jd.examPattern.totalQuestions}</span>}
                                {jd.examPattern.totalMarks > 0 && <span>📊 Total Marks: {jd.examPattern.totalMarks}</span>}
                                {jd.examPattern.negativeMarking && <span>⚠️ Negative Marking: {jd.examPattern.negativeMarking}</span>}
                            </div>
                            <div className="sr-table-wrap">
                                <table className="sr-data-table">
                                    <thead><tr><th>Subject</th><th>Questions</th><th>Marks</th></tr></thead>
                                    <tbody>
                                        {jd.examPattern.subjects.map((s, i) => (
                                            <tr key={i}><td>{s.name}</td><td>{s.questions}</td><td>{s.marks}</td></tr>
                                        ))}
                                        <tr className="sr-total-row">
                                            <td><strong>Total</strong></td>
                                            <td><strong>{jd.examPattern.totalQuestions}</strong></td>
                                            <td><strong>{jd.examPattern.totalMarks}</strong></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* ─── 10. Selection Process ─── */}
                    {jd?.selectionProcess && jd.selectionProcess.length > 0 && (
                        <section id="selection" className="sr-section sr-section-teal">
                            <h2 className="sr-section-title">🎯 Selection Process</h2>
                            <div className="sr-selection-steps">
                                {jd.selectionProcess.map((step, i) => (
                                    <div key={i} className="sr-step">
                                        <div className="sr-step-num">{step.step}</div>
                                        <div className="sr-step-body">
                                            <h4>{step.name}</h4>
                                            {step.description && <p>{step.description}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ─── 11. How to Apply ─── */}
                    {jd?.howToApply && jd.howToApply.length > 0 && (
                        <section id="howtoapply" className="sr-section sr-section-violet">
                            <h2 className="sr-section-title">📝 How to Apply Online?</h2>
                            <ol className="sr-apply-steps">
                                {jd.howToApply.map((step, i) => <li key={i}>{step}</li>)}
                            </ol>
                        </section>
                    )}

                    {/* ─── 12. Full Content (Rich HTML) ─── */}
                    {a.content && (
                        <section id="content" className="sr-section sr-section-blue">
                            <h2 className="sr-section-title">📝 Full Details</h2>
                            <div className="sr-rich-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(a.content) }} />
                        </section>
                    )}

                    {/* ─── 13. FAQs ─── */}
                    {jd?.faqs && jd.faqs.length > 0 && (
                        <section id="faq" className="sr-section sr-section-orange">
                            <h2 className="sr-section-title">❓ Frequently Asked Questions</h2>
                            <div className="sr-faq-list">
                                {jd.faqs.map((faq, i) => (
                                    <details key={i} className="sr-faq-item">
                                        <summary>{faq.question}</summary>
                                        <p>{faq.answer}</p>
                                    </details>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ─── 14. Important Links ─── */}
                    <section id="links" className="sr-section sr-section-blue">
                        <h2 className="sr-section-title">🔗 Important Links</h2>
                        <div className="sr-links-grid">
                            {/* JobDetails links */}
                            {jd?.importantLinks && jd.importantLinks.length > 0 && jd.importantLinks.map((link, i) => (
                                <a key={`jd-${i}`} href={link.url} target="_blank" rel="noopener noreferrer"
                                    className={`sr-link-btn ${link.type === 'primary' ? 'sr-link-primary' : 'sr-link-secondary'}`}
                                    onClick={() => trackEvent('link_click', { type, slug: a.slug, label: link.label })}>
                                    {link.label}
                                </a>
                            ))}
                            {/* Fallback links from announcement fields */}
                            {(!jd?.importantLinks || jd.importantLinks.length === 0) && a.externalLink && (
                                <>
                                    <a href={a.externalLink} target="_blank" rel="noopener noreferrer" className="sr-link-btn sr-link-primary"
                                        onClick={() => trackEvent('cta_click', { type, slug: a.slug, action: 'apply' })}>
                                        ✅ {TYPE_CTA[a.type]}
                                    </a>
                                    <a href={a.externalLink} target="_blank" rel="noopener noreferrer" className="sr-link-btn sr-link-secondary">
                                        📄 Download Notification
                                    </a>
                                    <a href={a.externalLink} target="_blank" rel="noopener noreferrer" className="sr-link-btn sr-link-secondary">
                                        🌐 Official Website
                                    </a>
                                </>
                            )}
                            <Link href={TYPE_ROUTES[type]} className="sr-link-btn sr-link-secondary">
                                📂 More {TYPE_LABELS[type]}
                            </Link>
                        </div>
                    </section>

                    {/* ─── Tags ─── */}
                    {a.tags && a.tags.length > 0 && (
                        <div className="sr-tags">
                            {a.tags.map((tag) => <span key={tag.id} className="sr-tag">{tag.name}</span>)}
                        </div>
                    )}

                    {/* ─── Share & Trust ─── */}
                    <div className="sr-share-trust">
                        <div className="sr-share-row">
                            <span className="sr-share-label">📤 Share:</span>
                            <a href={`https://wa.me/?text=${encodeURIComponent(a.title + ' - ' + window.location.href)}`}
                                target="_blank" rel="noreferrer" className="sr-share-btn sr-share-wa">💬 WhatsApp</a>
                            <a href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(a.title)}`}
                                target="_blank" rel="noreferrer" className="sr-share-btn sr-share-tg">✈️ Telegram</a>
                            <button type="button" className="sr-share-btn sr-share-copy" onClick={handleCopyLink}>
                                🔗 {copied ? 'Copied!' : 'Copy Link'}
                            </button>
                        </div>
                        <div className="sr-disclaimer">
                            <span className="sr-disclaimer-icon">🛡️</span>
                            <span>We do not collect application fees. Always apply on the official website. Information is sourced from official notifications and may change — verify on the official site before applying.</span>
                        </div>
                        <div className="sr-trust-actions hide-on-print">
                            <button type="button" className="sr-report-btn" onClick={() => trackEvent('report_issue', { slug: a.slug })}>
                                🚩 Report Wrong Info
                            </button>
                        </div>
                    </div>
                </div>

                {/* ─── Related ─── */}
                {filteredRelated.length > 0 && (
                    <section className="sr-related">
                        <h2 className="sr-section-title">🔗 Related {TYPE_LABELS[type]}</h2>
                        <div className="sr-related-grid">
                            {filteredRelated.map((card) => <AnnouncementCard key={card.id} card={card} sourceTag="detail_related" />)}
                        </div>
                    </section>
                )}
            </article>
            </div>

            {/* ─── Sticky Mobile CTA ─── */}
            <div className="sr-mobile-cta">
                {isClosed ? (
                    <span className="sr-mobile-closed">❌ Application Closed</span>
                ) : a.externalLink ? (
                    <a href={a.externalLink} target="_blank" rel="noopener noreferrer" className="sr-mobile-primary"
                        onClick={() => trackEvent('sticky_cta_click', { type, slug: a.slug })}>
                        ✅ {TYPE_CTA[a.type]}
                    </a>
                ) : (
                    <span className="sr-mobile-primary" style={{ opacity: 0.5, pointerEvents: 'none' }}>Link Not Available</span>
                )}
                <button type="button" className={`sr-mobile-icon${bookmarked ? ' active' : ''}`} onClick={toggleBookmark}>
                    {bookmarked ? '🔖' : '📑'}
                </button>
                <button type="button" className="sr-mobile-icon" onClick={handleCopyLink}>
                    {copied ? '✅' : '🔗'}
                </button>
            </div>
        </>
    );
}
