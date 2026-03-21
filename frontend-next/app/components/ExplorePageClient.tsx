import Link from 'next/link';
import { PublicCategoryRail } from '@/app/components/PublicCategoryRail';
import '@/app/components/PublicSurface.css';

const ORG_GROUPS: Array<{ heading: string; items: Array<{ label: string; to: string }> }> = [
    {
        heading: 'Central Government',
        items: [
            { label: 'UPSC', to: '/jobs?q=UPSC' },
            { label: 'SSC', to: '/jobs?q=SSC' },
            { label: 'Railway (RRB)', to: '/jobs?q=Railway' },
            { label: 'IBPS / Banking', to: '/jobs?q=IBPS' },
            { label: 'Defence', to: '/jobs?q=Defence' },
            { label: 'Air Force', to: '/jobs?q=Air%20Force' },
            { label: 'Navy', to: '/jobs?q=Navy' },
            { label: 'Coast Guard', to: '/jobs?q=Coast%20Guard' },
            { label: 'India Post', to: '/jobs?q=India%20Post' },
        ],
    },
    {
        heading: 'State Government',
        items: [
            { label: 'BPSC (Bihar)', to: '/jobs?q=BPSC' },
            { label: 'UPPSC (UP)', to: '/jobs?q=UPPCS' },
            { label: 'UPSSSC', to: '/jobs?q=UPSSSC' },
            { label: 'RPSC (Rajasthan)', to: '/jobs?q=RPSC' },
            { label: 'HSSC (Haryana)', to: '/jobs?q=HSSC' },
            { label: 'DSSSB (Delhi)', to: '/jobs?q=DSSSB' },
        ],
    },
    {
        heading: 'By Sector',
        items: [
            { label: 'Police Vacancy', to: '/jobs?q=Police' },
            { label: 'Teaching Jobs', to: '/jobs?q=Teaching' },
            { label: 'Banking Jobs', to: '/jobs?q=Banking' },
            { label: 'TET', to: '/jobs?q=TET' },
            { label: 'Scholarships', to: '/jobs?q=Scholarship' },
            { label: 'Admit Card Download', to: '/admit-card?q=download' },
        ],
    },
];

export function ExplorePage() {
    const totalCollections = ORG_GROUPS.length;
    const totalLinks = ORG_GROUPS.reduce((sum, group) => sum + group.items.length, 0);

    return (
        <div className="hp public-shell">
            <section className="public-hero">
                <span className="public-kicker">Explore Public Categories</span>
                <div className="public-hero-grid">
                    <div className="public-hero-main">
                        <h1 className="public-title">
                            Explore <span className="public-title-accent">Organizations</span>
                        </h1>
                        <p className="public-sub">
                            Browse government updates by exam body, state board, or sector. This page is now aligned with the same public-site
                            design language as the homepage, category feeds, and detail pages.
                        </p>
                    </div>
                    <div className="public-hero-stats">
                        <div className="public-stat-card">
                            <span className="public-stat-value">{totalCollections}</span>
                            <span className="public-stat-label">Collections</span>
                        </div>
                        <div className="public-stat-card">
                            <span className="public-stat-value">{totalLinks}</span>
                            <span className="public-stat-label">Direct shortcuts</span>
                        </div>
                        <div className="public-stat-card">
                            <span className="public-stat-value">Jobs + Exams</span>
                            <span className="public-stat-label">Coverage</span>
                        </div>
                    </div>
                </div>
            </section>

            <PublicCategoryRail />

            <div className="public-explore-grid">
                {ORG_GROUPS.map((group) => (
                    <section key={group.heading} className="public-panel">
                        <div className="public-panel-header">
                            <div>
                                <h2 className="public-panel-title">{group.heading}</h2>
                                <p className="public-panel-copy">{group.items.length} direct filters to jump into the live category feeds.</p>
                            </div>
                        </div>
                        <div className="public-explore-links">
                            {group.items.map((item) => (
                                <Link key={item.label} href={item.to} className="public-link-chip">
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            <div className="public-back-row">
                <Link href="/" className="public-secondary-link">Back to Home</Link>
            </div>
        </div>
    );
}
