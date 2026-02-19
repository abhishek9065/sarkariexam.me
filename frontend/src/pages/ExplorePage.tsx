import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';

/* Organization quick-links moved out from old homepage/footer */
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
            { label: 'Certificate Verification', to: '/results?q=certificate' },
        ],
    },
];

export function ExplorePage() {
    return (
        <Layout>
            <div className="explore-page">
                <section className="explore-hero">
                    <h1 className="explore-title">Explore Organizations</h1>
                    <p className="explore-desc">
                        Browse government job vacancies by organization, state, or sector.
                    </p>
                </section>

                <div className="explore-grid">
                    {ORG_GROUPS.map((group) => (
                        <section key={group.heading} className="explore-group">
                            <h2 className="explore-group-title">{group.heading}</h2>
                            <div className="explore-chips">
                                {group.items.map((item) => (
                                    <Link key={item.label} to={item.to} className="explore-chip">
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>

                <div className="explore-back">
                    <Link to="/" className="explore-back-btn">← Back to Home</Link>
                </div>
            </div>
        </Layout>
    );
}
