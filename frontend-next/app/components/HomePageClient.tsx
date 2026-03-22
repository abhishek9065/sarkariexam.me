'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHomepageFeed } from '@/app/lib/api';
import type { AnnouncementCard, ContentType, HomepageFeedSections } from '@/app/lib/types';

import '@/app/components/HomePage.css';

type PortalListItem = {
    id: string;
    title: string;
    href: string;
    date: string;
    isNew: boolean;
};

const HOME_NAV_LINKS = [
    { label: 'Home', to: '/' },
    { label: 'Latest Jobs', to: '/jobs' },
    { label: 'Results', to: '/results' },
    { label: 'Admit Cards', to: '/admit-card' },
    { label: 'Answer Keys', to: '/answer-key' },
    { label: 'Syllabus', to: '/syllabus' },
    { label: 'Certificates', to: '/jobs' },
    { label: 'Important Links', to: '/jobs' },
];

const QUICK_CATEGORIES = [
    { label: 'Latest Jobs', to: '/jobs', color: 'orange', icon: '💼' },
    { label: 'Results', to: '/results', color: 'green', icon: '📋' },
    { label: 'Admit Cards', to: '/admit-card', color: 'blue', icon: '🪪' },
    { label: 'Answer Keys', to: '/answer-key', color: 'red', icon: '🗝️' },
    { label: 'Syllabus', to: '/syllabus', color: 'purple', icon: '📚' },
    { label: 'Certificates', to: '/jobs', color: 'teal', icon: '🏅' },
    { label: 'Exam Dates', to: '/jobs', color: 'yellow', icon: '📅' },
    { label: 'Cut Off', to: '/jobs', color: 'pink', icon: '✂️' },
];

const STATS = [
    { label: 'Active Jobs', value: '1,24,890' },
    { label: 'Results Today', value: '38' },
    { label: 'Admit Cards', value: '52' },
    { label: 'Answer Keys', value: '19' },
    { label: 'Total Vacancies', value: '3,48,200+' },
];

const STATE_LINKS = [
    'Uttar Pradesh',
    'Bihar',
    'Rajasthan',
    'Madhya Pradesh',
    'Maharashtra',
    'Gujarat',
    'West Bengal',
    'Karnataka',
    'Tamil Nadu',
    'Andhra Pradesh',
    'Telangana',
    'Odisha',
    'Punjab',
    'Haryana',
    'Delhi',
    'Jharkhand',
    'Chhattisgarh',
    'Assam',
    'Uttarakhand',
    'Himachal Pradesh',
];

const FOOTER_COLUMNS = [
    {
        title: 'Quick Links',
        links: [
            { label: 'Latest Jobs', to: '/jobs' },
            { label: 'Results 2026', to: '/results' },
            { label: 'Admit Cards', to: '/admit-card' },
            { label: 'Answer Keys', to: '/answer-key' },
            { label: 'Syllabus PDF', to: '/syllabus' },
        ],
    },
    {
        title: 'Exam Categories',
        links: [
            { label: 'UPSC Exams', to: '/jobs?q=UPSC' },
            { label: 'SSC Exams', to: '/jobs?q=SSC' },
            { label: 'Railway (RRB)', to: '/jobs?q=Railway' },
            { label: 'Banking (IBPS/SBI)', to: '/jobs?q=IBPS' },
            { label: 'Defence Jobs', to: '/jobs?q=Defence' },
        ],
    },
    {
        title: 'Help & Support',
        links: [
            { label: 'About Us', to: '/about' },
            { label: 'Contact Us', to: '/contact' },
            { label: 'Privacy Policy', to: '/privacy' },
            { label: 'Explore', to: '/explore' },
            { label: 'Admissions', to: '/admission' },
        ],
    },
];

function slugify(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function buildAnnouncementDetailPath(type: string, slug: string) {
    return `/${type}/${slug}`;
}

function buildCategoryPath(type: ContentType): string {
    if (type === 'job') return '/jobs';
    if (type === 'result') return '/results';
    if (type === 'admit-card') return '/admit-card';
    if (type === 'answer-key') return '/answer-key';
    if (type === 'syllabus') return '/syllabus';
    return '/admission';
}

function formatPortalDate(value?: string | null) {
    if (!value) return '--';
    const date = new Date(value);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function formatHeaderDate(value: Date) {
    return new Intl.DateTimeFormat('en-IN', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(value);
}

function isNew(value?: string | null) {
    if (!value) return false;
    return Date.now() - new Date(value).getTime() < 72 * 3600_000;
}

function makeFallbackCard(
    id: string,
    type: ContentType,
    title: string,
    organization: string,
    postedAt: string,
    extra: Partial<AnnouncementCard> = {},
): AnnouncementCard {
    return {
        id,
        title,
        slug: slugify(`${title}-${id}`),
        type,
        category: type,
        organization,
        postedAt,
        viewCount: 0,
        ...extra,
    };
}

const FALLBACK_SECTIONS: HomepageFeedSections = {
    job: [
        makeFallbackCard('job-1', 'job', 'UPSC Civil Services 2026 Online Form - 1206 Posts', 'UPSC', '2026-03-23T08:00:00.000Z', { totalPosts: 1206, deadline: '2026-04-28T00:00:00.000Z' }),
        makeFallbackCard('job-2', 'job', 'SSC CGL 2026 Notification - 17727 Vacancies', 'SSC', '2026-03-22T08:00:00.000Z', { totalPosts: 17727, deadline: '2026-04-19T00:00:00.000Z' }),
        makeFallbackCard('job-3', 'job', 'RRB NTPC 2026 Recruitment Form', 'Railway Recruitment Board', '2026-03-21T08:00:00.000Z', { totalPosts: 11558, deadline: '2026-04-12T00:00:00.000Z' }),
        makeFallbackCard('job-4', 'job', 'IBPS PO 2026 Notification and Registration', 'IBPS', '2026-03-20T08:00:00.000Z', { totalPosts: 4455 }),
        makeFallbackCard('job-5', 'job', 'Indian Army Agniveer 2026 Recruitment', 'Indian Army', '2026-03-19T08:00:00.000Z'),
        makeFallbackCard('job-6', 'job', 'SBI Clerk 2026 Junior Associate Form', 'State Bank of India', '2026-03-18T08:00:00.000Z', { totalPosts: 8773 }),
        makeFallbackCard('job-7', 'job', 'DRDO Scientist B 2026 Online Form', 'DRDO', '2026-03-17T08:00:00.000Z'),
        makeFallbackCard('job-8', 'job', 'NDA I 2026 Online Form - 400 Posts', 'UPSC', '2026-03-16T08:00:00.000Z', { totalPosts: 400 }),
    ],
    result: [
        makeFallbackCard('result-1', 'result', 'UPSC CSE Prelims 2025 Result Declared', 'UPSC', '2026-03-23T07:30:00.000Z'),
        makeFallbackCard('result-2', 'result', 'SSC CHSL Tier I Final Result 2025 Out', 'SSC', '2026-03-22T09:00:00.000Z'),
        makeFallbackCard('result-3', 'result', 'RRB Group D Result 2025 Released', 'Railway Recruitment Board', '2026-03-21T09:00:00.000Z'),
        makeFallbackCard('result-4', 'result', 'IBPS Clerk Mains Result 2025', 'IBPS', '2026-03-20T09:00:00.000Z'),
        makeFallbackCard('result-5', 'result', 'CTET December 2025 Result Available', 'CBSE', '2026-03-19T09:00:00.000Z'),
        makeFallbackCard('result-6', 'result', 'UP Police Constable Result 2025', 'UP Police Recruitment Board', '2026-03-18T09:00:00.000Z'),
        makeFallbackCard('result-7', 'result', 'BPSC 70th Prelims Result 2025', 'BPSC', '2026-03-17T09:00:00.000Z'),
        makeFallbackCard('result-8', 'result', 'SBI PO Final Result 2025 Published', 'State Bank of India', '2026-03-16T09:00:00.000Z'),
    ],
    'admit-card': [
        makeFallbackCard('admit-1', 'admit-card', 'UPSC CDS I 2026 Admit Card', 'UPSC', '2026-03-23T10:00:00.000Z'),
        makeFallbackCard('admit-2', 'admit-card', 'SSC GD Constable 2026 Admit Card Out', 'SSC', '2026-03-22T10:00:00.000Z'),
        makeFallbackCard('admit-3', 'admit-card', 'RRB ALP 2026 CBT I Hall Ticket', 'Railway Recruitment Board', '2026-03-21T10:00:00.000Z'),
        makeFallbackCard('admit-4', 'admit-card', 'IBPS RRB PO Admit Card 2026', 'IBPS', '2026-03-20T10:00:00.000Z'),
        makeFallbackCard('admit-5', 'admit-card', 'NEET UG 2026 Admit Card Download', 'NTA', '2026-03-19T10:00:00.000Z'),
        makeFallbackCard('admit-6', 'admit-card', 'JEE Main Session II 2026 Admit Card', 'NTA', '2026-03-18T10:00:00.000Z'),
    ],
    'answer-key': [
        makeFallbackCard('key-1', 'answer-key', 'UPSC CAPF 2026 Answer Key Released', 'UPSC', '2026-03-23T11:00:00.000Z'),
        makeFallbackCard('key-2', 'answer-key', 'SSC CPO 2026 Paper I Answer Key', 'SSC', '2026-03-22T11:00:00.000Z'),
        makeFallbackCard('key-3', 'answer-key', 'RRB NTPC 2026 CBT I Answer Key', 'Railway Recruitment Board', '2026-03-21T11:00:00.000Z'),
        makeFallbackCard('key-4', 'answer-key', 'IBPS PO 2026 Prelims Answer Key', 'IBPS', '2026-03-20T11:00:00.000Z'),
        makeFallbackCard('key-5', 'answer-key', 'CTET February 2026 Answer Key', 'CBSE', '2026-03-19T11:00:00.000Z'),
        makeFallbackCard('key-6', 'answer-key', 'NDA 2025 II Answer Key Download', 'UPSC', '2026-03-18T11:00:00.000Z'),
    ],
    syllabus: [
        makeFallbackCard('syllabus-1', 'syllabus', 'UPSC Civil Services 2026 Syllabus PDF', 'UPSC', '2026-03-21T12:00:00.000Z'),
        makeFallbackCard('syllabus-2', 'syllabus', 'SSC CGL 2026 Exam Pattern & Syllabus', 'SSC', '2026-03-20T12:00:00.000Z'),
        makeFallbackCard('syllabus-3', 'syllabus', 'RRB NTPC 2026 CBT Syllabus Updated', 'Railway Recruitment Board', '2026-03-19T12:00:00.000Z'),
        makeFallbackCard('syllabus-4', 'syllabus', 'IBPS PO 2026 Detailed Syllabus', 'IBPS', '2026-03-18T12:00:00.000Z'),
        makeFallbackCard('syllabus-5', 'syllabus', 'SBI PO Prelims & Mains Syllabus 2026', 'State Bank of India', '2026-03-17T12:00:00.000Z'),
        makeFallbackCard('syllabus-6', 'syllabus', 'NDA 2026 Mathematics & GAT Syllabus', 'UPSC', '2026-03-16T12:00:00.000Z'),
    ],
    admission: [
        makeFallbackCard('admission-1', 'admission', 'NEET UG 2026 Online Application', 'NTA', '2026-03-23T06:00:00.000Z'),
        makeFallbackCard('admission-2', 'admission', 'CUET UG 2026 Registration Form', 'NTA', '2026-03-22T06:00:00.000Z'),
        makeFallbackCard('admission-3', 'admission', 'BHU Admission 2026 Counselling', 'Banaras Hindu University', '2026-03-21T06:00:00.000Z'),
        makeFallbackCard('admission-4', 'admission', 'JEE Main 2026 Session II Registration', 'NTA', '2026-03-20T06:00:00.000Z'),
        makeFallbackCard('admission-5', 'admission', 'UP BEd 2026 Admission Form', 'Bundelkhand University', '2026-03-19T06:00:00.000Z'),
        makeFallbackCard('admission-6', 'admission', 'Bihar DElEd Admission 2026', 'BSEB', '2026-03-18T06:00:00.000Z'),
    ],
};

function flattenSections(sections: HomepageFeedSections) {
    return Object.values(sections)
        .flat()
        .sort((left, right) => new Date(right.postedAt).getTime() - new Date(left.postedAt).getTime());
}

const FALLBACK_LATEST = flattenSections(FALLBACK_SECTIONS);

function buildHref(card: AnnouncementCard) {
    return card.slug ? buildAnnouncementDetailPath(card.type, card.slug) : buildCategoryPath(card.type);
}

function mapCards(cards: AnnouncementCard[], count: number): PortalListItem[] {
    return cards.slice(0, count).map((card) => ({
        id: card.id,
        title: card.title,
        href: buildHref(card),
        date: formatPortalDate(card.deadline ?? card.postedAt),
        isNew: isNew(card.postedAt),
    }));
}

function NewBadge() {
    return <span className="exact-home-new-badge">NEW</span>;
}

function SectionBox({
    title,
    headerClassName,
    items,
    viewAllTo,
    viewAllLabel,
}: {
    title: string;
    headerClassName: string;
    items: PortalListItem[];
    viewAllTo: string;
    viewAllLabel: string;
}) {
    return (
        <section className="exact-home-section-box">
            <div className={`exact-home-section-header ${headerClassName}`}>
                <span>{title}</span>
                <Link href={viewAllTo}>{viewAllLabel}</Link>
            </div>
            <div className="exact-home-section-body">
                {items.map((item, index) => (
                    <Link
                        key={item.id}
                        href={item.href}
                        className={`exact-home-section-row${index % 2 === 1 ? ' is-alt' : ''}`}
                    >
                        <span className="exact-home-section-title">
                            {item.title}
                            {item.isNew && <NewBadge />}
                        </span>
                        <span className="exact-home-section-date">{item.date}</span>
                    </Link>
                ))}
            </div>
        </section>
    );
}

function ImportantLinksBox({ items }: { items: PortalListItem[] }) {
    return (
        <section className="exact-home-section-box">
            <div className="exact-home-section-header purple">
                <span>Important Links</span>
            </div>
            <div className="exact-home-section-body">
                {items.map((item, index) => (
                    <Link
                        key={item.id}
                        href={item.href}
                        className={`exact-home-section-row${index % 2 === 1 ? ' is-alt' : ''}`}
                    >
                        <span className="exact-home-section-title">▸ {item.title}</span>
                    </Link>
                ))}
            </div>
        </section>
    );
}

function Ticker({ items }: { items: string[] }) {
    const track = [...items, ...items];

    return (
        <section className="exact-home-ticker" aria-label="Latest updates">
            <div className="exact-home-ticker-label">LATEST</div>
            <div className="exact-home-ticker-window">
                <div className="exact-home-ticker-track">
                    {track.map((item, index) => (
                        <span key={`${item}-${index}`} className="exact-home-ticker-item">
                            {item}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}

export function HomePage() {
    const navigate = useRouter();
    const [searchQuery, setSearchQuery] = useState('');

    const homepageQuery = useQuery({
        queryKey: ['homepage-feed'],
        queryFn: () => getHomepageFeed(),
    });

    const homepageData = homepageQuery.data?.data;
    const hasLiveData = useMemo(() => {
        if (!homepageData) return false;
        if ((homepageData.latest?.length ?? 0) > 0) return true;
        return Object.values(homepageData.sections ?? {}).some((section) => section.length > 0);
    }, [homepageData]);

    const sections = useMemo(
        () => (hasLiveData && homepageData?.sections ? homepageData.sections : FALLBACK_SECTIONS),
        [hasLiveData, homepageData],
    );

    const latest = useMemo(
        () => (hasLiveData && homepageData?.latest?.length ? homepageData.latest : FALLBACK_LATEST),
        [hasLiveData, homepageData],
    );

    const admitSection = sections['admit-card'];
    const answerKeySection = sections['answer-key'];
    const results = useMemo(() => mapCards(sections.result, 8), [sections.result]);
    const jobs = useMemo(() => mapCards(sections.job, 10), [sections.job]);
    const admitCards = useMemo(() => mapCards(admitSection, 8), [admitSection]);
    const answerKeys = useMemo(() => mapCards(answerKeySection, 6), [answerKeySection]);
    const syllabus = useMemo(() => mapCards(sections.syllabus, 6), [sections.syllabus]);
    const importantLinks = useMemo(() => mapCards(latest, 8), [latest]);
    const tickerItems = useMemo(() => latest.slice(0, 6).map((item) => item.title), [latest]);
    const featuredJob = sections.job[0];
    const featuredJobHref = featuredJob ? buildHref(featuredJob) : '/jobs';
    const calendarRows = useMemo(() => {
        const rows = [...sections.job.slice(0, 4), ...sections.result.slice(0, 2)];
        return rows.map((item) => ({
            id: item.id,
            title: item.title,
            date: formatPortalDate(item.deadline ?? item.postedAt),
            posts: item.totalPosts ? item.totalPosts.toLocaleString('en-IN') : 'Open',
            status: item.deadline ? 'Application Open' : 'Updated',
            href: buildHref(item),
        }));
    }, [sections.job, sections.result]);

    const todayText = useMemo(() => formatHeaderDate(new Date()), []);

    const handleSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const query = searchQuery.trim();
        if (!query) return;
        navigate.push(`/jobs?q=${encodeURIComponent(query)}&source=home`);
    };

    return (
        <div className="exact-home">
            <header className="exact-home-top-header">
                <div className="exact-home-shell exact-home-top-header-inner">
                    <div className="exact-home-brand">
                        <div className="exact-home-brand-mark">SE</div>
                        <div className="exact-home-brand-copy">
                            <div className="exact-home-brand-name">SarkariExams.me</div>
                            <div className="exact-home-brand-subtitle">India&apos;s Trusted Government Job Portal</div>
                        </div>
                    </div>

                    <form className="exact-home-search" onSubmit={handleSearch} role="search">
                        <input
                            type="text"
                            placeholder="Search Jobs, Results, Admit Cards..."
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            aria-label="Search Jobs, Results, Admit Cards"
                        />
                        <button type="submit">Search</button>
                    </form>

                    <div className="exact-home-date-status">
                        <div>{todayText}</div>
                        <div className="exact-home-date-live">Updated Today</div>
                    </div>
                </div>
            </header>

            <nav className="exact-home-nav">
                <div className="exact-home-shell exact-home-nav-inner">
                    {HOME_NAV_LINKS.map((link) => (
                        <Link key={link.label} href={link.to} className="exact-home-nav-link">
                            {link.label}
                        </Link>
                    ))}
                </div>
            </nav>

            <div className="exact-home-shell exact-home-main">
                <Ticker items={tickerItems} />

                <section className="exact-home-stats">
                    {STATS.map((item) => (
                        <div key={item.label} className="exact-home-stat">
                            <span className="exact-home-stat-value">{item.value}</span>
                            <span className="exact-home-stat-label">{item.label}</span>
                        </div>
                    ))}
                </section>

                <section className="exact-home-quick-grid">
                    {QUICK_CATEGORIES.map((item) => (
                        <Link key={item.label} href={item.to} className={`exact-home-quick-card ${item.color}`}>
                            <span className="exact-home-quick-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </section>

                <section className="exact-home-board">
                    <div className="exact-home-column">
                        <SectionBox
                            title="Latest Results"
                            headerClassName="green"
                            items={results}
                            viewAllTo="/results"
                            viewAllLabel="All Results"
                        />
                        <SectionBox
                            title="Answer Keys"
                            headerClassName="red"
                            items={answerKeys}
                            viewAllTo="/answer-key"
                            viewAllLabel="All Keys"
                        />
                    </div>

                    <div className="exact-home-column">
                        <section className="exact-home-featured">
                            <div className="exact-home-featured-kicker">Featured Recruitment</div>
                            <h2>{featuredJob?.title ?? 'UPSC Civil Services 2026 Online Form - 1206 Posts'}</h2>
                            <div className="exact-home-featured-meta">
                                <span>{featuredJob?.organization ?? 'UPSC'}</span>
                                <span>
                                    {featuredJob?.deadline
                                        ? `Last Date: ${formatPortalDate(featuredJob.deadline)}`
                                        : `Updated: ${formatPortalDate(featuredJob?.postedAt)}`}
                                </span>
                            </div>
                            <Link href={featuredJobHref} className="exact-home-featured-cta">
                                Explore Notification
                            </Link>
                        </section>

                        <SectionBox
                            title="Latest Jobs"
                            headerClassName="orange"
                            items={jobs}
                            viewAllTo="/jobs"
                            viewAllLabel="All Jobs"
                        />
                    </div>

                    <div className="exact-home-column">
                        <SectionBox
                            title="Admit Cards"
                            headerClassName="blue"
                            items={admitCards}
                            viewAllTo="/admit-card"
                            viewAllLabel="All Admit Cards"
                        />
                        <SectionBox
                            title="Syllabus"
                            headerClassName="purple"
                            items={syllabus}
                            viewAllTo="/syllabus"
                            viewAllLabel="All Syllabus"
                        />
                        <ImportantLinksBox items={importantLinks} />
                    </div>
                </section>

                <section className="exact-home-panel">
                    <div className="exact-home-panel-header black">
                        <span>State-Wise Government Jobs</span>
                        <Link href="/jobs">Browse All States</Link>
                    </div>
                    <div className="exact-home-state-grid">
                        {STATE_LINKS.map((state) => (
                            <Link key={state} href={`/jobs?q=${encodeURIComponent(state)}`} className="exact-home-state-link">
                                ▸ {state}
                            </Link>
                        ))}
                    </div>
                </section>

                <section className="exact-home-panel">
                    <div className="exact-home-panel-header teal">
                        <span>Upcoming Exam Schedule</span>
                        <Link href="/jobs">View Full Calendar</Link>
                    </div>
                    <div className="exact-home-table-wrap">
                        <table className="exact-home-table">
                            <thead>
                                <tr>
                                    <th>Exam Name</th>
                                    <th>Exam Date</th>
                                    <th>Posts</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {calendarRows.map((row) => (
                                    <tr key={row.id}>
                                        <td>
                                            <Link href={row.href}>{row.title}</Link>
                                        </td>
                                        <td>{row.date}</td>
                                        <td>{row.posts}</td>
                                        <td>{row.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <footer className="exact-home-footer">
                <div className="exact-home-shell exact-home-footer-inner">
                    <div className="exact-home-footer-brand">
                        <div className="exact-home-footer-logo">SE</div>
                        <div>
                            <div className="exact-home-footer-title">SarkariExams.me</div>
                            <p>India&apos;s trusted portal for government jobs, results, admit cards and exam notifications.</p>
                        </div>
                    </div>

                    <div className="exact-home-footer-columns">
                        {FOOTER_COLUMNS.map((column) => (
                            <div key={column.title} className="exact-home-footer-column">
                                <div className="exact-home-footer-column-title">{column.title}</div>
                                {column.links.map((link) => (
                                    <Link key={link.label} href={link.to}>
                                        » {link.label}
                                    </Link>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="exact-home-footer-bottom">© 2026 SarkariExams.me — All Rights Reserved | Designed for Job Seekers across India</div>
            </footer>
        </div>
    );
}
