import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import { useAuth } from '../context/useAuth';
import { useLanguage } from '../context/useLanguage';
import { SearchOverlay } from './SearchOverlay';
import { AuthModal } from './AuthModal';

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
];

const MORE_LINKS: Array<{ to: string; label: string }> = [
    { to: '/admission', label: '🎓 Admissions' },
    { to: '/syllabus', label: '📚 Syllabus' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
    { to: '/privacy', label: 'Privacy' },
    { to: '/disclaimer', label: 'Disclaimer' },
];



const normalizeAdminPortalPath = (value?: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return withLeadingSlash.endsWith('/') && withLeadingSlash.length > 1
        ? withLeadingSlash.slice(0, -1)
        : withLeadingSlash;
};

const configuredAdminPortalPath = normalizeAdminPortalPath(import.meta.env.VITE_ADMIN_PORTAL_PATH as string | undefined);
const adminPortalCandidates = Array.from(new Set([
    configuredAdminPortalPath,
    '/admin-vnext',
    '/admin',
    '/admin-legacy',
].filter((item): item is string => Boolean(item))));

async function resolveReachableAdminPortalPath(candidates: string[]): Promise<string> {
    if (typeof window === 'undefined') {
        return candidates[0] ?? '/admin';
    }

    for (const candidate of candidates) {
        try {
            const response = await fetch(candidate, {
                method: 'HEAD',
                credentials: 'include',
                redirect: 'manual',
                cache: 'no-store',
            });
            if (
                (response.status >= 200 && response.status < 400)
                || response.status === 401
                || response.status === 403
                || response.status === 405
            ) {
                return candidate;
            }
        } catch {
            // Try next fallback.
        }
    }

    return candidates[0] ?? '/admin';
}

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
    const [adminNavBusy, setAdminNavBusy] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMobileOpen(false);
        setUserMenuOpen(false);
        setMoreOpen(false);
    }, [location.pathname]);

    // Close dropdowns on outside click (stable listener via refs)
    const userMenuOpenRef = useRef(userMenuOpen);
    userMenuOpenRef.current = userMenuOpen;
    const moreOpenRef = useRef(moreOpen);
    moreOpenRef.current = moreOpen;

    useEffect(() => {
        const handleClickOutside = (e: globalThis.MouseEvent) => {
            if (userMenuOpenRef.current && userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setUserMenuOpen(false);
            }
            if (moreOpenRef.current && moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
                setMoreOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (searchParams.get('login') === '1') {
            setAuthTab('login');
            setAuthOpen(true);
            searchParams.delete('login');
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);



    const openLogin = () => {
        setAuthTab('login');
        setAuthOpen(true);
    };

    const openRegister = () => {
        setAuthTab('register');
        setAuthOpen(true);
    };

    const preferredAdminPortalPath = adminPortalCandidates[0] ?? '/admin';

    const navigateToAdminPortal = async (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        if (adminNavBusy) return;

        setAdminNavBusy(true);
        setUserMenuOpen(false);
        setMobileOpen(false);

        try {
            const target = await resolveReachableAdminPortalPath(adminPortalCandidates);
            window.location.assign(target);
        } finally {
            setAdminNavBusy(false);
        }
    };

    return (
        <>
            <header className="header" data-testid="app-header">
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
                            <button
                                type="button"
                                className="btn btn-ghost header-lang-btn hide-mobile"
                                onClick={toggleLanguage}
                                aria-label="Toggle language"
                            >
                                {language === 'en' ? 'हि' : 'En'}
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
                                                <a
                                                    href={preferredAdminPortalPath}
                                                    className="user-dropdown-item"
                                                    role="menuitem"
                                                    onClick={(event) => void navigateToAdminPortal(event)}
                                                    aria-disabled={adminNavBusy}
                                                >
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
                                <span className="header-mobile-block-title">Channels</span>
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
                                        <a
                                            href={preferredAdminPortalPath}
                                            className="header-mobile-link"
                                            onClick={(event) => void navigateToAdminPortal(event)}
                                            aria-disabled={adminNavBusy}
                                        >
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
