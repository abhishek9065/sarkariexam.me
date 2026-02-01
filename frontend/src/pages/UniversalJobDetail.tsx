import { useState } from 'react';
import { DeadlineCountdown } from '../components/ui/DeadlineCountdown';
import { QuickActionsBar } from '../components/ui/QuickActionsBar';
import { JobDetailsRenderer } from '../components/details/JobDetailsRenderer';
import { BookmarkButton } from '../components/ui/BookmarkButton';
import { SEOHead } from '../components/seo/SEOHead';
import { formatNumber } from '../utils/formatters';
import type { Announcement } from '../types';

interface UniversalJobDetailProps {
    item: Announcement;
    isBookmarked?: boolean;
    onToggleBookmark?: (announcementId: string) => Promise<void>;
    isAuthenticated?: boolean;
    onLoginRequired?: () => void;
}

/**
 * Universal Job Detail Page
 * dynamically renders any job/result/admit-card in the premium UP Police style
 */
export function UniversalJobDetail({
    item,
    isBookmarked = false,
    onToggleBookmark,
    isAuthenticated = false,
    onLoginRequired
}: UniversalJobDetailProps) {
    const [activeFaq, setActiveFaq] = useState<number | null>(null);

    // Format Date
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'To be announced';
        try {
            return new Date(dateString).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            });
        } catch {
            return dateString;
        }
    };

    // Dynamic Data Mapping
    const job = {
        title: item.title,
        organization: item.organization || 'Government of India',
        postName: item.category || 'Various Posts',
        totalPosts: item.totalPosts || 'N/A',
        applyStart: item.postedAt,
        applyEnd: item.deadline ?? undefined,
        examDate: 'As per Schedule',
        link: item.externalLink || '#',
    };

    // Important Dates
    const importantDates = [
        { label: 'Application Begin', date: formatDate(job.applyStart) },
        { label: 'Last Date to Apply', date: formatDate(job.applyEnd) },
        { label: 'Exam Date', date: job.examDate },
    ];

    // Fees (Parse if possible, or show raw string)
    const fees = item.applicationFee ? [{ category: 'Application Fee', fee: item.applicationFee }] : [];

    // Age Limit
    const ageLimit = item.ageLimit ? [{ label: 'Age Limit', value: item.ageLimit }] : [];

    // Vacancy
    const vacancy = item.totalPosts ? [{ post: job.postName, total: item.totalPosts }] : [];

    // FAQs (Generic if none provided)
    const faqs = [
        { q: 'How to Apply?', a: 'Read the detailed notification linked below and apply online via the official website.' },
        { q: 'What is the last date?', a: `The last date to apply is ${formatDate(job.applyEnd)}.` },
        { q: 'What is the official website?', a: 'Please direct links in the "Important Links" section below.' },
    ];

    return (
        <div className="job-detail-page">
            {/* SEO Meta Tags & Structured Data */}
            <SEOHead
                title={`${job.title} - ${job.organization}`}
                description={`Apply for ${job.title} at ${job.organization}. Total ${formatNumber(job.totalPosts ?? undefined, String(job.totalPosts ?? 'N/A'))} vacancies. Last date: ${formatDate(item.deadline ?? undefined)}.`}
                canonicalUrl={`https://www.sarkariexams.me/${item.type}/${item.slug}`}
                ogType="article"
                keywords={[item.type, item.category, item.organization, 'sarkari result', 'government jobs']}
                publishedTime={item.postedAt}
                modifiedTime={item.updatedAt}
                jobPosting={{
                    title: job.title,
                    organization: job.organization,
                    location: item.location || 'India',
                    deadline: item.deadline ?? undefined,
                    totalPosts: typeof job.totalPosts === 'number' ? job.totalPosts : undefined,
                }}
            />

            {/* Header */}
            <div className="job-header">
                <div className="job-badge">{item.type.toUpperCase()}</div>
                <h1>{job.title}</h1>
                <p className="job-org">{job.organization}</p>
                <div className="job-highlight">
                    <span className="posts-count">👥 {formatNumber(job.totalPosts ?? undefined, String(job.totalPosts ?? 'N/A'))} Posts</span>
                    <span className="post-name">📋 {job.postName}</span>
                    {onToggleBookmark && (
                        <BookmarkButton
                            announcementId={item.id}
                            isBookmarked={isBookmarked}
                            onToggle={onToggleBookmark}
                            isAuthenticated={isAuthenticated}
                            onLoginRequired={onLoginRequired}
                            size="large"
                            showLabel={true}
                        />
                    )}
                </div>
            </div>

            {/* Deadline Countdown */}
            {job.applyEnd && <DeadlineCountdown deadline={job.applyEnd} label="Last Date" />}

            {/* Quick Actions */}
            <QuickActionsBar
                applyLink={job.link}
                notificationLink={job.link}
            />

            {/* Extended Job Details (if available) */}
            {item.jobDetails && Object.keys(item.jobDetails).length > 0 ? (
                <JobDetailsRenderer jobDetails={item.jobDetails} />
            ) : (
                <>
                    {/* Fallback to basic layout */}

                    {/* Important Dates */}
                    <section className="detail-section">
                        <h2 className="section-header maroon">📅 Important Dates</h2>
                        <table className="info-table">
                            <tbody>
                                {importantDates.map((d, i) => (
                                    <tr key={i}>
                                        <td>{d.label}</td>
                                        <td>{d.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    {/* Application Fee */}
                    {fees.length > 0 && (
                        <section className="detail-section">
                            <h2 className="section-header blue">💰 Application Fee</h2>
                            <table className="info-table">
                                <tbody>
                                    {fees.map((f, i) => (
                                        <tr key={i}>
                                            <td>{f.category}</td>
                                            <td className="fee-cell">{f.fee}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    )}

                    {/* Age Limit */}
                    {ageLimit.length > 0 && (
                        <section className="detail-section">
                            <h2 className="section-header green">👤 Age Limit</h2>
                            <div className="age-box">
                                {ageLimit.map((a, i) => (
                                    <div key={i} className="age-main" style={{ width: '100%' }}>
                                        <span className="age-label">{a.label}</span>
                                        <span className="age-value">{a.value}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}

            {/* Vacancy Details */}
            {vacancy.length > 0 && (
                <section className="detail-section">
                    <h2 className="section-header orange">📊 Vacancy Details</h2>
                    <table className="info-table vacancy-table">
                        <thead>
                            <tr>
                                <th>Post Name</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vacancy.map((v, i) => (
                                <tr key={i}>
                                    <td>{v.post}</td>
                                    <td className="total-cell">{formatNumber(v.total ?? undefined)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            )}

            {/* Description / Content */}
            {item.content && (
                <section className="detail-section">
                    <h2 className="section-header purple">📝 Details</h2>
                    <div className="job-content" dangerouslySetInnerHTML={{ __html: item.content }} />
                </section>
            )}

            {/* Important Links */}
            <section className="detail-section">
                <h2 className="section-header dark">🔗 Important Links</h2>
                <table className="links-table">
                    <tbody>
                        <tr>
                            <td><strong>Apply Online / View Result</strong></td>
                            <td><a href={job.link} target="_blank" rel="noopener" className="link-btn green">Click Here</a></td>
                        </tr>
                        <tr>
                            <td><strong>Download Notification</strong></td>
                            <td><a href={job.link} target="_blank" rel="noopener" className="link-btn blue">Click Here</a></td>
                        </tr>
                        <tr>
                            <td><strong>Official Website</strong></td>
                            <td><a href="#" target="_blank" rel="noopener" className="link-btn orange">Click Here</a></td>
                        </tr>
                    </tbody>
                </table>
            </section>

            {/* FAQs */}
            <section className="detail-section">
                <h2 className="section-header gray">❓ Frequently Asked Questions (FAQs)</h2>
                <div className="faq-list">
                    {faqs.map((faq, i) => (
                        <div
                            key={i}
                            className={`faq-item ${activeFaq === i ? 'active' : ''}`}
                            onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                        >
                            <div className="faq-question">
                                <span>{faq.q}</span>
                                <span className="faq-toggle">{activeFaq === i ? '−' : '+'}</span>
                            </div>
                            {activeFaq === i && (
                                <div className="faq-answer">{faq.a}</div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <div className="detail-footer">
                <p>📌 Bookmark this page for updates on {job.title}.</p>
            </div>
        </div>
    );
}

export default UniversalJobDetail;
