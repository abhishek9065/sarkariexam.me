import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { AnnouncementCard, AnnouncementCardSkeleton } from '../components/AnnouncementCard';
import { SearchOverlay } from '../components/SearchOverlay';
import { getAnnouncementCards } from '../utils/api';
import type { AnnouncementCard as CardType, ContentType } from '../types';

/* ─── Category data ─── */
const CATEGORIES: { type: ContentType; label: string; icon: string; color: string; desc: string }[] = [
    { type: 'job', label: 'Latest Jobs', icon: '💼', color: '#2563eb', desc: 'Government job vacancies' },
    { type: 'result', label: 'Results', icon: '📊', color: '#16a34a', desc: 'Exam results & merit lists' },
    { type: 'admit-card', label: 'Admit Cards', icon: '🎫', color: '#d97706', desc: 'Download hall tickets' },
    { type: 'answer-key', label: 'Answer Keys', icon: '🔑', color: '#9333ea', desc: 'Official answer keys' },
    { type: 'admission', label: 'Admissions', icon: '🎓', color: '#0891b2', desc: 'University admissions' },
    { type: 'syllabus', label: 'Syllabus', icon: '📚', color: '#dc2626', desc: 'Exam syllabus & patterns' },
];

/* ─── Component ─── */
export function HomePage() {
    const [latestCards, setLatestCards] = useState<CardType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchOpen, setSearchOpen] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await getAnnouncementCards({ limit: 12, sort: 'newest' });
                setLatestCards(res.data);
            } catch (err) {
                console.error('Failed to fetch latest:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <Layout>
            {/* Hero */}
            <section className="hero-section">
                <div className="hero-bg" />
                <div className="hero-content animate-slide-up">
                    <h1 className="hero-title">
                        Your Gateway to<br />
                        <span className="hero-accent">Government Careers</span>
                    </h1>
                    <p className="hero-subtitle">
                        Get latest job notifications, results, admit cards, and exam updates — all in one place.
                    </p>
                    <button className="hero-search-btn" onClick={() => setSearchOpen(true)}>
                        <span className="hero-search-icon">🔍</span>
                        <span>Search jobs, exams, results...</span>
                    </button>
                </div>
            </section>

            {/* Category Cards */}
            <section className="section animate-fade-in">
                <h2 className="section-title">Browse by Category</h2>
                <div className="category-grid">
                    {CATEGORIES.map((cat) => (
                        <Link
                            key={cat.type}
                            to={`/${cat.type === 'job' ? 'jobs' : cat.type === 'result' ? 'results' : cat.type}`}
                            className="category-card card card-clickable"
                            style={{ '--cat-color': cat.color } as React.CSSProperties}
                        >
                            <span className="category-icon">{cat.icon}</span>
                            <div>
                                <h3 className="category-label">{cat.label}</h3>
                                <p className="category-desc">{cat.desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Latest Announcements */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">Latest Updates</h2>
                    <Link to="/jobs" className="btn btn-outline btn-sm">
                        View All →
                    </Link>
                </div>

                <div className="grid-auto">
                    {loading
                        ? Array.from({ length: 6 }).map((_, i) => <AnnouncementCardSkeleton key={i} />)
                        : latestCards.map((card) => <AnnouncementCard key={card.id} card={card} />)
                    }
                </div>

                {!loading && latestCards.length === 0 && (
                    <div className="empty-state">
                        <p>No announcements available yet.</p>
                    </div>
                )}
            </section>

            <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        </Layout>
    );
}
