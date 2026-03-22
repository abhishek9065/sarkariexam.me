'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/app/lib/useTheme';
import { useAuth } from '@/app/lib/useAuth';
import { useLanguage } from '@/app/lib/useLanguage';
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
export function Header() {
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const { language, toggleLanguage, t } = useLanguage();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
    const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const loginRequested = searchParams.get('login') === '1';

    useEffect(() => {
        const handleClickOutside = (e: globalThis.MouseEvent) => {
            if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setUserMenuOpen(false);
            }
            if (moreOpen && moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
                setMoreOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [moreOpen, userMenuOpen]);

    const openLogin = () => {
        setAuthTab('login');
        setAuthOpen(true);
    };

    const openRegister = () => {
        setAuthTab('register');
        setAuthOpen(true);
    };

    const closeAuth = () => {
        setAuthOpen(false);
        if (!loginRequested) return;
        const cleaned = new URLSearchParams(searchParams.toString());
        cleaned.delete('login');
        const nextQuery = cleaned.toString();
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    };

    return (
        <>
            <header className="header" data-testid="app-header">
                <div className="header-main">
                    <div className="container header-main-inner">
                        <Link href="/" className="header-logo" onClick={() => setMobileOpen(false)}>
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
                                    href={link.to}
                                    className={`header-nav-link${pathname === link.to ? ' active' : ''}`}
                                    onClick={() => {
                                        setMobileOpen(false);
                                        setUserMenuOpen(false);
                                        setMoreOpen(false);
                                    }}
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
                                            <Link
                                                key={item.to}
                                                href={item.to}
                                                className="header-more-item"
                                                role="menuitem"
                                                onClick={() => setMoreOpen(false)}
                                            >
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
                                            <Link href="/profile" className="user-dropdown-item" role="menuitem">
                                                👤 {t('header.profile')}
                                            </Link>
                                            <Link href="/bookmarks" className="user-dropdown-item" role="menuitem">
                                                🔖 {t('header.bookmarks')}
                                            </Link>
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
                                    href={link.to}
                                    className={`header-mobile-link${pathname === link.to ? ' active' : ''}`}
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
                                        href={item.to}
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
                                    <Link href="/profile" className="header-mobile-link" onClick={() => setMobileOpen(false)}>
                                        👤 {t('header.profile')}
                                    </Link>
                                    <Link href="/bookmarks" className="header-mobile-link" onClick={() => setMobileOpen(false)}>
                                        🔖 {t('header.bookmarks')}
                                    </Link>
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
            <AuthModal
                isOpen={authOpen || loginRequested}
                onClose={closeAuth}
                initialTab={loginRequested ? 'login' : authTab}
            />
        </>
    );
}
