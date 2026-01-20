import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Navigation, Footer, SkeletonLoader, BookmarkButton, ExportButtons } from '../components';
import { AuthModal } from '../components/modals/AuthModal';
import { useAuth } from '../context/AuthContext';
import { useBookmarks } from '../hooks/useData';
import type { Announcement } from '../types';

export function BookmarksPage() {
    const navigate = useNavigate();
    const { user, logout, isAuthenticated } = useAuth();
    const { bookmarks, toggleBookmark, isBookmarked, loading } = useBookmarks();
    const [showAuthModal, setShowAuthModal] = useState(false);

    const handleItemClick = (item: Announcement) => {
        navigate(`/${item.type}/${item.slug}`);
    };

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
                                <button className="admin-btn primary" onClick={() => setShowAuthModal(true)}>
                                    Login
                                </button>
                            </div>
                        </>
                    ) : loading ? (
                        <SkeletonLoader />
                    ) : bookmarks.length === 0 ? (
                        <p className="no-data">No bookmarks yet.</p>
                    ) : (
                        <>
                            <ExportButtons bookmarks={bookmarks} />
                            <div className="bookmarks-grid">
                                {bookmarks.map(item => (
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
