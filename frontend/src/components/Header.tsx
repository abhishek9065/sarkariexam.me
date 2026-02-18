import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import { SearchOverlay } from './SearchOverlay';
import { AuthModal } from './AuthModal';
import { getTrendingSearches } from '../utils/api';

interface NavLinkItem {
    to: string;
    labelKey: string;
}

const PRIMARY_LINKS: NavLinkItem[] = [
    { to: '/', labelKey: 'nav.home' },
    { to: '/jobs', labelKey: 'nav.jobs' },
    { to: '/results', labelKey: 'nav.results' },
    { to: '/admit-card', labelKey: 'nav.admitCard' },
    { to: '/answer-key', labelKey: 'nav.answerKey' },
    { to: '/admission', labelKey: 'nav.admission' },
    { to: '/syllabus', labelKey: 'nav.syllabus' },
];

const MORE_LINKS: Array<{ to: string; label: string }> = [
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
    { to: '/privacy', label: 'Privacy' },
    { to: '/disclaimer', label: 'Disclaimer' },
];

const TRENDING_FALLBACK = ['RRB ALP 2026', 'UPSC CSE', 'SSC CGL', 'NEET UG', 'India Post GDS'];

export function Header() {
    const { theme, toggleTheme } = useTheme();
    const { user, logout, hasAdminPortalAccess } = useAuth();
    const { language, toggleLanguage, t } = useLanguage();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
    const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const [trendingTerms, setTrendingTerms] = useState<string[]>(TRENDING_FALLBACK);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMobileOpen(false);
        setUserMenuOpen(false);
        setMoreOpen(false);
    }, [location.pathname]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setUserMenuOpen(false);
            }
            if (moreOpen && moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
                setMoreOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [userMenuOpen, moreOpen]);

    useEffect(() => {
        if (searchParams.get('login') === '1') {
            setAuthTab('login');
            setAuthOpen(true);
            searchParams.delete('login');
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await getTrendingSearches(30, 6);
                const terms = (res.data || [])
                    .map((entry) => entry.query?.trim())
                    .filter((query): query is string => Boolean(query));
                if (mounted && terms.length > 0) {
                    setTrendingTerms(terms);
                }
            } catch {
                // Keep fallback terms.
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    const openLogin = () => {
        setAuthTab('login');
        setAuthOpen(true);
    };

    const openRegister = () => {
        setAuthTab('register');
        setAuthOpen(true);
    };

    const tickerItems = useMemo(() => {
        if (trendingTerms.length === 0) {
            return TRENDING_FALLBACK;
        }
        return trendingTerms;
    }, [trendingTerms]);

    return (
        <>
            <header className="header" data-testid="app-header">
                <div className="header-utility">
                    <div className="container header-utility-inner">
                        <p className="header-tagline">{t('header.tagline')}</p>
                        <div className="header-utility-links">
                            <a href="https://play.google.com/store/apps" target="_blank" rel="noreferrer" className="header-utility-link">📱 Android</a>
                            <a href="https://apps.apple.com/" target="_blank" rel="noreferrer" className="header-utility-link">🍎 iOS</a>
                            <a href="https://t.me/sarkariexamsme" target="_blank" rel="noreferrer" className="header-utility-link">✈️ Telegram</a>
                            <a href="https://youtube.com/@sarkariexamsme" target="_blank" rel="noreferrer" className="header-utility-link">▶️ YouTube</a>
                            <button
                                type="button"
                                className="header-lang-toggle"
                                onClick={toggleLanguage}
                                aria-label="Toggle language"
                            >
                                {language === 'en' ? t('language.hi') : t('language.en')}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="header-main">
                    <div className="container header-main-inner">
                        <Link to="/" className="header-logo" onClick={() => setMobileOpen(false)}>
                            <span className="header-logo-icon" aria-hidden="true">📋</span>
                            <span className="header-logo-text-wrap">
                                <span className="header-logo-text">
                                    Sarkari<span className="header-logo-accent">Exams</span>
                                </span>
                                <span className="header-logo-subtitle">SarkariExams.me</span>
                            </span>
                        </Link>

                        <nav className="header-nav hide-mobile" aria-label="Primary navigation">
                            {PRIMARY_LINKS.map((link) => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className={`header-nav-link${location.pathname === link.to ? ' active' : ''}`}
                                >
                                    {t(link.labelKey)}
                                </Link>
                            ))}

                            <div className="header-more-wrap" ref={moreMenuRef}>
                                <button
                                    type="button"
                                    className={`header-nav-link header-more-btn${moreOpen ? ' active' : ''}`}
                                    onClick={() => setMoreOpen((value) => !value)}
                                    aria-expanded={moreOpen}
                                    aria-haspopup="menu"
                                >
                                    {t('nav.more')} ▾
                                </button>
                                {moreOpen && (
                                    <div className="header-more-menu card" role="menu">
                                        {MORE_LINKS.map((item) => (
                                            <Link key={item.to} to={item.to} className="header-more-item" role="menuitem">
                                                {item.label}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </nav>

                        <div className="header-actions">
                            <button
                                type="button"
                                className="btn btn-ghost header-search-btn"
                                onClick={() => setSearchOpen(true)}
                                aria-label={t('header.search')}
                            >
                                🔍
                            </button>
                            <button
                                type="button"
                                className="btn btn-ghost header-theme-toggle"
                                onClick={toggleTheme}
                                aria-label="Toggle theme"
                            >
                                {theme === 'light' ? '🌙' : '☀️'}
                            </button>

                            {user ? (
                                <div className="user-menu-wrapper" ref={userMenuRef}>
                                    <button
                                        type="button"
                                        className="btn btn-ghost user-avatar-btn"
                                        onClick={() => setUserMenuOpen((value) => !value)}
                                        aria-expanded={userMenuOpen}
                                        aria-haspopup="menu"
                                    >
                                        <span className="user-avatar-circle">
                                            {(user.username || user.email)[0].toUpperCase()}
                                        </span>
                                    </button>
                                    {userMenuOpen && (
                                        <div className="user-dropdown card" role="menu">
                                            <div className="user-dropdown-info">
                                                <span className="user-dropdown-name">{user.username}</span>
                                                <span className="user-dropdown-email">{user.email}</span>
                                            </div>
                                            <hr className="user-dropdown-divider" />
                                            <Link to="/profile" className="user-dropdown-item" role="menuitem">
                                                👤 {t('header.profile')}
                                            </Link>
                                            <Link to="/bookmarks" className="user-dropdown-item" role="menuitem">
                                                🔖 {t('header.bookmarks')}
                                            </Link>
                                            {hasAdminPortalAccess && (
                                                <a href="/admin-legacy" className="user-dropdown-item" role="menuitem">
                                                    ⚙️ {t('header.admin')}
                                                </a>
                                            )}
                                            <hr className="user-dropdown-divider" />
                                            <button
                                                type="button"
                                                className="user-dropdown-item user-dropdown-logout"
                                                onClick={() => void logout()}
                                            >
                                                🚪 {t('header.signOut')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="header-auth-btns hide-mobile">
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={openLogin}>
                                        {t('header.signIn')}
                                    </button>
                                    <button type="button" className="btn btn-accent btn-sm" onClick={openRegister}>
                                        {t('header.register')}
                                    </button>
                                </div>
                            )}

                            <button
                                type="button"
                                className="btn btn-ghost header-hamburger hide-desktop"
                                onClick={() => setMobileOpen((value) => !value)}
                                aria-label="Toggle menu"
                                aria-expanded={mobileOpen}
                            >
                                {mobileOpen ? '✕' : '☰'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="header-ticker" aria-label="Trending links">
                    <div className="container header-ticker-inner">
                        <span className="header-ticker-label">🔥 {t('header.trending')}:</span>
                        <div className="header-ticker-window">
                            <div className="header-ticker-track">
                                {[...tickerItems, ...tickerItems].map((term, index) => (
                                    <Link
                                        key={`${term}-${index}`}
                                        className="header-ticker-item"
                                        to={`/jobs?q=${encodeURIComponent(term)}&source=header_trending`}
                                    >
                                        {term}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {mobileOpen && (
                    <div className="header-mobile-menu">
                        <nav className="header-mobile-nav" aria-label="Mobile navigation">
                            {PRIMARY_LINKS.map((link) => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className={`header-mobile-link${location.pathname === link.to ? ' active' : ''}`}
                                    onClick={() => setMobileOpen(false)}
                                >
                                    {t(link.labelKey)}
                                </Link>
                            ))}

                            <div className="header-mobile-block">
                                <span className="header-mobile-block-title">More</span>
                                {MORE_LINKS.map((item) => (
                                    <Link
                                        key={item.to}
                                        to={item.to}
                                        className="header-mobile-link"
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>

                            <div className="header-mobile-block">
                                <span className="header-mobile-block-title">Apps & Channels</span>
                                <a href="https://play.google.com/store/apps" target="_blank" rel="noreferrer" className="header-mobile-link">📱 Android App</a>
                                <a href="https://apps.apple.com/" target="_blank" rel="noreferrer" className="header-mobile-link">🍎 iOS App</a>
                                <a href="https://t.me/sarkariexamsme" target="_blank" rel="noreferrer" className="header-mobile-link">✈️ Telegram</a>
                                <a href="https://wa.me/sarkariexamsme" target="_blank" rel="noreferrer" className="header-mobile-link">💬 WhatsApp</a>
                            </div>

                            <button
                                type="button"
                                className="header-mobile-link"
                                onClick={() => {
                                    toggleLanguage();
                                    setMobileOpen(false);
                                }}
                            >
                                {language === 'en' ? t('language.hi') : t('language.en')}
                            </button>

                            {user ? (
                                <>
                                    <Link to="/profile" className="header-mobile-link" onClick={() => setMobileOpen(false)}>
                                        👤 {t('header.profile')}
                                    </Link>
                                    <Link to="/bookmarks" className="header-mobile-link" onClick={() => setMobileOpen(false)}>
                                        🔖 {t('header.bookmarks')}
                                    </Link>
                                    {hasAdminPortalAccess && (
                                        <a href="/admin-legacy" className="header-mobile-link" onClick={() => setMobileOpen(false)}>
                                            ⚙️ {t('header.admin')}
                                        </a>
                                    )}
                                    <button
                                        type="button"
                                        className="header-mobile-link"
                                        onClick={() => {
                                            void logout();
                                            setMobileOpen(false);
                                        }}
                                    >
                                        🚪 {t('header.signOut')}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        className="header-mobile-link"
                                        onClick={() => {
                                            openLogin();
                                            setMobileOpen(false);
                                        }}
                                    >
                                        {t('header.signIn')}
                                    </button>
                                    <button
                                        type="button"
                                        className="header-mobile-link"
                                        onClick={() => {
                                            openRegister();
                                            setMobileOpen(false);
                                        }}
                                    >
                                        {t('header.register')}
                                    </button>
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
