'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnnouncementCard, AnnouncementCardSkeleton } from '@/app/components/AnnouncementCard';
import { Icon } from '@/app/components/Icon';
import styles from '@/app/components/PortalSurface.module.css';
import { PublicCategoryRail } from '@/app/components/PublicCategoryRail';
import { CategoryListRow } from '@/app/components/category/CategoryListRow';
import { getAnnouncementCards, getOrganizations } from '@/app/lib/api';
import { trackEvent } from '@/app/lib/analytics';
import { getFallbackAnnouncementCards, getFallbackOrganizations } from '@/app/lib/fallbackData';
import { pushSavedSearchDraft } from '@/app/lib/personalization';
import type { AnnouncementCard as CardType, ContentType } from '@/app/lib/types';
import {
    CATEGORY_META,
    EXAM_FAMILY_SHORTCUTS,
    copyFor,
    filterByDeadlineStatus,
    formatDate,
    getDeadlineInfo,
} from '@/app/lib/ui';
import { useLanguage } from '@/app/lib/useLanguage';

type SortValue = 'newest' | 'oldest' | 'deadline' | 'views';
type ViewMode = 'list' | 'cards';
type DeadlineStatus = 'all' | 'open' | 'closing' | 'expired';

const QUALIFICATIONS = ['10th Pass', '12th Pass', 'ITI', 'Diploma', 'Graduate', 'Post Graduate', 'Engineering'];
const STATES = ['All India', 'Uttar Pradesh', 'Bihar', 'Rajasthan', 'Madhya Pradesh', 'Maharashtra', 'Delhi', 'Jharkhand', 'Punjab', 'Haryana', 'West Bengal'];

const CATEGORY_COPY: Record<ContentType, { eyebrow: string; description: string; chips: string[] }> = {
    job: {
        eyebrow: 'Eligibility-first browsing',
        description: 'Dense, mobile-first recruitment browsing with deadline awareness, organization filters, qualification shortcuts, and saved searches.',
        chips: ['SSC', 'UPSC', 'Railway', 'Banking', 'Police', 'Teaching'],
    },
    result: {
        eyebrow: 'Result tracker',
        description: 'Scan released scorecards and merit updates faster, without hunting across scattered boards and category pages.',
        chips: ['UPSC', 'SSC', 'State PSC', 'Railway', 'Banking', 'Bihar'],
    },
    'admit-card': {
        eyebrow: 'Exam access feed',
        description: 'Find hall tickets, exam city slips, and region-wise admit card links from one clean command surface.',
        chips: ['SSC', 'RRB', 'UPSC', 'NTA', 'Defence', 'Bank'],
    },
    'answer-key': {
        eyebrow: 'Challenge windows',
        description: 'Track provisional answer keys, objections, and final key updates without losing the exam context.',
        chips: ['SSC', 'UPSC', 'Railway', 'CBSE', 'CTET', 'NTA'],
    },
    syllabus: {
        eyebrow: 'Preparation anchor',
        description: 'Keep the official syllabus and exam pattern close while comparing updates across major exams and boards.',
        chips: ['SSC CGL', 'UPSC', 'RRB', 'NDA', 'IBPS', 'Teaching'],
    },
    admission: {
        eyebrow: 'Application window tracker',
        description: 'Monitor admission forms, counselling timelines, and university entrance cycles from one deadline-focused workspace.',
        chips: ['NEET UG', 'CUET', 'Engineering', 'Medical', 'Diploma', 'UP BEd'],
    },
};

function sortCards(cards: CardType[], sort: SortValue) {
    const next = [...cards];
    if (sort === 'views') {
        return next.sort((left, right) => (right.viewCount ?? 0) - (left.viewCount ?? 0));
    }
    if (sort === 'oldest') {
        return next.sort((left, right) => new Date(left.postedAt).getTime() - new Date(right.postedAt).getTime());
    }
    if (sort === 'deadline') {
        return next.sort((left, right) => new Date(left.deadline ?? left.postedAt).getTime() - new Date(right.deadline ?? right.postedAt).getTime());
    }
    return next.sort((left, right) => new Date(right.postedAt).getTime() - new Date(left.postedAt).getTime());
}

function fallbackCardsForType(type: ContentType, filters: {
    search: string;
    organization: string;
    location: string;
    qualification: string;
    deadlineStatus: DeadlineStatus;
    sort: SortValue;
}) {
    const qualificationTerm = filters.qualification.toLowerCase();
    const searched = getFallbackAnnouncementCards(type).filter((item) => {
        const haystack = `${item.title} ${item.organization} ${item.location ?? ''}`.toLowerCase();
        if (filters.search && !haystack.includes(filters.search.toLowerCase())) return false;
        if (filters.organization && !item.organization.toLowerCase().includes(filters.organization.toLowerCase())) return false;
        if (filters.location && !(item.location ?? '').toLowerCase().includes(filters.location.toLowerCase())) return false;
        if (filters.qualification && !haystack.includes(qualificationTerm)) return false;
        return true;
    });

    return sortCards(filterByDeadlineStatus(searched, filters.deadlineStatus), filters.sort);
}

export function CategoryPage({ type }: { type: ContentType }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { language } = useLanguage();

    const meta = CATEGORY_META[type];
    const copy = CATEGORY_COPY[type];
    const [organizations, setOrganizations] = useState<string[]>(getFallbackOrganizations());
    const [cards, setCards] = useState<CardType[]>([]);
    const [loading, setLoading] = useState(true);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [visibleCount, setVisibleCount] = useState(18);
    const [draftSearch, setDraftSearch] = useState(searchParams.get('q') ?? '');
    const [draftOrganization, setDraftOrganization] = useState(searchParams.get('organization') ?? '');
    const [draftLocation, setDraftLocation] = useState(searchParams.get('location') ?? '');
    const [draftQualification, setDraftQualification] = useState(searchParams.get('qualification') ?? '');

    const sort = (searchParams.get('sort') as SortValue) || 'newest';
    const view = (searchParams.get('view') as ViewMode) || 'list';
    const deadlineStatus = (searchParams.get('status') as DeadlineStatus) || 'all';
    const search = searchParams.get('q') ?? '';
    const organization = searchParams.get('organization') ?? '';
    const location = searchParams.get('location') ?? '';
    const qualification = searchParams.get('qualification') ?? '';

    useEffect(() => {
        setDraftSearch(search);
        setDraftOrganization(organization);
        setDraftLocation(location);
        setDraftQualification(qualification);
    }, [location, organization, qualification, search]);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const response = await getOrganizations();
                const next = [...new Set((response.data ?? []).filter(Boolean))];
                if (!cancelled && next.length > 0) {
                    setOrganizations(next);
                }
            } catch {
                if (!cancelled) {
                    setOrganizations(getFallbackOrganizations());
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setVisibleCount(18);

        (async () => {
            try {
                const response = await getAnnouncementCards({
                    type,
                    search: search || undefined,
                    organization: organization || undefined,
                    location: location || undefined,
                    qualification: qualification || undefined,
                    sort,
                    limit: 48,
                });
                if (!cancelled) {
                    const next = filterByDeadlineStatus(response.data ?? [], deadlineStatus);
                    setCards(sortCards(next, sort));
                }
            } catch {
                if (!cancelled) {
                    setCards(fallbackCardsForType(type, {
                        search,
                        organization,
                        location,
                        qualification,
                        deadlineStatus,
                        sort,
                    }));
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
    }, [deadlineStatus, location, organization, qualification, search, sort, type]);

    useEffect(() => {
        if (!sheetOpen) return undefined;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, [sheetOpen]);

    const updateParams = (nextValues: Record<string, string>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(nextValues).forEach(([key, value]) => {
            if (value) params.set(key, value);
            else params.delete(key);
        });
        const next = params.toString();
        router.replace(next ? `?${next}` : window.location.pathname);
    };

    const applyFilters = () => {
        updateParams({
            q: draftSearch,
            organization: draftOrganization,
            location: draftLocation,
            qualification: draftQualification,
        });
        setSheetOpen(false);
        trackEvent('category_filters_apply', { type, q: draftSearch, organization: draftOrganization, location: draftLocation, qualification: draftQualification });
    };

    const resetFilters = () => {
        setDraftSearch('');
        setDraftOrganization('');
        setDraftLocation('');
        setDraftQualification('');
        updateParams({ q: '', organization: '', location: '', qualification: '', status: '' });
        setSheetOpen(false);
    };

    const activeFilters = [
        search ? { label: `“${search}”`, key: 'q' } : null,
        organization ? { label: organization, key: 'organization' } : null,
        location ? { label: location, key: 'location' } : null,
        qualification ? { label: qualification, key: 'qualification' } : null,
        deadlineStatus !== 'all' ? { label: deadlineStatus, key: 'status' } : null,
    ].filter(Boolean) as Array<{ label: string; key: string }>;

    const visibleCards = cards.slice(0, visibleCount);
    const closingSoon = cards.filter((item) => {
        const deadline = getDeadlineInfo(item.deadline);
        return deadline && !deadline.expired && deadline.daysLeft != null && deadline.daysLeft <= 7;
    }).slice(0, 3);

    const saveCurrentSearch = () => {
        const label = search || organization || location || qualification || meta.labelEn;
        pushSavedSearchDraft({
            name: `${meta.shortEn}: ${label}`,
            query: search || label,
            type,
        });
        trackEvent('category_saved_search', { type, search, organization, location, qualification });
    };

    return (
        <div className={styles.page} data-testid={`category-page-${type}`}>
            <section className={styles.hero}>
                <div className={styles.heroGrid}>
                    <div className={styles.heroCopy}>
                        <span className={styles.heroKicker}>
                            <Icon name={meta.icon as Parameters<typeof Icon>[0]['name']} size={16} />
                            {copy.eyebrow}
                        </span>
                        <h1 className={styles.heroTitle}>
                            {meta.labelEn.split(' ')[0]}
                            {' '}
                            <span className={styles.heroAccent}>{meta.labelEn.split(' ').slice(1).join(' ') || meta.labelEn}</span>
                        </h1>
                        <p className={styles.heroSub}>{copy.description}</p>
                        <div className={styles.heroMetaRow}>
                            {copy.chips.map((chip) => (
                                <button key={chip} type="button" className={styles.softChip} onClick={() => updateParams({ q: chip })}>
                                    {chip}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.heroStats}>
                        <div className={styles.statCard}>
                            <span className={styles.statLabel}>Live updates</span>
                            <strong className={styles.statValue}>{cards.length}</strong>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statLabel}>Closing soon</span>
                            <strong className={styles.statValue}>{closingSoon.length}</strong>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statLabel}>Active filters</span>
                            <strong className={styles.statValue}>{activeFilters.length}</strong>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statLabel}>Sort mode</span>
                            <strong className={styles.statValue}>{sort}</strong>
                        </div>
                    </div>
                </div>
            </section>

            <PublicCategoryRail activeType={type} />

            <section className={styles.filterBar}>
                <div className={styles.panelHeader}>
                    <div className={styles.panelHeaderBlock}>
                        <p className={styles.sectionEyebrow}>{copyFor(language, 'Search within this category', 'इस कैटेगरी में सर्च')}</p>
                        <h2 className={styles.panelTitle}>Filters that actually narrow the feed</h2>
                    </div>
                    <div className={styles.toolbarGroup}>
                        <button type="button" className={styles.secondaryButton} onClick={saveCurrentSearch}>
                            <Icon name="Bookmark" size={16} />
                            Save search
                        </button>
                        <button type="button" className={styles.secondaryButton} onClick={() => setSheetOpen(true)}>
                            <Icon name="Filter" size={16} />
                            Mobile filters
                        </button>
                    </div>
                </div>

                <div className={styles.filterGrid}>
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>Keyword</span>
                        <input className={styles.fieldControl} value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder={`Search ${meta.shortEn.toLowerCase()}`} />
                    </label>
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>Organization</span>
                        <select className={styles.fieldSelect} value={draftOrganization} onChange={(event) => setDraftOrganization(event.target.value)}>
                            <option value="">All organizations</option>
                            {organizations.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </label>
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>State</span>
                        <select className={styles.fieldSelect} value={draftLocation} onChange={(event) => setDraftLocation(event.target.value)}>
                            <option value="">All states</option>
                            {STATES.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </label>
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>Qualification</span>
                        <select className={styles.fieldSelect} value={draftQualification} onChange={(event) => setDraftQualification(event.target.value)}>
                            <option value="">All levels</option>
                            {QUALIFICATIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </label>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.toolbarGroup}>
                        <label className={styles.field}>
                            <span className={styles.fieldLabel}>Deadline</span>
                            <select className={styles.fieldSelect} value={deadlineStatus} onChange={(event) => updateParams({ status: event.target.value })}>
                                <option value="all">All</option>
                                <option value="open">Open</option>
                                <option value="closing">Closing soon</option>
                                <option value="expired">Expired</option>
                            </select>
                        </label>

                        <label className={styles.field}>
                            <span className={styles.fieldLabel}>Sort</span>
                            <select className={styles.fieldSelect} value={sort} onChange={(event) => updateParams({ sort: event.target.value })}>
                                <option value="newest">Newest first</option>
                                <option value="deadline">Deadline</option>
                                <option value="views">Most viewed</option>
                                <option value="oldest">Oldest</option>
                            </select>
                        </label>
                    </div>

                    <div className={styles.toolbarGroup}>
                        <div className={styles.toggleGroup} role="group" aria-label="View mode">
                            <button type="button" className={`${styles.toggleButton}${view === 'list' ? ` ${styles.toggleActive}` : ''}`} onClick={() => updateParams({ view: 'list' })}>List</button>
                            <button type="button" className={`${styles.toggleButton}${view === 'cards' ? ` ${styles.toggleActive}` : ''}`} onClick={() => updateParams({ view: 'cards' })}>Cards</button>
                        </div>
                        <button type="button" className={styles.primaryButton} onClick={applyFilters}>Apply filters</button>
                        <button type="button" className={styles.ghostButton} onClick={resetFilters}>Reset</button>
                    </div>
                </div>
            </section>

            {activeFilters.length > 0 ? (
                <div className={styles.activeFilters}>
                    {activeFilters.map((item) => (
                        <span key={item.key} className={styles.activeChip}>
                            {item.label}
                            <button type="button" className={styles.linkButton} onClick={() => updateParams({ [item.key]: '' })}>×</button>
                        </span>
                    ))}
                </div>
            ) : null}

            <div className={styles.contentGrid}>
                <div className={styles.mainStack}>
                    <section className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <div className={styles.panelHeaderBlock}>
                                <p className={styles.sectionEyebrow}>Category feed</p>
                                <h2 className={styles.panelTitle}>{cards.length} updates ready to scan</h2>
                                <p className={styles.panelCopy}>Search, filter, switch view modes, and save the combination you return to often.</p>
                            </div>
                        </div>

                        <div className={styles.resultsGrid}>
                            {loading ? (
                                Array.from({ length: 6 }).map((_, index) => <AnnouncementCardSkeleton key={index} />)
                            ) : cards.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <Icon name="Search" size={24} />
                                    <h3 className={styles.emptyTitle}>No matching updates</h3>
                                    <p className={styles.sectionCopy}>Try a broader keyword or reset one of the filters.</p>
                                </div>
                            ) : view === 'cards' ? (
                                <div className={styles.cardGrid} style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                                    {visibleCards.map((card) => (
                                        <AnnouncementCard key={card.id} card={card} showType={false} sourceTag="category_cards" />
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.listStack}>
                                    {visibleCards.map((card, index) => (
                                        <CategoryListRow key={card.id} card={card} sourceTag="category_list" index={index + 1} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {cards.length > visibleCount ? (
                            <button type="button" className={styles.secondaryButton} onClick={() => setVisibleCount((current) => current + 12)}>
                                Load more updates
                            </button>
                        ) : null}
                    </section>
                </div>

                <aside className={styles.sideStack}>
                    <section className={styles.panel}>
                        <div className={styles.panelHeaderBlock}>
                            <p className={styles.sectionEyebrow}>Closing soon</p>
                            <h2 className={styles.panelTitle}>Don&apos;t miss these dates</h2>
                        </div>
                        <div className={styles.moduleList}>
                            {closingSoon.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <p className={styles.sectionCopy}>No urgent deadlines in the current filtered view.</p>
                                </div>
                            ) : closingSoon.map((item) => (
                                <Link key={item.id} href={`/${item.type}/${item.slug}`} className={styles.moduleLink}>
                                    <span className={styles.railItemTitle}>{item.title}</span>
                                    <span className={styles.listMeta}>
                                        <span>{item.organization}</span>
                                        <span>{formatDate(item.deadline)}</span>
                                        <span>{getDeadlineInfo(item.deadline)?.label}</span>
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </section>

                    <section className={styles.panel}>
                        <div className={styles.panelHeaderBlock}>
                            <p className={styles.sectionEyebrow}>Popular search jumps</p>
                            <h2 className={styles.panelTitle}>Shortcut terms</h2>
                        </div>
                        <div className={styles.chipRow}>
                            {copy.chips.concat(EXAM_FAMILY_SHORTCUTS.slice(0, 4).map((item) => item.label)).slice(0, 8).map((chip) => (
                                <button key={chip} type="button" className={styles.softChip} onClick={() => updateParams({ q: chip })}>
                                    {chip}
                                </button>
                            ))}
                        </div>
                    </section>
                </aside>
            </div>

            {sheetOpen ? (
                <div className={styles.drawerBackdrop} onClick={() => setSheetOpen(false)}>
                    <div className={styles.drawer} onClick={(event) => event.stopPropagation()}>
                        <div className={styles.panelHeader}>
                            <div className={styles.panelHeaderBlock}>
                                <p className={styles.sectionEyebrow}>Mobile filters</p>
                                <h2 className={styles.panelTitle}>Refine {meta.labelEn}</h2>
                            </div>
                            <button type="button" className={styles.linkButton} onClick={() => setSheetOpen(false)}>Close</button>
                        </div>

                        <label className={styles.field}>
                            <span className={styles.fieldLabel}>Keyword</span>
                            <input className={styles.fieldControl} value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} />
                        </label>
                        <label className={styles.field}>
                            <span className={styles.fieldLabel}>Organization</span>
                            <select className={styles.fieldSelect} value={draftOrganization} onChange={(event) => setDraftOrganization(event.target.value)}>
                                <option value="">All organizations</option>
                                {organizations.map((item) => <option key={item} value={item}>{item}</option>)}
                            </select>
                        </label>
                        <label className={styles.field}>
                            <span className={styles.fieldLabel}>State</span>
                            <select className={styles.fieldSelect} value={draftLocation} onChange={(event) => setDraftLocation(event.target.value)}>
                                <option value="">All states</option>
                                {STATES.map((item) => <option key={item} value={item}>{item}</option>)}
                            </select>
                        </label>
                        <label className={styles.field}>
                            <span className={styles.fieldLabel}>Qualification</span>
                            <select className={styles.fieldSelect} value={draftQualification} onChange={(event) => setDraftQualification(event.target.value)}>
                                <option value="">All levels</option>
                                {QUALIFICATIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                            </select>
                        </label>
                        <div className={styles.toolbarGroup}>
                            <button type="button" className={styles.primaryButton} onClick={applyFilters}>Apply</button>
                            <button type="button" className={styles.ghostButton} onClick={resetFilters}>Reset</button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
