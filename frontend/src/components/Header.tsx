import { useState, useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SearchOverlay } from './SearchOverlay';
import { AuthModal } from './AuthModal';

const NAV_LINKS = [
    { to: '/', label: 'Home' },
    { to: '/jobs', label: 'Jobs' },
    { to: '/results', label: 'Results' },
    { to: '/admit-card', label: 'Admit Card' },
    { to: '/answer-key', label: 'Answer Key' },
    { to: '/admission', label: 'Admission' },
    { to: '/syllabus', label: 'Syllabus' },
];

export function Header() {
    const { theme, toggleTheme } = useTheme();
    const { user, logout, isAdmin } = useAuth();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
    const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    /* Open auth modal via URL param (?login=1) */
    useEffect(() => {
        if (searchParams.get('login') === '1') {
            setAuthTab('login');
            setAuthOpen(true);
            searchParams.delete('login');
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const openLogin = () => { setAuthTab('login'); setAuthOpen(true); };
    const openRegister = () => { setAuthTab('register'); setAuthOpen(true); };

    return (
        <>
            <header className="header">
                <div className="container header-inner">
                    <Link to="/" className="header-logo" onClick={() => setMobileOpen(false)}>
                        <span className="header-logo-icon">📋</span>
                        <span className="header-logo-text">
                            Sarkari<span className="header-logo-accent">Exams</span>
                        </span>
                    </Link>

                    <nav className="header-nav hide-mobile">
                        {NAV_LINKS.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`header-nav-link${location.pathname === link.to ? ' active' : ''}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="header-actions">
                        <button className="btn btn-ghost header-search-btn" onClick={() => setSearchOpen(true)} aria-label="Search">
                            🔍
                        </button>

                        <button className="btn btn-ghost header-theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
                            {theme === 'light' ? '🌙' : '☀️'}
                        </button>

                        {user ? (
                            <div className="user-menu-wrapper">
                                <button className="btn btn-ghost user-avatar-btn" onClick={() => setUserMenuOpen(!userMenuOpen)}>
                                    <span className="user-avatar-circle">
                                        {(user.username || user.email)[0].toUpperCase()}
                                    </span>
                                </button>
                                {userMenuOpen && (
                                    <div className="user-dropdown card">
                                        <div className="user-dropdown-info">
                                            <span className="user-dropdown-name">{user.username}</span>
                                            <span className="user-dropdown-email">{user.email}</span>
                                        </div>
                                        <hr className="user-dropdown-divider" />
                                        <Link to="/profile" className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                                            👤 Profile
                                        </Link>
                                        <Link to="/bookmarks" className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                                            🔖 Bookmarks
                                        </Link>
                                        {isAdmin && (
                                            <Link to="/admin" className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                                                ⚙️ Admin Panel
                                            </Link>
                                        )}
                                        <hr className="user-dropdown-divider" />
                                        <button className="user-dropdown-item user-dropdown-logout" onClick={() => { logout(); setUserMenuOpen(false); }}>
                                            🚪 Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="header-auth-btns hide-mobile">
                                <button className="btn btn-ghost btn-sm" onClick={openLogin}>Sign In</button>
                                <button className="btn btn-accent btn-sm" onClick={openRegister}>Register</button>
                            </div>
                        )}

                        <button className="btn btn-ghost header-hamburger hide-desktop" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
                            {mobileOpen ? '✕' : '☰'}
                        </button>
                    </div>
                </div>

                {mobileOpen && (
                    <div className="header-mobile-menu">
                        <nav className="header-mobile-nav">
                            {NAV_LINKS.map((link) => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className={`header-mobile-link${location.pathname === link.to ? ' active' : ''}`}
                                    onClick={() => setMobileOpen(false)}
                                >
                                    {link.label}
                                </Link>
                            ))}
                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '8px 0' }} />
                            {user ? (
                                <>
                                    <Link to="/profile" className="header-mobile-link" onClick={() => setMobileOpen(false)}>👤 Profile</Link>
                                    <Link to="/bookmarks" className="header-mobile-link" onClick={() => setMobileOpen(false)}>🔖 Bookmarks</Link>
                                    {isAdmin && <Link to="/admin" className="header-mobile-link" onClick={() => setMobileOpen(false)}>⚙️ Admin</Link>}
                                    <button className="header-mobile-link" style={{ textAlign: 'left', width: '100%', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', font: 'inherit', padding: 'inherit' }} onClick={() => { logout(); setMobileOpen(false); }}>🚪 Sign Out</button>
                                </>
                            ) : (
                                <>
                                    <button className="header-mobile-link" style={{ textAlign: 'left', width: '100%', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', font: 'inherit', padding: 'inherit' }} onClick={() => { openLogin(); setMobileOpen(false); }}>Sign In</button>
                                    <button className="header-mobile-link" style={{ textAlign: 'left', width: '100%', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', font: 'inherit', padding: 'inherit' }} onClick={() => { openRegister(); setMobileOpen(false); }}>Register</button>
                                </>
                            )}
                        </nav>
                    </div>
                )}
            </header>

            <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
            <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialTab={authTab} />
        </>
    );
}
