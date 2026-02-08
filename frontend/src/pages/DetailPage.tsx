import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Header, Navigation, Footer, SectionTable, SkeletonLoader, SEO, Breadcrumbs, ErrorState, MobileNav, ShareButtons, ScrollToTop } from '../components';
import { GlobalSearchModal } from '../components/modals/GlobalSearchModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContextStore';
import { formatDate, formatNumber, getDaysRemaining, isExpired, isUrgent, TYPE_LABELS, SELECTION_MODES, PATHS, type TabType } from '../utils';
import { prefetchAnnouncementDetail } from '../utils/prefetch';
import { fetchAnnouncementBySlug, fetchAnnouncementsByType } from '../utils/api';
import type { Announcement, ContentType } from '../types';
import './V2.css';

interface DetailPageProps {
    type: ContentType;
}

const TYPE_TITLES: Record<ContentType, string> = {
    job: 'Jobs',
    result: 'Results',
    'admit-card': 'Admit Cards',
    'answer-key': 'Answer Keys',
    admission: 'Admissions',
    syllabus: 'Syllabus',
};

export function DetailPage({ type: _type }: DetailPageProps) {
    const { slug } = useParams<{ slug: string }>();
    const location = useLocation();
    const [item, setItem] = useState<Announcement | null>(null);
    const [relatedItems, setRelatedItems] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [offlineSaved, setOfflineSaved] = useState(false);
    const [copyLinkStatus, setCopyLinkStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [applyChecklist, setApplyChecklist] = useState<Record<string, boolean>>({});
    const [showSearchModal, setShowSearchModal] = useState(false);
    const copyLinkTimerRef = useRef<number | null>(null);
    const navigate = useNavigate();
    const { user, token, logout, isAuthenticated } = useAuth();
    const { t } = useLanguage();

    const offlineKey = 'offline-announcements';
    const LOAD_TIMEOUT_MS = 3000;
    const handlePageNavigation = (page: string) => {
        if (page === 'home') navigate('/');
        else if (page === 'admin') navigate('/admin');
        else navigate('/' + page);
    };

    const getOfflineItem = (slugValue: string) => {
        try {
            const raw = localStorage.getItem(offlineKey);
            if (!raw) return null;
            const items = JSON.parse(raw) as Announcement[];
            return items.find((entry) => entry.slug === slugValue) || null;
        } catch {
            return null;
        }
    };

    const handleOfflineSave = () => {
        if (!item) return;
        try {
            const raw = localStorage.getItem(offlineKey);
            const items = raw ? (JSON.parse(raw) as Announcement[]) : [];
            const exists = items.find((entry) => entry.slug === item.slug);
            const next = exists ? items : [item, ...items].slice(0, 50);
            localStorage.setItem(offlineKey, JSON.stringify(next));
            setOfflineSaved(true);
        } catch (err) {
            console.error('Offline save failed', err);
        }
    };

    const handleAddToCalendar = () => {
        if (!item?.deadline) return;
        const start = new Date(item.deadline);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const formatIcsDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//SarkariExams.me//EN',
            'BEGIN:VEVENT',
            `UID:${item.id}@sarkariexams.me`,
            `DTSTAMP:${formatIcsDate(new Date())}`,
            `DTSTART:${formatIcsDate(start)}`,
            `DTEND:${formatIcsDate(end)}`,
            `SUMMARY:${item.title}`,
            `DESCRIPTION:Deadline for ${item.title}`,
            'END:VEVENT',
            'END:VCALENDAR',
        ].join('\n');

        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${item.slug}-deadline.ics`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const handleTextToSpeech = () => {
        if (!item) return;
        if (!('speechSynthesis' in window)) return;
        const summary = `${item.title}. Organization: ${item.organization}. ${item.deadline ? `Deadline: ${formatDate(item.deadline)}.` : ''}`;
        const utterance = new SpeechSynthesisUtterance(summary);
        utterance.lang = 'en-IN';
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    };

    const scheduleCopyStatusReset = (status: 'success' | 'error') => {
        if (copyLinkTimerRef.current) {
            window.clearTimeout(copyLinkTimerRef.current);
        }
        setCopyLinkStatus(status);
        copyLinkTimerRef.current = window.setTimeout(() => {
            setCopyLinkStatus('idle');
            copyLinkTimerRef.current = null;
        }, 2400);
    };

    const handleCopyLink = async () => {
        try {
            const url = window.location.href;
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(url);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = url;
                textarea.setAttribute('readonly', 'true');
                textarea.style.position = 'absolute';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                textarea.remove();
            }
            scheduleCopyStatusReset('success');
        } catch {
            scheduleCopyStatusReset('error');
        }
    };

    const formatSalaryRange = (min?: number | null, max?: number | null) => {
        if (!min && !max) return null;
        const fmt = (value: number) => new Intl.NumberFormat('en-IN').format(value);
        if (min && max) return `₹${fmt(min)} - ₹${fmt(max)}`;
        if (min) return `₹${fmt(min)}+`;
        if (max) return `Up to ₹${fmt(max)}`;
        return null;
    };
    const checklistItems = useMemo(() => {
        const base = [
            { id: 'official', label: 'Open official notification and verify exact eligibility criteria.' },
            { id: 'documents', label: 'Prepare required documents (photo, signature, certificates, ID proof).' },
            { id: 'timeline', label: 'Add last date and exam timeline to your personal calendar.' },
            { id: 'alerts', label: 'Enable profile alerts for admit card/result follow-ups.' },
        ];
        if (item?.type === 'job') {
            base.splice(2, 0, { id: 'fee', label: 'Confirm fee/payment mode and keep transaction receipt.' });
        }
        if (item?.type === 'result') {
            base.push({ id: 'record', label: 'Download and save result PDF for future verification.' });
        }
        if (item?.type === 'admit-card') {
            base.push({ id: 'exam-kit', label: 'Cross-check exam center, reporting time, and required carry items.' });
        }
        return base;
    }, [item?.type]);
    const checklistCompletedCount = useMemo(
        () => checklistItems.reduce((count, entry) => count + (applyChecklist[entry.id] ? 1 : 0), 0),
        [applyChecklist, checklistItems]
    );
    const checklistProgress = checklistItems.length > 0
        ? Math.round((checklistCompletedCount / checklistItems.length) * 100)
        : 0;

    const handleChecklistToggle = (id: string) => {
        setApplyChecklist((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleChecklistReset = () => {
        const resetState: Record<string, boolean> = {};
        for (const entry of checklistItems) {
            resetState[entry.id] = false;
        }
        setApplyChecklist(resetState);
    };

    useEffect(() => {
        if (!slug) return;

        setLoading(true);
        setError(null);
        let isActive = true;
        let didTimeout = false;
        const timeoutId = setTimeout(() => {
            if (!isActive) return;
            didTimeout = true;
            setError('This is taking longer than usual. Please retry.');
            setLoading(false);
        }, LOAD_TIMEOUT_MS);
        // Fetch by slug using shared helper
        fetchAnnouncementBySlug(slug, location.search)
            .then(data => {
                if (!isActive || didTimeout) return;
                if (data) {
                    setItem(data);
                } else {
                    const offline = getOfflineItem(slug);
                    setItem(offline);
                }
                // Fetch related items
                if (data) {
                    fetchAnnouncementsByType(data.type)
                        .then(related => {
                            if (!isActive || didTimeout) return;
                            const filtered = related.filter(r => r.id !== data.id);
                            const prioritized = filtered.sort((a, b) => {
                                const score = (item: Announcement) => {
                                    let total = 0;
                                    if (item.organization && item.organization === data.organization) total += 3;
                                    if (item.category && item.category === data.category) total += 2;
                                    return total;
                                };
                                return score(b) - score(a);
                            });
                            setRelatedItems(prioritized.slice(0, 5));
                        });
                }
            })
            .catch((err) => {
                console.error(err);
                if (!isActive || didTimeout) return;
                setError('Unable to load this announcement. Please try again.');
            })
            .finally(() => {
                if (!isActive || didTimeout) return;
                clearTimeout(timeoutId);
                setLoading(false);
            });
        return () => {
            isActive = false;
            clearTimeout(timeoutId);
        };
    }, [slug, location.search]);

    useEffect(() => {
        if (!slug) return;
        const saved = getOfflineItem(slug);
        setOfflineSaved(Boolean(saved));
    }, [slug]);

    useEffect(() => {
        if (!item?.slug) return;
        const storageKey = `apply-checklist:${item.slug}`;
        const defaultState: Record<string, boolean> = {};
        for (const entry of checklistItems) {
            defaultState[entry.id] = false;
        }

        try {
            const raw = localStorage.getItem(storageKey);
            if (!raw) {
                setApplyChecklist(defaultState);
                return;
            }
            const parsed = JSON.parse(raw) as Record<string, boolean>;
            const mergedState: Record<string, boolean> = {};
            for (const entry of checklistItems) {
                mergedState[entry.id] = Boolean(parsed[entry.id]);
            }
            setApplyChecklist(mergedState);
        } catch {
            setApplyChecklist(defaultState);
        }
    }, [item?.slug, checklistItems]);

    useEffect(() => {
        if (!item?.slug) return;
        const storageKey = `apply-checklist:${item.slug}`;
        try {
            localStorage.setItem(storageKey, JSON.stringify(applyChecklist));
        } catch {
            // ignore storage write failures
        }
    }, [applyChecklist, item?.slug]);

    useEffect(() => () => {
        if (copyLinkTimerRef.current) {
            window.clearTimeout(copyLinkTimerRef.current);
        }
    }, []);

    if (loading) {
        return (
            <div className="app sr-v2-detail">
                <Header setCurrentPage={handlePageNavigation} user={user} token={token} isAuthenticated={isAuthenticated} onLogin={() => { }} onLogout={logout} onProfileClick={() => navigate('/profile')} />
                <main className="main-content"><SkeletonLoader /></main>
            </div>
        );
    }

    if (error) {
        return (
            <div className="app sr-v2-detail">
                <Header setCurrentPage={handlePageNavigation} user={user} token={token} isAuthenticated={isAuthenticated} onLogin={() => { }} onLogout={logout} onProfileClick={() => navigate('/profile')} />
                <main className="main-content">
                    <ErrorState message={error} onRetry={() => navigate(0)} />
                </main>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="app sr-v2-detail">
                <Header setCurrentPage={handlePageNavigation} user={user} token={token} isAuthenticated={isAuthenticated} onLogin={() => { }} onLogout={logout} onProfileClick={() => navigate('/profile')} />
                <main className="main-content">
                    <h1>{t('detail.notFoundTitle')}</h1>
                    <p>{t('detail.notFoundBody')}</p>
                    <button onClick={() => navigate('/')}>{t('detail.goHome')}</button>
                </main>
            </div>
        );
    }

    const labels = TYPE_LABELS[item.type] || TYPE_LABELS['job'];
    const selectionModes = SELECTION_MODES[item.type] || SELECTION_MODES['job'];
    const daysRemaining = getDaysRemaining(item.deadline ?? undefined);
    const externalLink = item.externalLink && /^https?:\/\//i.test(item.externalLink) ? item.externalLink : undefined;
    const faqs = [
        {
            q: `What is the eligibility criteria for ${item.title}?`,
            a: 'Eligibility usually includes age limit, education level, and category-based relaxations. Verify exact rules from the official notification.'
        },
        {
            q: 'How to apply online?',
            a: 'Open the official link, register with valid details, fill the form, upload required documents, pay fee (if applicable), and keep the final acknowledgement.'
        },
        {
            q: 'What documents are typically required?',
            a: 'Recent photo, signature, educational certificates, category certificate (if applicable), and identity/address proof in the specified file format.'
        },
        {
            q: 'When will results be announced?',
            a: 'Result timelines vary by board and exam cycle. Keep checking the official portal and this page for updates.'
        },
        ...(item.type === 'admit-card'
            ? [{
                q: 'How to download admit card?',
                a: 'Use registration details on the official admit-card portal, then download and print the hall ticket after checking all fields.'
            }]
            : []),
        ...(item.type === 'result'
            ? [{
                q: 'How to check results?',
                a: 'Open the official result link, enter the required credentials, and download or print the result for records.'
            }]
            : []),
    ];

    const handleRelatedClick = (relatedItem: Announcement) => {
        navigate(`/${relatedItem.type}/${relatedItem.slug}`);
    };

    return (
        <div className="app sr-v2-detail">
            <a className="sr-v2-skip-link" href="#detail-main">
                Skip to announcement details
            </a>
            <SEO
                title={item?.title || 'Loading...'}
                description={item ? `${item.title} - ${item.organization || 'Government'} | Apply online, check eligibility, important dates` : undefined}
                announcement={item || undefined}
                canonicalUrl={`https://sarkariexams.me/${item?.type}/${item?.slug}`}
            />
            <Header
                setCurrentPage={handlePageNavigation}
                user={user}
                token={token}
                isAuthenticated={isAuthenticated}
                onLogin={() => { }}
                onLogout={logout}
                onProfileClick={() => navigate('/profile')}
            />
            <Navigation
                activeTab={item.type as TabType}
                setActiveTab={() => { }}
                setShowSearch={() => setShowSearchModal(true)}
                goBack={() => navigate(-1)}
                setCurrentPage={handlePageNavigation}
                isAuthenticated={isAuthenticated}
                onShowAuth={() => { }}
            />

            <main id="detail-main" className="main-content sr-v2-main">
                <div className="page-with-sidebar">
                    <div className="detail-page enhanced-detail sr-v2-detail-panel">
                        <Breadcrumbs
                            items={[
                                { label: TYPE_TITLES[item.type], path: PATHS[item.type] },
                                { label: item.title },
                            ]}
                        />
                        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

                        {/* Header Banner */}
                        <div className="detail-header-banner">
                            <div className="banner-content">
                                <span className="type-badge">{item.type.toUpperCase()}</span>
                                <h1>{item.title}</h1>
                                <div className="org-badge">🏛️ {item.organization}</div>
                            </div>
                            {item.totalPosts && (
                                <div className="posts-highlight">
                                    <span className="posts-number">{formatNumber(item.totalPosts ?? undefined)}</span>
                                    <span className="posts-label">Total Posts</span>
                                </div>
                            )}
                            <div className="detail-header-actions">
                                <button
                                    className={`offline-save-btn ${offlineSaved ? 'saved' : ''}`}
                                    onClick={handleOfflineSave}
                                >
                                    {offlineSaved ? 'Saved Offline' : 'Download Offline'}
                                </button>
                                <button
                                    className="offline-save-btn"
                                    onClick={handleAddToCalendar}
                                    disabled={!item.deadline}
                                >
                                    Add to Calendar
                                </button>
                                <button
                                    className="offline-save-btn"
                                    onClick={handleTextToSpeech}
                                >
                                    Listen
                                </button>
                                <button
                                    className={`offline-save-btn ${copyLinkStatus === 'success' ? 'saved' : ''}`}
                                    onClick={handleCopyLink}
                                >
                                    {copyLinkStatus === 'success'
                                        ? 'Link Copied'
                                        : copyLinkStatus === 'error'
                                            ? 'Copy Failed'
                                            : 'Copy Link'}
                                </button>
                            </div>
                            <span className="sr-v2-copy-status" role="status" aria-live="polite">
                                {copyLinkStatus === 'success'
                                    ? 'Announcement link copied.'
                                    : copyLinkStatus === 'error'
                                        ? 'Unable to copy the link.'
                                        : ''}
                            </span>
                        </div>
                        <section className="sr-v2-trust-rail" aria-label="Trust checklist">
                            <span>Verified Source Workflow</span>
                            <span>Daily Update Monitoring</span>
                            <span>Official Link First Policy</span>
                        </section>
                        <nav className="sr-v2-detail-jump-links" aria-label="Jump to detail sections">
                            <a href="#detail-important-dates">Important Dates</a>
                            <a href="#detail-eligibility">Eligibility</a>
                            <a href="#detail-links">Important Links</a>
                            <a href="#detail-faq">FAQ</a>
                        </nav>

                        {/* Countdown */}
                        {daysRemaining !== null && (
                            <div className={`countdown-bar ${isExpired(item.deadline ?? undefined) ? 'expired' : isUrgent(item.deadline ?? undefined) ? 'urgent' : 'active'}`}>
                                {isExpired(item.deadline ?? undefined) ? (
                                    <span>❌ Closed</span>
                                ) : (
                                    <>
                                        <span>⏰ {daysRemaining} Days Remaining</span>
                                        <span>Last: {formatDate(item.deadline ?? undefined)}</span>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Brief Summary */}
                        <div className="brief-summary">
                            <h3>📋 Brief Information</h3>
                            <p>
                                <strong>{item.organization}</strong> has released notification for <strong>{item.title}</strong>.
                                {item.totalPosts && ` Total ${item.totalPosts} positions.`}
                                {item.deadline && ` Last date: ${formatDate(item.deadline)}.`}
                            </p>
                        </div>

                        <section className="sr-v2-readiness" aria-labelledby="apply-readiness-heading">
                            <div className="sr-v2-readiness-header">
                                <div>
                                    <h3 id="apply-readiness-heading">Apply Readiness Checklist</h3>
                                    <p>Complete each step to reduce application mistakes and missed deadlines.</p>
                                </div>
                                <span className="sr-v2-readiness-score">{checklistCompletedCount}/{checklistItems.length}</span>
                            </div>
                            <div className="sr-v2-readiness-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={checklistProgress}>
                                <span style={{ width: `${checklistProgress}%` }} />
                            </div>
                            <ul className="sr-v2-readiness-list">
                                {checklistItems.map((entry) => (
                                    <li key={entry.id}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={Boolean(applyChecklist[entry.id])}
                                                onChange={() => handleChecklistToggle(entry.id)}
                                            />
                                            <span>{entry.label}</span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                            <div className="sr-v2-readiness-actions">
                                <button type="button" className="btn btn-secondary" onClick={handleChecklistReset}>
                                    Reset checklist
                                </button>
                            </div>
                        </section>

                        {/* Tables Grid */}
                        <div id="detail-important-dates" className="detail-tables-grid">
                            <table className="detail-table dates-table">
                                <thead><tr><th colSpan={2}>📅 Important Dates</th></tr></thead>
                                <tbody>
                                    <tr><td><strong>Notification</strong></td><td>{formatDate(item.postedAt)}</td></tr>
                                    {item.deadline && <tr><td><strong>Last Date</strong></td><td className="date-value deadline">{formatDate(item.deadline)}</td></tr>}
                                </tbody>
                            </table>

                            <table className="detail-table fee-table">
                                <thead><tr><th colSpan={2}>💰 Application Fee</th></tr></thead>
                                <tbody>
                                    <tr><td><strong>General/OBC</strong></td><td>{item.applicationFee || '₹ As per notification'}</td></tr>
                                    <tr><td><strong>SC/ST</strong></td><td className="fee-value reduced">Exempted/Reduced</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <div id="detail-eligibility" className="job-details-grid">
                            <div className="detail-section">
                                <h3>Eligibility Criteria</h3>
                                <div className="eligibility-info">
                                    <div className="eligibility-item">
                                        <strong>Age Limit:</strong> {item.ageLimit || 'As per official notification'}
                                    </div>
                                    <div className="eligibility-item">
                                        <strong>Educational Qualification:</strong> {item.minQualification || 'As specified in notification'}
                                    </div>
                                    <div className="eligibility-item">
                                        <strong>Physical Standards:</strong> As per recruitment rules (if applicable)
                                    </div>
                                </div>
                            </div>
                            
                            <div className="detail-section">
                                <h3>Important Information</h3>
                                <div className="important-info">
                                    <div className="info-item">
                                        <strong>Total Vacancies:</strong> {item.totalPosts ? `${item.totalPosts} positions` : 'Refer to official notification'}
                                    </div>
                                    <div className="info-item">
                                        <strong>Application Fee:</strong> {item.applicationFee || 'As per notification (varies by category)'}
                                    </div>
                                    {formatSalaryRange(item.salaryMin ?? undefined, item.salaryMax ?? undefined) && (
                                        <div className="info-item">
                                            <strong>Salary Range:</strong> {formatSalaryRange(item.salaryMin ?? undefined, item.salaryMax ?? undefined)}
                                        </div>
                                    )}
                                    {item.difficulty && (
                                        <div className="info-item">
                                            <strong>Difficulty:</strong> {item.difficulty.toUpperCase()}
                                        </div>
                                    )}
                                    {item.cutoffMarks && (
                                        <div className="info-item">
                                            <strong>Previous Cutoff:</strong> {item.cutoffMarks}
                                        </div>
                                    )}
                                    <div className="info-item">
                                        <strong>Selection Process:</strong> Written Exam → Document Verification → Medical Exam (if applicable)
                                    </div>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h3>Key Dates</h3>
                                <div className="dates-info">
                                    <div className="date-item">
                                        <strong>Notification Published:</strong> {item.postedAt ? formatDate(item.postedAt) : 'Check official source'}
                                    </div>
                                    <div className="date-item">
                                        <strong>Application Start:</strong> Refer to official notification
                                    </div>
                                    <div className="date-item">
                                        <strong>Last Date to Apply:</strong> {item.deadline ? formatDate(item.deadline) : 'Check official notification'}
                                    </div>
                                    <div className="date-item">
                                        <strong>Exam Date:</strong> To be announced
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mode of Selection */}
                        <div className="mode-selection">
                            <h3>{item.type === 'syllabus' ? 'Content Overview' : 'Selection Process'}</h3>
                            <ul className="selection-list">
                                {selectionModes.map((mode, idx) => <li key={idx}>{mode}</li>)}
                            </ul>
                        </div>

                        {/* Important Links */}
                        <table id="detail-links" className="links-table enhanced">
                            <thead><tr><th colSpan={2}>🔗 Important Links</th></tr></thead>
                            <tbody>
                                <tr>
                                    <td><strong>{labels.action}</strong></td>
                                    <td>
                                        {externalLink ? (
                                            <a href={externalLink} target="_blank" rel="noreferrer" className="link-btn apply">Click Here</a>
                                        ) : (
                                            <span className="link-btn link-btn-disabled">Not Available</span>
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Official Website</strong></td>
                                    <td>
                                        {externalLink ? (
                                            <a href={externalLink} target="_blank" rel="noreferrer" className="link-btn website">Click Here</a>
                                        ) : (
                                            <span className="link-btn link-btn-disabled">Not Available</span>
                                        )}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <ShareButtons
                            title={item.title}
                            description={`Latest ${item.type} update from ${item.organization}`}
                        />

                        {/* FAQ */}
                        <div id="detail-faq" className="faq-section">
                            <h3>❓ FAQ</h3>
                            {faqs.map((faq, idx) => (
                                <div key={idx} className={`faq-item ${openFaq === idx ? 'open' : ''}`}>
                                    <button className="faq-question" onClick={() => setOpenFaq(openFaq === idx ? null : idx)}>
                                        <span>Q: {faq.q}</span>
                                        <span className="faq-toggle">{openFaq === idx ? '−' : '+'}</span>
                                    </button>
                                    {openFaq === idx && <div className="faq-answer"><strong>A:</strong> {faq.a}</div>}
                                </div>
                            ))}
                        </div>

                        {/* Related */}
                        {relatedItems.length > 0 && (
                            <div className="related-jobs">
                                <h3>📌 {labels.relatedTitle}</h3>
                                <ul>
                                    {relatedItems.map(r => (
                                        <li key={r.id}>
                                            <button
                                                type="button"
                                                className="related-link-btn"
                                                onClick={() => handleRelatedClick(r)}
                                                onMouseEnter={() => prefetchAnnouncementDetail(r.slug)}
                                                onFocus={() => prefetchAnnouncementDetail(r.slug)}
                                            >
                                                {r.title}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <aside className="sidebar">
                        <SectionTable title="Latest" items={relatedItems} onItemClick={handleRelatedClick} />
                    </aside>
                </div>
            </main>

            <Footer setCurrentPage={(page) => {
                if (page === 'home') navigate('/');
                else navigate('/' + page);
            }} />
            <GlobalSearchModal open={showSearchModal} onClose={() => setShowSearchModal(false)} />
            <MobileNav />
            <ScrollToTop />
        </div>
    );
}
