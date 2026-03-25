'use client';

import DOMPurify from 'dompurify';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AnnouncementCard } from '@/app/components/AnnouncementCard';
import { Icon } from '@/app/components/Icon';
import styles from '@/app/components/PortalSurface.module.css';
import { PublicCategoryRail } from '@/app/components/PublicCategoryRail';
import { addBookmark, getAnnouncementBySlug, getAnnouncementCards, getBookmarks, removeBookmark } from '@/app/lib/api';
import { trackEvent } from '@/app/lib/analytics';
import { getFallbackAnnouncementBySlug, getFallbackAnnouncementCards } from '@/app/lib/fallbackData';
import { pushRecentView } from '@/app/lib/personalization';
import { generateArticleSchema, generateBreadcrumbSchema, generateFAQSchema, generateJobPostingSchema } from '@/app/lib/structuredData';
import type { Announcement, AnnouncementCard as CardType, ContentType } from '@/app/lib/types';
import { buildCategoryPath } from '@/app/lib/urls';
import { CATEGORY_META, buildRecentView, formatDate, formatDateTime, formatRelativeTime, getDeadlineInfo } from '@/app/lib/ui';
import { withTimeout } from '@/app/lib/withTimeout';

type FaqItem = { question: string; answer: string };
type ImportantLink = { label: string; url: string };

const CTA_LABELS: Record<ContentType, string> = {
    job: 'Apply on official site',
    result: 'Check official result',
    'admit-card': 'Download admit card',
    'answer-key': 'Open answer key',
    syllabus: 'Open official syllabus',
    admission: 'Apply on official site',
};

function getStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function getFaqs(value: unknown): FaqItem[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const question = 'question' in item && typeof item.question === 'string' ? item.question : null;
        const answer = 'answer' in item && typeof item.answer === 'string' ? item.answer : null;
        if (!question || !answer) return [];
        return [{ question, answer }];
    });
}

function getImportantLinks(value: unknown): ImportantLink[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const label = 'label' in item && typeof item.label === 'string' ? item.label : null;
        const url = 'url' in item && typeof item.url === 'string' ? item.url : null;
        if (!label || !url) return [];
        return [{ label, url }];
    });
}

function getSalaryText(item: Announcement) {
    if (!item.salaryMin && !item.salaryMax) return 'Not specified';
    if (item.salaryMin && item.salaryMax) return `Rs ${item.salaryMin.toLocaleString('en-IN')} - ${item.salaryMax.toLocaleString('en-IN')}`;
    if (item.salaryMin) return `From Rs ${item.salaryMin.toLocaleString('en-IN')}`;
    return `Up to Rs ${item.salaryMax?.toLocaleString('en-IN')}`;
}

export function DetailPage({ type }: { type: ContentType }) {
    const params = useParams<{ slug?: string | string[] }>();
    const slugParam = params.slug;
    const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [related, setRelated] = useState<CardType[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookmarked, setBookmarked] = useState(false);
    const [copied, setCopied] = useState(false);
    const [currentUrl, setCurrentUrl] = useState('');

    useEffect(() => {
        if (!slug) return;
        let cancelled = false;
        setLoading(true);

        (async () => {
            try {
                const response = await withTimeout(getAnnouncementBySlug(type, slug), 3000);
                if (!cancelled) {
                    setAnnouncement(response.data);
                    pushRecentView(buildRecentView(response.data));
                }
            } catch {
                const fallback = getFallbackAnnouncementBySlug(type, slug);
                if (!cancelled) {
                    setAnnouncement(fallback);
                    if (fallback) {
                        pushRecentView(buildRecentView(fallback));
                    }
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();

        (async () => {
            try {
                const response = await withTimeout(getAnnouncementCards({ type, sort: 'newest', limit: 6 }), 3000);
                if (!cancelled) {
                    setRelated((response.data ?? []).filter((item) => item.slug !== slug).slice(0, 3));
                }
            } catch {
                if (!cancelled) {
                    setRelated(getFallbackAnnouncementCards(type).filter((item) => item.slug !== slug).slice(0, 3));
                }
            }
        })();

        (async () => {
            try {
                const response = await withTimeout(getBookmarks(), 2500);
                if (!cancelled) {
                    setBookmarked((response.data ?? []).some((item) => item.slug === slug));
                }
            } catch {
                if (!cancelled) {
                    setBookmarked(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [slug, type]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentUrl(window.location.href);
        }
    }, [slug]);

    const sanitizedHtml = useMemo(() => {
        if (!announcement?.content) return null;
        return DOMPurify.sanitize(announcement.content);
    }, [announcement?.content]);

    if (loading) {
        return (
            <div className={styles.page}>
                <section className={styles.hero}>
                    <div className={styles.heroGrid}>
                        <div className={styles.heroCopy}>
                            <span className={styles.heroKicker}>Loading announcement</span>
                            <h1 className={styles.heroTitle}>Preparing the detail surface</h1>
                            <p className={styles.heroSub}>Fetching the latest official summary, dates, and supporting links.</p>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    if (!announcement || !slug) {
        return (
            <div className={styles.page}>
                <section className={styles.emptyState}>
                    <Icon name="Search" size={24} />
                    <h1 className={styles.emptyTitle}>Announcement not found</h1>
                    <p className={styles.sectionCopy}>This update could not be loaded. It may have moved, expired, or never existed in the current feed.</p>
                    <Link href={buildCategoryPath(type)} className={styles.primaryButton}>Back to {type} feed</Link>
                </section>
            </div>
        );
    }

    const deadlineInfo = getDeadlineInfo(announcement.deadline);
    const isStale = Date.now() - new Date(announcement.updatedAt).getTime() > 30 * 86_400_000;
    const jobDetails = (announcement.jobDetails ?? {}) as Record<string, unknown>;
    const officialPortal = typeof jobDetails.officialPortal === 'string' ? jobDetails.officialPortal : null;
    const faqItems = getFaqs(jobDetails.faqs);
    const applicationSteps = getStringArray(jobDetails.applicationSteps);
    const importantLinks = getImportantLinks(jobDetails.importantLinks);
    const schema = [
        generateBreadcrumbSchema([
            { name: 'Home', url: 'https://sarkariexams.me/' },
            { name: type, url: `https://sarkariexams.me${buildCategoryPath(type)}` },
            { name: announcement.title, url: `https://sarkariexams.me/${announcement.type}/${announcement.slug}` },
        ]),
        announcement.type === 'job' ? generateJobPostingSchema(announcement) : generateArticleSchema(announcement),
        faqItems.length > 0 ? generateFAQSchema(faqItems) : null,
    ].filter(Boolean);

    const summary = [
        { label: 'Organization', value: announcement.organization },
        { label: 'Location', value: announcement.location || 'All India / Refer notification' },
        { label: 'Qualification', value: announcement.minQualification || 'Check official notification' },
        { label: 'Salary', value: getSalaryText(announcement) },
        { label: 'Total posts', value: announcement.totalPosts?.toLocaleString('en-IN') || 'As per notice' },
        { label: 'Last updated', value: formatRelativeTime(announcement.updatedAt) || formatDate(announcement.updatedAt) },
    ];

    const quickFacts = [
        announcement.applicationFee ? { label: 'Application fee', value: announcement.applicationFee } : null,
        announcement.ageLimit ? { label: 'Age limit', value: announcement.ageLimit } : null,
        announcement.deadline ? { label: 'Deadline', value: `${formatDateTime(announcement.deadline)}${deadlineInfo ? ` · ${deadlineInfo.label}` : ''}` } : null,
    ].filter(Boolean) as Array<{ label: string; value: string }>;

    const resolvedLinks: ImportantLink[] = [
        ...importantLinks,
        announcement.externalLink ? { label: CTA_LABELS[announcement.type], url: announcement.externalLink } : null,
        officialPortal ? { label: 'Official website', url: officialPortal } : null,
    ].filter(Boolean) as ImportantLink[];

    const handleBookmark = async () => {
        try {
            if (bookmarked) {
                await removeBookmark(announcement.id);
                setBookmarked(false);
                trackEvent('bookmark_remove', { slug: announcement.slug, type: announcement.type });
            } else {
                await addBookmark(announcement.id);
                setBookmarked(true);
                trackEvent('bookmark_add', { slug: announcement.slug, type: announcement.type });
            }
        } catch {
            trackEvent('bookmark_toggle_failed', { slug: announcement.slug, type: announcement.type });
        }
    };

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({ title: announcement.title, url: currentUrl || window.location.href });
            } else {
                await navigator.clipboard.writeText(currentUrl || window.location.href);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1800);
            }
            trackEvent('detail_share', { slug: announcement.slug, type: announcement.type });
        } catch {
            /* noop */
        }
    };

    return (
        <div className={styles.page}>
            {schema.length > 0 ? (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
                />
            ) : null}

            <PublicCategoryRail activeType={type} />

            <section className={styles.hero}>
                <div className={styles.detailHero}>
                    <div className={styles.heroMetaRow}>
                        <span className={styles.heroKicker}>
                            <Icon name={CATEGORY_META[type].icon as Parameters<typeof Icon>[0]['name']} size={16} />
                            {CATEGORY_META[type].labelEn}
                        </span>
                        {deadlineInfo ? <span className={styles.softChip}>{deadlineInfo.label}</span> : null}
                        {isStale ? <span className={styles.softChip}>Verify on official site before acting</span> : null}
                    </div>

                    <h1 className={styles.heroTitle}>{announcement.title}</h1>
                    <p className={styles.heroSub}>
                        {announcement.organization} update published on {formatDate(announcement.postedAt)}. Use the summary first, then move to official links and the detailed notice.
                    </p>

                    <div className={styles.metaChips}>
                        <span className={styles.metaChip}><Icon name="Building2" size={15} />{announcement.organization}</span>
                        {announcement.location ? <span className={styles.metaChip}><Icon name="MapPinned" size={15} />{announcement.location}</span> : null}
                        <span className={styles.metaChip}><Icon name="CalendarClock" size={15} />Posted {formatDate(announcement.postedAt)}</span>
                        <span className={styles.metaChip}><Icon name="Sparkles" size={15} />{announcement.viewCount.toLocaleString('en-IN')} views</span>
                    </div>
                </div>

                <div className={styles.summaryGrid}>
                    {summary.map((item) => (
                        <div key={item.label} className={styles.summaryCard}>
                            <span className={styles.summaryLabel}>{item.label}</span>
                            <strong className={styles.summaryValue}>{item.value}</strong>
                        </div>
                    ))}
                </div>
            </section>

            <div className={styles.detailLayout}>
                <div className={styles.articleColumn}>
                    {isStale ? (
                        <section className={styles.contentPanel}>
                            <div className={styles.panelHeaderBlock}>
                                <p className={styles.sectionEyebrow}>Stale-data warning</p>
                                <h2 className={styles.panelTitle}>This update may have changed</h2>
                            </div>
                            <p className={styles.panelCopy}>The page was last updated on {formatDate(announcement.updatedAt)}. Confirm dates, fees, and links on the official source before acting.</p>
                        </section>
                    ) : null}

                    <section className={styles.contentPanel}>
                        <div className={styles.panelHeaderBlock}>
                            <p className={styles.sectionEyebrow}>Overview</p>
                            <h2 className={styles.panelTitle}>Decision summary</h2>
                        </div>
                        <div className={styles.keyGrid}>
                            {quickFacts.length > 0 ? quickFacts.map((item) => (
                                <div key={item.label} className={styles.keyBlock}>
                                    <span className={styles.summaryLabel}>{item.label}</span>
                                    <strong>{item.value}</strong>
                                </div>
                            )) : (
                                <div className={styles.keyBlock}>
                                    <span className={styles.summaryLabel}>Status</span>
                                    <strong>See official notification for full conditions.</strong>
                                </div>
                            )}
                        </div>
                    </section>

                    {announcement.importantDates && announcement.importantDates.length > 0 ? (
                        <section className={styles.contentPanel}>
                            <div className={styles.panelHeaderBlock}>
                                <p className={styles.sectionEyebrow}>Important dates</p>
                                <h2 className={styles.panelTitle}>Timeline at a glance</h2>
                            </div>
                            <div className={styles.dateList}>
                                {announcement.importantDates.map((item) => (
                                    <div key={item.id ?? item.eventName} className={styles.listCard}>
                                        <span className={styles.railItemTitle}>{item.eventName}</span>
                                        <span className={styles.listMeta}>
                                            <span>{formatDate(item.eventDate)}</span>
                                            {item.description ? <span>{item.description}</span> : null}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {applicationSteps.length > 0 ? (
                        <section className={styles.contentPanel}>
                            <div className={styles.panelHeaderBlock}>
                                <p className={styles.sectionEyebrow}>How to apply</p>
                                <h2 className={styles.panelTitle}>Action checklist</h2>
                            </div>
                            <div className={styles.moduleList}>
                                {applicationSteps.map((step) => (
                                    <div key={step} className={styles.moduleItem}>
                                        <Icon name="ArrowRight" size={16} />
                                        <span>{step}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {sanitizedHtml ? (
                        <section className={styles.contentPanel}>
                            <div className={styles.panelHeaderBlock}>
                                <p className={styles.sectionEyebrow}>Official summary</p>
                                <h2 className={styles.panelTitle}>Detailed notice</h2>
                            </div>
                            <div className={styles.richContent} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                        </section>
                    ) : null}

                    {faqItems.length > 0 ? (
                        <section className={styles.contentPanel}>
                            <div className={styles.panelHeaderBlock}>
                                <p className={styles.sectionEyebrow}>FAQs</p>
                                <h2 className={styles.panelTitle}>Common questions</h2>
                            </div>
                            <div className={styles.faqList}>
                                {faqItems.map((item) => (
                                    <details key={item.question} className={styles.faqItem}>
                                        <summary>{item.question}</summary>
                                        <p>{item.answer}</p>
                                    </details>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {related.length > 0 ? (
                        <section className={styles.contentPanel}>
                            <div className={styles.panelHeaderBlock}>
                                <p className={styles.sectionEyebrow}>Related updates</p>
                                <h2 className={styles.panelTitle}>Keep browsing without losing context</h2>
                            </div>
                            <div className={styles.relatedGrid}>
                                {related.map((item) => (
                                    <AnnouncementCard key={item.id} card={item} sourceTag="detail_related" />
                                ))}
                            </div>
                        </section>
                    ) : null}
                </div>

                <aside className={styles.sidebarColumn}>
                    <section className={styles.asidePanel}>
                        <div className={styles.panelHeaderBlock}>
                            <p className={styles.sectionEyebrow}>Official links</p>
                            <h2 className={styles.panelTitle}>Primary actions</h2>
                        </div>
                        <div className={styles.moduleList}>
                            {resolvedLinks.length > 0 ? resolvedLinks.map((item) => (
                                <a
                                    key={`${item.label}-${item.url}`}
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={styles.primaryButton}
                                    onClick={() => trackEvent('official_link_click', { slug: announcement.slug, type: announcement.type, label: item.label })}
                                >
                                    <Icon name="ExternalLink" size={16} />
                                    {item.label}
                                </a>
                            )) : (
                                <Link href={buildCategoryPath(type)} className={styles.secondaryButton}>Back to category feed</Link>
                            )}
                        </div>
                    </section>

                    <section className={styles.asidePanel}>
                        <div className={styles.panelHeaderBlock}>
                            <p className={styles.sectionEyebrow}>Trust panel</p>
                            <h2 className={styles.panelTitle}>Before you act</h2>
                        </div>
                        <ul className={styles.trustList}>
                            <li className={styles.trustItem}><Icon name="ShieldCheck" size={17} /><span>Always verify dates, fees, and post count on the official notice.</span></li>
                            <li className={styles.trustItem}><Icon name="CalendarClock" size={17} /><span>Use the deadline state above; do not wait until the final hour.</span></li>
                            <li className={styles.trustItem}><Icon name="Search" size={17} /><span>If anything looks inconsistent, compare it with the category feed or report the issue.</span></li>
                        </ul>
                    </section>

                    {announcement.tags && announcement.tags.length > 0 ? (
                        <section className={styles.asidePanel}>
                            <div className={styles.panelHeaderBlock}>
                                <p className={styles.sectionEyebrow}>Tags</p>
                                <h2 className={styles.panelTitle}>Quick context</h2>
                            </div>
                            <div className={styles.chipRow}>
                                {announcement.tags.map((tag) => (
                                    <span key={tag.id} className={styles.softChip}>{tag.name}</span>
                                ))}
                            </div>
                        </section>
                    ) : null}
                </aside>
            </div>

            <div className={styles.mobileBar}>
                <div className={styles.mobileBarActions}>
                    <a href={announcement.externalLink || officialPortal || buildCategoryPath(type)} target="_blank" rel="noreferrer" className={`${styles.primaryButton} ${styles.mobilePrimary}`}>
                        {CTA_LABELS[announcement.type]}
                    </a>
                    <button type="button" className={`${styles.secondaryButton} ${styles.mobileIconButton}`} onClick={handleBookmark} aria-label="Toggle bookmark">
                        <Icon name={bookmarked ? 'Bookmark' : 'Bookmark'} size={16} />
                    </button>
                    <button type="button" className={`${styles.secondaryButton} ${styles.mobileIconButton}`} onClick={handleShare} aria-label="Share update">
                        <Icon name="ArrowRight" size={16} />
                    </button>
                </div>
            </div>

            <div className={styles.toolbarGroup}>
                <button type="button" className={styles.secondaryButton} onClick={handleBookmark}>
                    <Icon name="Bookmark" size={16} />
                    {bookmarked ? 'Remove bookmark' : 'Bookmark'}
                </button>
                <button type="button" className={styles.secondaryButton} onClick={handleShare}>
                    <Icon name="ArrowRight" size={16} />
                    {copied ? 'Copied link' : 'Share'}
                </button>
                <button type="button" className={styles.ghostButton} onClick={() => window.print()}>
                    <Icon name="BookOpenText" size={16} />
                    Print
                </button>
            </div>
        </div>
    );
}
