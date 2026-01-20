import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Navigation, Footer, SkeletonLoader, BookmarkButton, ExportButtons, SearchBox } from '../components';
import { AuthModal } from '../components/modals/AuthModal';
import { useAuth } from '../context/AuthContext';
import { useBookmarks } from '../hooks/useData';
import type { Announcement } from '../types';

export function BookmarksPage() {
    const navigate = useNavigate();
    const { user, logout, isAuthenticated } = useAuth();
    const { bookmarks, toggleBookmark, isBookmarked, loading } = useBookmarks();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [query, setQuery] = useState('');

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

    return (
        <div className="app">
            <Header
                setCurrentPage={(page) => navigate('/' + page)}
                user={user}
                isAuthenticated={isAuthenticated}
                onLogin={() => setShowAuthModal(true)}
                onLogout={logout}
                onProfileClick={() => navigate('/profile')}
            />
            <Navigation
                activeTab={'bookmarks'}
                setShowSearch={() => { }}
                setCurrentPage={(page) => navigate('/' + page)}
                isAuthenticated={isAuthenticated}
                onShowAuth={() => setShowAuthModal(true)}
            />

            <main className="main-content">
                <div className="bookmarks-page">
                    <h1 className="bookmarks-title">Saved Bookmarks</h1>

                    {!isAuthenticated ? (
                        <>
                            <p className="no-data">Sign in to view your saved bookmarks.</p>
                            <div style={{ textAlign: 'center' }}>
                                <button className="btn btn-primary" onClick={() => setShowAuthModal(true)}>
                                    Login
                                </button>
                            </div>
                        </>
                    ) : loading ? (
                        <SkeletonLoader />
                    ) : bookmarks.length === 0 ? (
                        <p className="no-data">No bookmarks yet.</p>
                    ) : visibleBookmarks.length === 0 ? (
                        <p className="no-data">No bookmarks match your search.</p>
                    ) : (
                        <>
                            <div className="category-header">
                                <div>
                                    <p className="category-subtitle">{visibleBookmarks.length} saved items</p>
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
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
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
                                            {item.totalPosts && <span className="posts">{item.totalPosts} Posts</span>}
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

            <Footer setCurrentPage={(page) => navigate('/' + page)} />
            <AuthModal show={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </div>
    );
}

export default BookmarksPage;
