import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { getTrendingSearches, getAnnouncementCards } from '../utils/api';
import { buildAnnouncementDetailPath } from '../utils/trackingLinks';
import type { AnnouncementCard } from '../types';

const TRENDING_FALLBACK = ['SSC CGL', 'UPSC CSE', 'RRB ALP', 'NEET UG', 'India Post GDS'];

export function TrendingPage() {
    const [terms, setTerms] = useState<string[]>([]);
    const [popular, setPopular] = useState<AnnouncementCard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const [tRes, pRes] = await Promise.all([
                    getTrendingSearches(30, 20),
                    getAnnouncementCards({ limit: 10, sort: 'views' }),
                ]);
                if (!mounted) return;

                const queries = (tRes.data || [])
                    .map((e) => e.query?.trim())
                    .filter((q): q is string => Boolean(q));
                setTerms(queries.length > 0 ? queries : TRENDING_FALLBACK);
                setPopular(pRes.data || []);
            } catch {
                if (!mounted) return;
                setTerms(TRENDING_FALLBACK);
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => { mounted = false; };
    }, []);

    return (
        <Layout>
            <div className="trending-page">
                <section className="trending-hero">
                    <h1 className="trending-title">🔥 Trending Now</h1>
                    <p className="trending-desc">
                        The most searched exams and popular updates across SarkariExams.me
                    </p>
                </section>

                <section className="trending-section">
                    <h2 className="trending-section-title">Trending Searches</h2>
                    {loading ? (
                        <div className="trending-skeleton">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="skeleton" style={{ width: 100 + (i % 3) * 30, height: 32, borderRadius: 16 }} />
                            ))}
                        </div>
                    ) : (
                        <div className="trending-chips">
                            {terms.map((term) => (
                                <Link
                                    key={term}
                                    to={`/jobs?q=${encodeURIComponent(term)}&source=trending`}
                                    className="trending-chip"
                                >
                                    {term}
                                </Link>
                            ))}
                        </div>
                    )}
                </section>

                {popular.length > 0 && (
                    <section className="trending-section">
                        <h2 className="trending-section-title">Most Viewed</h2>
                        <ul className="trending-list">
                            {popular.map((card, i) => (
                                <li key={card.id}>
                                    <Link
                                        to={buildAnnouncementDetailPath(card.type, card.slug, 'trending_popular')}
                                        className="trending-item"
                                    >
                                        <span className="trending-rank">{i + 1}</span>
                                        <span className="trending-item-title">{card.title}</span>
                                        {card.viewCount != null && (
                                            <span className="trending-views">👁 {card.viewCount.toLocaleString()}</span>
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <div className="trending-back">
                    <Link to="/" className="trending-back-btn">← Back to Home</Link>
                </div>
            </div>
        </Layout>
    );
}
