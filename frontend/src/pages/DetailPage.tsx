import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { Layout } from '../components/Layout';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { getAnnouncementBySlug, getAnnouncementCards, addBookmark, removeBookmark, getBookmarks } from '../utils/api';
import { trackEvent } from '../utils/analytics';
import type { Announcement, AnnouncementCard as CardType, ContentType } from '../types';
import './DetailPage.css';

/* ── JobDetails sub-types (mirrors admin JobPostingForm) ── */
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
const TYPE_ROUTES: Record<ContentType, string> = {
    job: '/jobs', result: '/results', 'admit-card': '/admit-card',
    'answer-key': '/answer-key', admission: '/admission', syllabus: '/syllabus',
};
const TYPE_CTA: Record<ContentType, string> = {
    job: 'Apply Online', result: 'Check Result', 'admit-card': 'Download Admit Card',
    'answer-key': 'Download Answer Key', admission: 'Apply Now', syllabus: 'View Syllabus',
};

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

/* ── 2026 Custom Hooks ── */
function useScrollSpy(sectionIds: string[], offset = 80) {
    const [activeId, setActiveId] = useState(sectionIds[0] || 'overview');
    useEffect(() => {
        if (!sectionIds.length) return;
        const observer = new IntersectionObserver(
            (entries) => { for (const e of entries) { if (e.isIntersecting) { setActiveId(e.target.id); break; } } },
            { rootMargin: `-${offset}px 0px -60% 0px`, threshold: 0.1 }
        );
        for (const id of sectionIds) { const el = document.getElementById(id); if (el) observer.observe(el); }
        return () => observer.disconnect();
    }, [sectionIds, offset]);
    return activeId;
}

function useReadingProgress() {
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        let frame: number;
        const updateProgress = () => {
            frame = requestAnimationFrame(() => {
                const currentScroll = window.scrollY;
                const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
                if (scrollHeight) setProgress(Number((currentScroll / scrollHeight).toFixed(2)) * 100);
            });
        };
        window.addEventListener('scroll', updateProgress, { passive: true });
        return () => { window.removeEventListener('scroll', updateProgress); cancelAnimationFrame(frame); };
    }, []);
    return progress;
}

function useRevealOnScroll() {
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (e.isIntersecting) {
                    e.target.classList.add('is-visible');
                    observer.unobserve(e.target);
                }
            }
        }, { threshold: 0.05, rootMargin: '0px 0px -50px 0px' });

        setTimeout(() => {
            document.querySelectorAll('.sr-section').forEach((el) => observer.observe(el));
        }, 100);
        return () => observer.disconnect();
    }, []);
}

/* ═══════════════════════════════════════════════════════════
   DetailPage Component — 2026 Edition
   ═══════════════════════════════════════════════════════════ */
export function DetailPage({ type }: { type: ContentType }) {
    const { slug } = useParams<{ slug: string }>();
    const queryClient = useQueryClient();
    const [copied, setCopied] = useState(false);
    const readingProgress = useReadingProgress();
    useRevealOnScroll();

    // ── Local Toast Interactions ── //
    const [localToast, setLocalToast] = useState<{ message: string, id: number } | null>(null);
    const showToast = useCallback((message: string) => {
        setLocalToast({ message, id: Date.now() });
    }, []);
    useEffect(() => {
        if (!localToast) return;
        const timer = setTimeout(() => setLocalToast(null), 3500);
        return () => clearTimeout(timer);
    }, [localToast]);

    // ── Back to Top ── //
    const [showTopBtn, setShowTopBtn] = useState(false);
    useEffect(() => {
        const handler = () => setShowTopBtn(window.scrollY > 450);
        window.addEventListener('scroll', handler, { passive: true });
        return () => window.removeEventListener('scroll', handler);
    }, []);

    /* ── Automatic Caching & Data Fetching (TanStack Query) ── */
    const { data: announcement, isPending: loading, isError, error } = useQuery({
        queryKey: ['announcement', type, slug],
        queryFn: async () => {
            const res = await getAnnouncementBySlug(type, slug!);
            trackEvent('detail_view', { type, slug: slug! });
            return res.data;
        },
        enabled: !!slug,
        staleTime: 5 * 60 * 1000, // Cache for 5 mins
    });

    /* Parallel fetch for related content */
    const { data: related = [] } = useQuery({
        queryKey: ['related', type],
        queryFn: async () => {
            const res = await getAnnouncementCards({ type, limit: 8, sort: 'newest' });
            return res.data;
        },
        staleTime: 10 * 60 * 1000,
    });

    /* User Bookmarks (with optimistic UI updates) */
    const { data: bookmarks = [] } = useQuery({
        queryKey: ['bookmarks'],
        queryFn: async () => (await getBookmarks()).data,
        retry: false, // Don't retry if user is anonymous
    });

    const isBookmarked = useMemo(() =>
        Array.isArray(bookmarks) && announcement ? bookmarks.some((b) => b.id === announcement.id) : false,
        [bookmarks, announcement]);

    const toggleBookmark = useMutation({
        mutationFn: async () => {
            if (!announcement) throw new Error("No announcement");
            if (isBookmarked) await removeBookmark(announcement.id);
            else await addBookmark(announcement.id);
        },
        onMutate: async () => {
            // Optimistic UI update (Instant feedback, 2026 UX standard)
            await queryClient.cancelQueries({ queryKey: ['bookmarks'] });
            const prev = queryClient.getQueryData(['bookmarks']);
            trackEvent(isBookmarked ? 'bookmark_remove' : 'bookmark_add', { slug: announcement?.slug ?? '' });
            showToast(isBookmarked ? 'Removed from saved jobs.' : 'Saved to your bookmarks! 📑');

            queryClient.setQueryData(['bookmarks'], (old: CardType[] | undefined) => {
                if (!Array.isArray(old)) return old;
                if (isBookmarked) return old.filter((b) => b.id !== announcement?.id);
                return [...old, { id: announcement?.id }];
            });
            return { prev };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['bookmarks'], context?.prev); // Rollback on failure
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
        }
    });

    /* Scroll to top on slug change */
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [slug]);

    /* ── Document Title & Hash Scroll Sync ── */
    useEffect(() => {
        if (announcement) {
            document.title = `${announcement.title} | SarkariExams.me`;

            // If URL has a hash (e.g. #dates), scroll to it after data loads
            if (window.location.hash) {
                const el = document.getElementById(window.location.hash.slice(1));
                if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
            }
        }
    }, [announcement]);

    /* ── JSON-LD Schema for Google Jobs SEO ── */
    const jsonLdSchema = useMemo(() => {
        if (!announcement || type !== 'job') return null;
        const jobDetails = announcement.jobDetails as JobDetailsData | undefined;
        return JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "JobPosting",
            "title": announcement.title,
            "description": announcement.content ? DOMPurify.sanitize(announcement.content, { ALLOWED_TAGS: [] }) : `Recruitment details for ${announcement.title}`,
            "datePosted": announcement.postedAt,
            "validThrough": announcement.deadline || undefined,
            "employmentType": "FULL_TIME",
            "hiringOrganization": {
                "@type": "Organization",
                "name": announcement.organization || "Government Organization",
                "sameAs": announcement.externalLink || "https://sarkariexams.me"
            },
            "jobLocation": {
                "@type": "Place",
                "address": {
                    "@type": "PostalAddress",
                    "addressCountry": "IN",
                    "addressRegion": announcement.location || "India"
                }
            },
            "baseSalary": jobDetails?.salary?.payScale ? {
                "@type": "MonetaryAmount",
                "currency": "INR",
                "value": { "@type": "QuantitativeValue", "value": jobDetails.salary.payScale, "unitText": "MONTH" }
            } : undefined
        });
    }, [announcement, type]);

    const handleCopyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            showToast('Link copied to clipboard! 🔗');
            setTimeout(() => setCopied(false), 2000);
        } catch { /**/ }
    }, [showToast]);

    const handlePrint = useCallback(() => {
        window.print(); trackEvent('print_page', { slug: announcement?.slug ?? '' });
    }, [announcement]);

    const sections = useMemo(() => {
        if (!announcement) return [];
        return buildSections(announcement, announcement.jobDetails as JobDetailsData | undefined);
    }, [announcement]);

    const activeSection = useScrollSpy(useMemo(() => sections.map(s => s.id), [sections]));

    /* ── Auto-Center Active Nav Link ── */
    useEffect(() => {
        if (activeSection) {
            const link = document.querySelector(`.sr-nav-link[href="#${activeSection}"]`);
            if (link) {
                link.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }
    }, [activeSection]);

    /* ── Loading skeleton ── */
    if (loading) {
        return (
            <Layout>
                <div className="sr-detail-skeleton animate-fade-in">
                    <div className="skeleton" style={{ height: 14, width: 200, marginBottom: 16 }} />
                    <div className="skeleton" style={{ height: 28, width: '80%', marginBottom: 12 }} />
                    <div className="skeleton" style={{ height: 16, width: '50%', marginBottom: 24 }} />
                    <div className="sr-skeleton-grid">
                        {[1, 2, 3, 4].map(i => (<div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />))}
                    </div>
                    {[1, 2, 3].map(i => (<div key={i} className="skeleton" style={{ height: 120, borderRadius: 12, marginTop: 16 }} />))}
                </div>
            </Layout>
        );
    }

    /* ── Error ── */
    if (isError || !announcement) {
        return (
            <Layout>
                <div className="sr-detail-error animate-fade-in">
                    <div className="sr-error-icon">😕</div>
                    <h2>Announcement Not Found</h2>
                    <p>{(error as Error)?.message || 'This announcement may have been removed or is no longer available.'}</p>
                    <div className="sr-error-actions">
                        <Link to={TYPE_ROUTES[type]} className="btn btn-accent">← Browse {TYPE_LABELS[type]}</Link>
                        <Link to="/" className="btn btn-outline">Go Home</Link>
                    </div>
                </div>
            </Layout>
        );
    }

    const a = announcement;
    const jd = a.jobDetails as JobDetailsData | undefined;
    const salary = formatSalary(a.salaryMin, a.salaryMax);
    const deadline = getDeadlineStatus(a.deadline);
    const isClosed = deadline?.cls === 'sr-badge-closed';

    /* Countdown days for deadline stat */
    const daysLeft = a.deadline ? Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86_400_000) : null;
    const deadlineStatCls = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 ? 'sr-stat-deadline-urgent' : 'sr-stat-deadline';

    /* Stale data warning: > 30 days since last update */
    const daysSinceUpdate = Math.floor((Date.now() - new Date(a.updatedAt).getTime()) / 86_400_000);
    const isStale = daysSinceUpdate > 30;

    /* Filter related: hide expired, prioritize open listings */
    const cleanedRelated = related.filter((item) => item.slug !== slug);
    const openRelated = cleanedRelated.filter((card) => !card.deadline || new Date(card.deadline).getTime() > Date.now());
    const expiredRelated = cleanedRelated.filter((card) => card.deadline && new Date(card.deadline).getTime() <= Date.now());
    const filteredRelated = [...openRelated, ...expiredRelated].slice(0, 6);

    const toNum = (v: unknown) => { const n = typeof v === 'number' ? v : Number(v); return Number.isFinite(n) ? n : 0; };
    const fmtCount = (v?: number | null) => toNum(v).toLocaleString('en-IN');

    return (
        <Layout>
            {/* ── SEO Rich Snippets ── */}
            {jsonLdSchema && (
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSchema }} />
            )}

            {/* ── 2026 Reading Progress Bar ── */}
            <div
                aria-hidden="true"
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, height: '4px',
                    background: 'linear-gradient(90deg, #3b82f6, #ec4899, #f59e0b)',
                    transform: `scaleX(${readingProgress / 100})`,
                    transformOrigin: '0% 50%', zIndex: 9999,
                    transition: 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 0 12px rgba(236, 72, 153, 0.8)'
                }}
            />

            <article className="sr-detail animate-fade-in">
                {/* ─── Breadcrumb ─── */}
                <nav className="sr-breadcrumb">
                    <Link to="/">Home</Link>
                    <span className="sr-bc-sep">›</span>
                    <Link to={TYPE_ROUTES[type]}>{TYPE_LABELS[type]}</Link>
                    <span className="sr-bc-sep">›</span>
                    <span className="sr-bc-current">{a.title}</span>
                </nav>

                {/* ─── Stale/Expired Warnings ─── */}
                {isClosed && (
                    <div className="sr-expired-banner">
                        ⚠️ This listing has <strong>expired</strong>. The deadline has passed and applications are no longer being accepted.
                    </div>
                )}
                {isStale && !isClosed && (
                    <div className="sr-stale-banner">
                        <span className="sr-stale-icon">⏳</span>
                        <div>
                            <strong>Older Update:</strong> This page was last verified {daysSinceUpdate} days ago.
                            Some parameters might have shifted. Please cross-reference with the official portal.
                        </div>
                    </div>
                )}

                {/* ─── Hero Header ─── */}
                <header className="sr-hero">
                    {/* Status Banner — prominent, full width */}
                    {deadline && (
                        <div className={`sr-status-banner ${deadline.cls}`}>
                            <span className="sr-status-icon">{isClosed ? '🔴' : daysLeft !== null && daysLeft <= 3 ? '🔥' : '🟢'}</span>
                            <span className="sr-status-text">{deadline.label}</span>
                            {daysLeft !== null && daysLeft > 0 && !isClosed && <span className="sr-status-countdown">({daysLeft} days to apply)</span>}
                            <span className="sr-status-date">Updated: {formatDate(a.updatedAt)}</span>
                        </div>
                    )}
                    <h1 className="sr-title">{a.title}</h1>
                    {a.organization && <p className="sr-org">{a.organization}</p>}

                    {/* Quick Stats */}
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

                    {/* Action Bar */}
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
                        <button
                            type="button"
                            className={`sr-btn-icon${isBookmarked ? ' active' : ''}`}
                            onClick={() => toggleBookmark.mutate()}
                            title={isBookmarked ? "Saved" : "Save"}
                            disabled={toggleBookmark.isPending}
                        >
                            {toggleBookmark.isPending ? '⏳' : isBookmarked ? '🔖' : '📑'}
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
                                onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
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
                            <Link to={TYPE_ROUTES[type]} className="sr-link-btn sr-link-secondary">
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
                <button
                    type="button"
                    className={`sr-mobile-icon${isBookmarked ? ' active' : ''}`}
                    onClick={() => toggleBookmark.mutate()}
                    disabled={toggleBookmark.isPending}
                >
                    {toggleBookmark.isPending ? '⏳' : isBookmarked ? '🔖' : '📑'}
                </button>
                <button type="button" className="sr-mobile-icon" onClick={handleCopyLink}>
                    {copied ? '✅' : '🔗'}
                </button>
            </div>

            {localToast && (
                <div key={localToast.id} className="sr-local-toast">
                    {localToast.message}
                </div>
            )}

            <button
                className={`sr-back-to-top ${showTopBtn ? 'visible' : ''}`}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label="Scroll to top"
            >
                ↑
            </button>
        </Layout>
    );
}
