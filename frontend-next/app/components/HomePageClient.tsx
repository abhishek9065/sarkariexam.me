'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { AnnouncementCard } from '@/app/components/AnnouncementCard';
import { Icon } from '@/app/components/Icon';
import { PublicCategoryRail } from '@/app/components/PublicCategoryRail';
import styles from '@/app/components/PortalSurface.module.css';
import { getBookmarkIds, getHomepageFeed } from '@/app/lib/api';
import { trackEvent } from '@/app/lib/analytics';
import { getFallbackHomepageFeed } from '@/app/lib/fallbackData';
import { getInterests, getRecentViews, getSavedSearchDrafts, setInterests, type SavedSearchDraft } from '@/app/lib/personalization';
import type { AnnouncementCard as CardType, ContentType, HomepageFeedData } from '@/app/lib/types';
import {
    CATEGORY_META,
    EXAM_FAMILY_SHORTCUTS,
    STATE_SHORTCUTS,
    TRUST_PILLARS,
    copyFor,
    formatDate,
    getDeadlineInfo,
    getDaysUntil,
    isFresh,
} from '@/app/lib/ui';
import { useAuth } from '@/app/lib/useAuth';
import { useLanguage } from '@/app/lib/useLanguage';

function RailSection({
    title,
    eyebrow,
    items,
    viewAllHref,
}: {
    title: string;
    eyebrow: string;
    items: CardType[];
    viewAllHref: string;
}) {
    return (
        <section className={styles.railCard}>
            <div className={styles.railHead}>
                <div className={styles.sectionHeaderBlock}>
                    <p className={styles.sectionEyebrow}>{eyebrow}</p>
                    <h2 className={styles.railTitle}>{title}</h2>
                </div>
                <Link href={viewAllHref} className={styles.linkButton}>View all</Link>
            </div>
            <div className={styles.railBody}>
                {items.map((item) => {
                    const deadlineInfo = getDeadlineInfo(item.deadline);
                    return (
                        <Link key={item.id} href={`/${item.type}/${item.slug}`} className={styles.railItem}>
                            <span className={styles.railItemTitle}>{item.title}</span>
                            <span className={styles.railItemMeta}>
                                <span>{item.organization}</span>
                                <span>{formatDate(item.deadline ?? item.postedAt)}</span>
                                {deadlineInfo ? <span>{deadlineInfo.label}</span> : null}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}

export function HomePage() {
    const router = useRouter();
    const { user } = useAuth();
    const { language } = useLanguage();

    const [query, setQuery] = useState('');
    const [feed, setFeed] = useState<HomepageFeedData>(getFallbackHomepageFeed());
    const [loading, setLoading] = useState(true);
    const [bookmarkIds, setBookmarkIds] = useState<string[]>([]);
    const [recentViews, setRecentViews] = useState(getRecentViews());
    const [savedSearches, setSavedSearches] = useState<SavedSearchDraft[]>(getSavedSearchDrafts());
    const [interests, setInterestState] = useState<ContentType[]>(() => {
        const stored = getInterests();
        return stored.length > 0 ? stored : ['job', 'result', 'admit-card'];
    });

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const response = await getHomepageFeed();
                if (!cancelled) {
                    setFeed(response.data);
                }
            } catch {
                if (!cancelled) {
                    setFeed(getFallbackHomepageFeed());
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        setRecentViews(getRecentViews());
        setSavedSearches(getSavedSearchDrafts());
    }, []);

    useEffect(() => {
        if (!user) {
            setBookmarkIds([]);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const response = await getBookmarkIds();
                if (!cancelled) {
                    setBookmarkIds(response.data ?? []);
                }
            } catch {
                if (!cancelled) {
                    setBookmarkIds([]);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user]);

    const latest = feed.latest;
    const sections = feed.sections;
    const todayCount = latest.filter((item) => isFresh(item.postedAt, 1)).length;
    const deadlineToday = [...sections.job, ...sections.admission].filter((item) => getDaysUntil(item.deadline) === 0).slice(0, 4);
    const freshJobs = sections.job.filter((item) => isFresh(item.postedAt, 3)).slice(0, 4);
    const newResults = sections.result.filter((item) => isFresh(item.postedAt, 3)).slice(0, 4);
    const admitCards = sections['admit-card'].slice(0, 4);
    const answerKeys = sections['answer-key'].slice(0, 4);
    const admissions = sections.admission.slice(0, 4);
    const calendarItems = [...sections.job, ...sections.admission]
        .filter((item) => item.deadline)
        .sort((left, right) => new Date(left.deadline ?? left.postedAt).getTime() - new Date(right.deadline ?? right.postedAt).getTime())
        .slice(0, 6);
    const personalizedFeed = latest.filter((item) => interests.includes(item.type)).slice(0, 4);

    const heroStats = [
        { label: copyFor(language, 'Updates today', 'आज के अपडेट'), value: todayCount.toString() },
        { label: copyFor(language, 'Bookmarks', 'बुकमार्क्स'), value: bookmarkIds.length.toString() },
        { label: copyFor(language, 'Saved searches', 'सेव्ड सर्च'), value: savedSearches.length.toString() },
        { label: copyFor(language, 'Recent views', 'रिसेंट व्यू'), value: recentViews.length.toString() },
    ];

    const handleSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const next = query.trim();
        if (!next) return;
        trackEvent('home_search_submit', { query: next });
        router.push(`/jobs?q=${encodeURIComponent(next)}&source=home_hero`);
    };

    const toggleInterest = (type: ContentType) => {
        const next = interests.includes(type)
            ? interests.filter((item) => item !== type)
            : [...interests, type];
        const normalized = next.length > 0 ? next : [type];
        setInterestState(normalized);
        setInterests(normalized);
        trackEvent('interest_toggle', { type, enabled: !interests.includes(type) });
    };

    return (
        <div className={styles.page}>
            <section className={styles.hero} data-testid="homepage-hero">
                <div className={styles.heroGrid}>
                    <div className={styles.heroCopy}>
                        <span className={styles.heroKicker}>
                            <Icon name="ShieldCheck" size={16} />
                            {copyFor(language, '2026 Sarkari command center', '2026 सरकारी कमांड सेंटर')}
                        </span>

                        <h1 className={styles.heroTitle}>
                            {copyFor(language, 'Find the right', 'सही')}
                            {' '}
                            <span className={styles.heroAccent}>
                                {copyFor(language, 'government update faster.', 'सरकारी अपडेट जल्दी पाएँ।')}
                            </span>
                        </h1>

                        <p className={styles.heroSub}>
                            {copyFor(
                                language,
                                'Built for serious exam and job seekers: dense official updates, deadline urgency, mobile-first scanning, and cleaner decision-making across jobs, results, admit cards, answer keys, syllabus, and admissions.',
                                'यह अनुभव गंभीर परीक्षा और नौकरी उम्मीदवारों के लिए बनाया गया है: डेंस ऑफिशियल अपडेट, डेडलाइन अर्जेंसी, मोबाइल-फर्स्ट स्कैनिंग और जॉब्स, रिजल्ट, एडमिट कार्ड, आंसर की, सिलेबस और एडमिशन के लिए साफ़ निर्णय सतह।',
                            )}
                        </p>

                        <form className={styles.searchForm} role="search" onSubmit={handleSearch}>
                            <div className={styles.searchField}>
                                <Icon name="Search" size={18} />
                                <input
                                    type="search"
                                    className={styles.searchInput}
                                    placeholder={copyFor(language, 'Search exam, department, state, or qualification', 'एग्जाम, विभाग, राज्य या क्वालिफिकेशन सर्च करें')}
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                />
                            </div>
                            <button type="submit" className={styles.primaryButton}>
                                <Icon name="ArrowRight" size={18} />
                                {copyFor(language, 'Search all jobs', 'सभी जॉब्स सर्च करें')}
                            </button>
                        </form>

                        <div className={styles.heroMetaRow}>
                            {EXAM_FAMILY_SHORTCUTS.slice(0, 6).map((item) => (
                                <Link key={item.label} href={item.href} className={styles.softChip}>
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className={styles.heroStats}>
                        {heroStats.map((item) => (
                            <div key={item.label} className={styles.statCard}>
                                <span className={styles.statLabel}>{item.label}</span>
                                <strong className={styles.statValue}>{item.value}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <PublicCategoryRail />

            <section className={styles.section} data-testid="homepage-urgency">
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionHeaderBlock}>
                        <p className={styles.sectionEyebrow}>{copyFor(language, 'What changed now', 'अभी क्या बदला')}</p>
                        <h2 className={styles.sectionTitle}>{copyFor(language, 'Urgency rails', 'अर्जेंसी रेल्स')}</h2>
                        <p className={styles.sectionCopy}>
                            {copyFor(language, 'The fastest scan for deadline pressure and newly released updates.', 'डेडलाइन प्रेशर और नई रिलीज़ हुई अपडेट्स के लिए सबसे तेज़ स्कैन।')}
                        </p>
                    </div>
                </div>

                <div className={styles.railGrid}>
                    <RailSection title="Last Date Today" eyebrow="Act now" items={deadlineToday.length > 0 ? deadlineToday : sections.job.slice(0, 4)} viewAllHref="/jobs?sort=deadline" />
                    <RailSection title="Fresh Jobs" eyebrow="Recruitment" items={freshJobs.length > 0 ? freshJobs : sections.job.slice(0, 4)} viewAllHref={CATEGORY_META.job.href} />
                    <RailSection title="New Results" eyebrow="Results" items={newResults.length > 0 ? newResults : sections.result.slice(0, 4)} viewAllHref={CATEGORY_META.result.href} />
                </div>

                <div className={styles.railGrid}>
                    <RailSection title="Admit Cards Released" eyebrow="Exam access" items={admitCards} viewAllHref={CATEGORY_META['admit-card'].href} />
                    <RailSection title="Answer Keys" eyebrow="Challenge windows" items={answerKeys} viewAllHref={CATEGORY_META['answer-key'].href} />
                    <RailSection title="Admissions" eyebrow="Application forms" items={admissions} viewAllHref={CATEGORY_META.admission.href} />
                </div>
            </section>

            <div className={styles.contentGrid}>
                <div className={styles.mainStack}>
                    <section className={styles.panel} data-testid="homepage-command-board">
                        <div className={styles.panelHeader}>
                            <div className={styles.panelHeaderBlock}>
                                <p className={styles.sectionEyebrow}>Command board</p>
                                <h2 className={styles.panelTitle}>High-signal updates</h2>
                                <p className={styles.panelCopy}>
                                    {loading
                                        ? 'Refreshing live homepage feed.'
                                        : 'Focused cards for the most important current job, result, and exam updates.'}
                                </p>
                            </div>
                        </div>
                        <div className={styles.cardGrid} style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                            {latest.slice(0, 6).map((item) => (
                                <AnnouncementCard key={item.id} card={item} sourceTag="home_command_board" />
                            ))}
                        </div>
                    </section>

                    <section className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <div className={styles.panelHeaderBlock}>
                                <p className={styles.sectionEyebrow}>Live calendar</p>
                                <h2 className={styles.panelTitle}>Upcoming deadlines and exam windows</h2>
                            </div>
                            <Link href="/jobs?sort=deadline" className={styles.linkButton}>View full feed</Link>
                        </div>
                        <div className={styles.scheduleList}>
                            {calendarItems.map((item) => (
                                <Link key={item.id} href={`/${item.type}/${item.slug}`} className={styles.scheduleItem}>
                                    <span className={styles.railItemTitle}>{item.title}</span>
                                    <span className={styles.scheduleMeta}>
                                        <span>{item.organization}</span>
                                        <span>{formatDate(item.deadline ?? item.postedAt)}</span>
                                        {item.deadline ? <span>{getDeadlineInfo(item.deadline)?.label}</span> : null}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </section>
                </div>

                <aside className={styles.sideStack}>
                    <section className={styles.panel} data-testid="homepage-personalized">
                        <div className={styles.panelHeader}>
                            <div className={styles.panelHeaderBlock}>
                                <p className={styles.sectionEyebrow}>My desk</p>
                                <h2 className={styles.panelTitle}>{user ? `Welcome back, ${user.username}` : 'Personalized shortcuts'}</h2>
                            </div>
                        </div>

                        <div className={styles.chipRow}>
                            {(Object.keys(CATEGORY_META) as ContentType[]).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    className={`${styles.preferenceChip}${interests.includes(type) ? ` ${styles.preferenceChipActive}` : ''}`}
                                    onClick={() => toggleInterest(type)}
                                >
                                    {CATEGORY_META[type].shortEn}
                                </button>
                            ))}
                        </div>

                        <div className={styles.moduleList}>
                            {personalizedFeed.map((item) => (
                                <Link key={item.id} href={`/${item.type}/${item.slug}`} className={styles.moduleLink}>
                                    <span className={styles.railItemTitle}>{item.title}</span>
                                    <span className={styles.listMeta}>
                                        <span>{item.organization}</span>
                                        <span>{CATEGORY_META[item.type].shortEn}</span>
                                    </span>
                                </Link>
                            ))}
                        </div>

                        {savedSearches.length > 0 ? (
                            <>
                                <div className={styles.panelHeaderBlock}>
                                    <p className={styles.sectionEyebrow}>Saved searches</p>
                                </div>
                                <div className={styles.chipRow}>
                                    {savedSearches.slice(0, 4).map((item) => (
                                        <Link key={item.id} href={`/jobs?q=${encodeURIComponent(item.query)}`} className={styles.softChip}>
                                            {item.name}
                                        </Link>
                                    ))}
                                </div>
                            </>
                        ) : null}

                        {recentViews.length > 0 ? (
                            <>
                                <div className={styles.panelHeaderBlock}>
                                    <p className={styles.sectionEyebrow}>Recent views</p>
                                </div>
                                <div className={styles.moduleList}>
                                    {recentViews.slice(0, 4).map((item) => (
                                        <Link key={item.id} href={`/${item.type}/${item.slug}`} className={styles.moduleLink}>
                                            <span className={styles.railItemTitle}>{item.title}</span>
                                            <span className={styles.listMeta}>
                                                <span>{item.organization}</span>
                                                <span>{CATEGORY_META[item.type].shortEn}</span>
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </>
                        ) : null}
                    </section>

                    <section className={styles.panel}>
                        <div className={styles.panelHeaderBlock}>
                            <p className={styles.sectionEyebrow}>Browse faster</p>
                            <h2 className={styles.panelTitle}>State shortcuts</h2>
                        </div>
                        <div className={styles.shortcutGrid}>
                            {STATE_SHORTCUTS.map((state) => (
                                <Link key={state} href={`/jobs?q=${encodeURIComponent(state)}`} className={styles.shortcutLink}>
                                    {state}
                                </Link>
                            ))}
                        </div>
                    </section>

                    <section className={styles.panel}>
                        <div className={styles.panelHeaderBlock}>
                            <p className={styles.sectionEyebrow}>Why this feels clearer</p>
                            <h2 className={styles.panelTitle}>Trust cues</h2>
                        </div>
                        <ul className={styles.trustList}>
                            {TRUST_PILLARS.map((item) => (
                                <li key={item.titleEn} className={styles.trustItem}>
                                    <Icon name="ShieldCheck" size={17} />
                                    <div>
                                        <strong>{copyFor(language, item.titleEn, item.titleHi)}</strong>
                                        <div className={styles.hint}>{copyFor(language, item.copyEn, item.copyHi)}</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                </aside>
            </div>
        </div>
    );
}
