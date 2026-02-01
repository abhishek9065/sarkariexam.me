import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Header, Navigation, Footer, SectionTable, SkeletonLoader, SEO, Breadcrumbs, ErrorState, MobileNav, ShareButtons } from '../components';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatDate, formatNumber, getDaysRemaining, isExpired, isUrgent, TYPE_LABELS, SELECTION_MODES, PATHS, type TabType } from '../utils';
import { fetchAnnouncementBySlug, fetchAnnouncementsByType } from '../utils/api';
import type { Announcement, ContentType } from '../types';

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
    const navigate = useNavigate();
    const { user, token, logout, isAuthenticated } = useAuth();
    const { t } = useLanguage();

    const offlineKey = 'offline-announcements';
    const LOAD_TIMEOUT_MS = 8000;

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

    const formatSalaryRange = (min?: number | null, max?: number | null) => {
        if (!min && !max) return null;
        const fmt = (value: number) => new Intl.NumberFormat('en-IN').format(value);
        if (min && max) return `₹${fmt(min)} - ₹${fmt(max)}`;
        if (min) return `₹${fmt(min)}+`;
        if (max) return `Up to ₹${fmt(max)}`;
        return null;
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

    if (loading) {
        return (
            <div className="app">
                <Header setCurrentPage={(page) => navigate('/' + page)} user={user} token={token} isAuthenticated={isAuthenticated} onLogin={() => { }} onLogout={logout} onProfileClick={() => navigate('/profile')} />
                <main className="main-content"><SkeletonLoader /></main>
            </div>
        );
    }

    if (error) {
        return (
            <div className="app">
                <Header setCurrentPage={(page) => navigate('/' + page)} user={user} token={token} isAuthenticated={isAuthenticated} onLogin={() => { }} onLogout={logout} onProfileClick={() => navigate('/profile')} />
                <main className="main-content">
                    <ErrorState message={error} onRetry={() => navigate(0)} />
                </main>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="app">
                <Header setCurrentPage={(page) => navigate('/' + page)} user={user} token={token} isAuthenticated={isAuthenticated} onLogin={() => { }} onLogout={logout} onProfileClick={() => navigate('/profile')} />
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

    // Type-specific FAQs
    const getFaqs = () => {
        const base = [
            { 
                q: `What is the eligibility criteria for ${item.title}?`, 
                a: `Eligibility includes age limits (usually 18-35 years), educational qualifications (as specified in notification), and category-wise relaxations. Always check the official notification for exact requirements.` 
            },
            { 
                q: 'How to apply online?', 
                a: 'Visit the official website through "Apply Here" link below → Register with valid details → Fill application form → Upload documents → Pay application fee → Submit form → Take printout of confirmation page.' 
            },
            { 
                q: 'What are the application fees?', 
                a: 'Fees vary by category: General/OBC candidates typically pay ₹100-₹1000, SC/ST/PWD candidates often get fee exemption. Check official notification for exact amounts.' 
            },
            { 
                q: 'What documents are required?', 
                a: 'Typically required: Recent photograph (passport size), signature, educational certificates, caste certificate (if applicable), age proof, experience certificates (if required). All documents should be in prescribed format and size.' 
            },
            { 
                q: 'When will results be declared?', 
                a: 'Result dates will be announced separately. Usually declared 30-90 days after exam completion.' 
            },
        ];
        
        if (item.type === 'admit-card') {
            base.push({ 
                q: 'How to download admit card?', 
                a: 'Visit official website → Click on admit card link → Enter registration number and date of birth → Download and print admit card. Ensure all details are correct.' 
            });
        }
        
        if (item.type === 'result') {
            base.push({ 
                q: 'How to check results?', 
                a: 'Go to official result website → Enter roll number/application number → Click submit → View/download result. Take printout for future reference.' 
            });
        }
        
        return base;
    };

    const handleRelatedClick = (relatedItem: Announcement) => {
        navigate(`/${relatedItem.type}/${relatedItem.slug}`);
    };

    return (
        <div className="app">            <SEO 
                title={item?.title || 'Loading...'}
                description={item ? `${item.title} - ${item.organization || 'Government'} | Apply online, check eligibility, important dates` : undefined}
                announcement={item || undefined}
                canonicalUrl={`https://sarkariexams.me/${item?.type}/${item?.slug}`}
            />            <Header 
                setCurrentPage={(page) => {
                    if (page === 'home') navigate('/');
                    else if (page === 'admin') navigate('/admin');
                    else navigate('/' + page);
                }} 
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
                setShowSearch={() => { }}
                goBack={() => navigate(-1)}
                setCurrentPage={(page) => {
                    if (page === 'home') navigate('/');
                    else if (page === 'admin') navigate('/admin');
                    else navigate('/' + page);
                }}
                isAuthenticated={isAuthenticated}
                onShowAuth={() => { }}
            />

            <main className="main-content">
                <div className="page-with-sidebar">
                    <div className="detail-page enhanced-detail">
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
                            </div>
                        </div>

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

                        {/* Tables Grid */}
                        <div className="detail-tables-grid">
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

                        <div className="job-details-grid">
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
                        <table className="links-table enhanced">
                            <thead><tr><th colSpan={2}>🔗 Important Links</th></tr></thead>
                            <tbody>
                                <tr>
                                    <td><strong>{labels.action}</strong></td>
                                    <td><a href={item.externalLink || '#'} target="_blank" rel="noreferrer" className="link-btn apply">Click Here</a></td>
                                </tr>
                                <tr>
                                    <td><strong>Official Website</strong></td>
                                    <td><a href={item.externalLink || '#'} target="_blank" rel="noreferrer" className="link-btn website">Click Here</a></td>
                                </tr>
                            </tbody>
                        </table>

                        <ShareButtons
                            title={item.title}
                            description={`Latest ${item.type} update from ${item.organization}`}
                        />

                        {/* FAQ */}
                        <div className="faq-section">
                            <h3>❓ FAQ</h3>
                            {getFaqs().map((faq, idx) => (
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
                                            <a href="#" onClick={(e) => { e.preventDefault(); handleRelatedClick(r); }}>
                                                {r.title}
                                            </a>
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
            <MobileNav />
        </div>
    );
}
