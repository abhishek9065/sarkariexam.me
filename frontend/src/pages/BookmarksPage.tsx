import { useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Navigation, Footer, SkeletonLoader, BookmarkButton, ExportButtons, SearchBox, ScrollToTop } from '../components';
import { AuthModal } from '../components/modals/AuthModal';
import { useAuth } from '../context/AuthContext';
import { useBookmarks } from '../hooks/useData';
import { prefetchAnnouncementDetail } from '../utils/prefetch';
import { formatNumber } from '../utils/formatters';
import { getDaysRemaining } from '../utils';
import type { Announcement } from '../types';
import './V2.css';

export function BookmarksPage() {
    const navigate = useNavigate();
    const { user, token, logout, isAuthenticated } = useAuth();
    const { bookmarks, toggleBookmark, isBookmarked, loading } = useBookmarks();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [query, setQuery] = useState('');
    const handlePageNavigation = (page: string) => {
        if (page === 'home') navigate('/');
        else if (page === 'admin') navigate('/admin');
        else navigate('/' + page);
    };

    const handleItemClick = (item: Announcement) => {
        navigate(`/${item.type}/${item.slug}`);
    };

    const normalizedQuery = query.trim().toLowerCase();
    const visibleBookmarks = normalizedQuery
        ? bookmarks.filter(item =>
            item.title.toLowerCase().includes(normalizedQuery) ||
            (item.organization || '').toLowerCase().includes(normalizedQuery)
        )
        : bookmarks;
    const closingSoonCount = useMemo(() => visibleBookmarks.filter((item) => {
        const daysRemaining = getDaysRemaining(item.deadline ?? undefined);
        return daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7;
    }).length, [visibleBookmarks]);

    const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, item: Announcement) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        handleItemClick(item);
    };

    return (
        <div className="app sr-v2-bookmarks">
            <a className="sr-v2-skip-link" href="#bookmarks-main">
                Skip to bookmarks
            </a>
            <Header
                setCurrentPage={handlePageNavigation}
                user={user}
                token={token}
                isAuthenticated={isAuthenticated}
                onLogin={() => setShowAuthModal(true)}
                onLogout={logout}
                onProfileClick={() => navigate('/profile')}
            />
            <Navigation
                activeTab={'bookmarks'}
                setShowSearch={() => { }}
                setCurrentPage={handlePageNavigation}
                isAuthenticated={isAuthenticated}
                onShowAuth={() => setShowAuthModal(true)}
            />

            <main id="bookmarks-main" className="main-content sr-v2-main">
                <div className="bookmarks-page">
                    <h1 className="bookmarks-title">Saved Bookmarks</h1>
                    <section className="sr-v2-bookmarks-intro" aria-label="Bookmarks pulse">
                        <div className="sr-v2-bookmarks-intro-item">
                            <span className="sr-v2-intro-label">Saved Items</span>
                            <strong>{formatNumber(bookmarks.length)}</strong>
                            <small>Total bookmarks in your account</small>
                        </div>
                        <div className="sr-v2-bookmarks-intro-item">
                            <span className="sr-v2-intro-label">Visible Results</span>
                            <strong>{formatNumber(visibleBookmarks.length)}</strong>
                            <small>{normalizedQuery ? 'Filtered by search query' : 'No search filter applied'}</small>
                        </div>
                        <div className="sr-v2-bookmarks-intro-item">
                            <span className="sr-v2-intro-label">Closing in 7 Days</span>
                            <strong>{formatNumber(closingSoonCount)}</strong>
                            <small>Act soon on expiring opportunities</small>
                        </div>
                    </section>

                    {!isAuthenticated ? (
                        <>
                            <p className="no-data">Sign in to view your saved bookmarks.</p>
                            <div style={{ textAlign: 'center' }}>
                                <button className="btn btn-primary v2-shell-login" onClick={() => setShowAuthModal(true)}>
                                    Login
                                </button>
                            </div>
                        </>
                    ) : loading ? (
                        <SkeletonLoader />
                    ) : bookmarks.length === 0 ? (
                        <div className="sr-v2-empty-state">
                            <p className="no-data">No bookmarks yet.</p>
                            <div className="sr-v2-empty-actions">
                                <button type="button" className="btn btn-primary" onClick={() => navigate('/jobs')}>
                                    Browse latest jobs
                                </button>
                            </div>
                        </div>
                    ) : visibleBookmarks.length === 0 ? (
                        <div className="sr-v2-empty-state">
                            <p className="no-data">No bookmarks match your search.</p>
                            <div className="sr-v2-empty-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setQuery('')}>
                                    Clear search
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="category-header">
                                <div>
                                    <p className="category-subtitle" aria-live="polite">{visibleBookmarks.length} saved items</p>
                                </div>
                                <div className="category-controls">
                                    <SearchBox
                                        value={query}
                                        onChange={setQuery}
                                        placeholder="Search bookmarks"
                                        resultCount={visibleBookmarks.length}
                                    />
                                </div>
                            </div>
                            <ExportButtons bookmarks={visibleBookmarks} />
                            <div className="bookmarks-grid">
                                {visibleBookmarks.map(item => (
                                    <div
                                        key={item.id}
                                        className="bookmark-card category-item"
                                        onClick={() => handleItemClick(item)}
                                        onMouseEnter={() => prefetchAnnouncementDetail(item.slug)}
                                        onFocus={() => prefetchAnnouncementDetail(item.slug)}
                                        onKeyDown={(event) => handleCardKeyDown(event, item)}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`Open ${item.title}`}
                                    >
                                        <div className="sr-v2-bookmark-card-head">
                                            <span className={`type-badge ${item.type}`}>{item.type}</span>
                                            <BookmarkButton
                                                announcementId={item.id}
                                                isBookmarked={isBookmarked(item.id)}
                                                onToggle={toggleBookmark}
                                                isAuthenticated={isAuthenticated}
                                                onLoginRequired={() => setShowAuthModal(true)}
                                                size="small"
                                            />
                                        </div>
                                        <div className="item-title">{item.title}</div>
                                        <div className="item-meta">
                                            <span className="org">{item.organization}</span>
                                            {item.totalPosts && <span className="posts">{formatNumber(item.totalPosts ?? undefined)} Posts</span>}
                                            {item.deadline && (
                                                <span className="deadline">
                                                    Last: {new Date(item.deadline).toLocaleDateString('en-IN')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>

            <Footer setCurrentPage={handlePageNavigation} />
            <AuthModal show={showAuthModal} onClose={() => setShowAuthModal(false)} />
            <ScrollToTop />
        </div>
    );
}

export default BookmarksPage;
