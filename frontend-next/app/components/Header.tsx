'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '@/app/lib/useTheme';
import { useAuth } from '@/app/lib/useAuth';
import { useLanguage } from '@/app/lib/useLanguage';
import { copyFor, PRIMARY_NAV, SECONDARY_LINKS, TRUST_PILLARS } from '@/app/lib/ui';
import { SearchOverlay } from '@/app/components/SearchOverlay';
import { AuthModal } from '@/app/components/AuthModal';
import { Icon } from '@/app/components/Icon';
import styles from './Header.module.css';

export function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const { language, toggleLanguage } = useLanguage();

    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
    const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
    const [moreOpen, setMoreOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const moreMenuRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const loginRequested = searchParams.get('login') === '1';

    const trustCopy = useMemo(() => {
        return TRUST_PILLARS.map((item) => copyFor(language, item.titleEn, item.titleHi)).join(' • ');
    }, [language]);

    const isNavActive = (prefixes: string[]) => {
        if (prefixes.includes('/')) return pathname === '/';
        return prefixes.some((prefix) => pathname.startsWith(prefix));
    };

    useEffect(() => {
        const handleOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (moreOpen && moreMenuRef.current && !moreMenuRef.current.contains(target)) setMoreOpen(false);
            if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(target)) setUserMenuOpen(false);
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [moreOpen, userMenuOpen]);

    const closeAuth = () => {
        setAuthOpen(false);
        if (!loginRequested) return;
        const next = new URLSearchParams(searchParams.toString());
        next.delete('login');
        const query = next.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
    };

    return (
        <>
            <header className={styles.header} data-testid="app-header">
                <div className={styles.trustBar}>
                    <div className={`container ${styles.trustBarInner}`}>
                        <span className={styles.trustPill}>
                            <Icon name="ShieldCheck" />
                            {copyFor(language, 'Official-source linked', 'ऑफिशियल सोर्स लिंक्ड')}
                        </span>
                        <p className={styles.trustCopy}>{trustCopy}</p>
                    </div>
                </div>

                <div className={styles.chrome}>
                    <div className={`container ${styles.chromeInner}`}>
                        <Link href="/" className={styles.brand} onClick={() => setMobileOpen(false)}>
                            <span className={styles.brandMark}>SE</span>
                            <span className={styles.brandCopy}>
                                <strong>SarkariExams.me</strong>
                                <small>{copyFor(language, 'Trust-first exam command center', 'ट्रस्ट-फर्स्ट एग्जाम कमांड सेंटर')}</small>
                            </span>
                        </Link>

                        <nav className={styles.nav} aria-label="Primary navigation">
                            {PRIMARY_NAV.map((item) => (
                                <Link
                                    key={item.key}
                                    href={item.href}
                                    className={`${styles.navLink}${isNavActive(item.matchPrefixes) ? ` ${styles.navLinkActive}` : ''}`}
                                >
                                    {copyFor(language, item.labelEn, item.labelHi)}
                                </Link>
                            ))}

                            <div className={styles.moreWrap} ref={moreMenuRef}>
                                <button
                                    type="button"
                                    className={`${styles.navLink} ${styles.moreButton}${moreOpen ? ` ${styles.navLinkActive}` : ''}`}
                                    onClick={() => setMoreOpen((value) => !value)}
                                >
                                    {copyFor(language, 'More', 'और')}
                                </button>
                                {moreOpen && (
                                    <div className={styles.moreMenu} role="menu">
                                        {SECONDARY_LINKS.map((item) => (
                                            <Link key={item.href} href={item.href} className={styles.moreItem} onClick={() => setMoreOpen(false)}>
                                                {copyFor(language, item.labelEn, item.labelHi)}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </nav>

                        <div className={styles.actions}>
                            <button type="button" className={styles.iconButton} onClick={() => setSearchOpen(true)} aria-label="Open search">
                                <Icon name="Search" />
                            </button>
                            <button type="button" className={styles.iconButton} onClick={toggleLanguage} aria-label="Toggle language">
                                <Icon name="Languages" />
                                <span>{language === 'en' ? 'हिं' : 'EN'}</span>
                            </button>
                            <button type="button" className={styles.iconButton} onClick={toggleTheme} aria-label="Toggle theme">
                                <Icon name={theme === 'light' ? 'Moon' : 'Sun'} />
                            </button>

                            {user ? (
                                <div className={styles.userWrap} ref={userMenuRef}>
                                    <button type="button" className={styles.avatarButton} onClick={() => setUserMenuOpen((value) => !value)}>
                                        <span>{(user.username || user.email)[0]?.toUpperCase() || 'U'}</span>
                                    </button>
                                    {userMenuOpen && (
                                        <div className={styles.userMenu}>
                                            <div className={styles.userMeta}>
                                                <strong>{user.username}</strong>
                                                <span>{user.email}</span>
                                            </div>
                                            <Link href="/profile" className={styles.userItem} onClick={() => setUserMenuOpen(false)}>
                                                <Icon name="User" />
                                                {copyFor(language, 'Profile', 'प्रोफाइल')}
                                            </Link>
                                            <Link href="/bookmarks" className={styles.userItem} onClick={() => setUserMenuOpen(false)}>
                                                <Icon name="Bookmark" />
                                                {copyFor(language, 'Bookmarks', 'बुकमार्क्स')}
                                            </Link>
                                            <button
                                                type="button"
                                                className={styles.userItem}
                                                onClick={() => {
                                                    void logout();
                                                    setUserMenuOpen(false);
                                                }}
                                            >
                                                <Icon name="ArrowRight" />
                                                {copyFor(language, 'Sign out', 'साइन आउट')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className={styles.authButtons}>
                                    <button type="button" className={styles.textButton} onClick={() => { setAuthTab('login'); setAuthOpen(true); }}>
                                        {copyFor(language, 'Sign in', 'साइन इन')}
                                    </button>
                                    <button type="button" className={styles.primaryButton} onClick={() => { setAuthTab('register'); setAuthOpen(true); }}>
                                        {copyFor(language, 'Register', 'रजिस्टर')}
                                    </button>
                                </div>
                            )}

                            <button type="button" className={`${styles.iconButton} ${styles.mobileOnly}`} onClick={() => setMobileOpen((value) => !value)} aria-label="Toggle menu">
                                <Icon name={mobileOpen ? 'Close' : 'Menu'} />
                            </button>
                        </div>
                    </div>
                </div>

                {mobileOpen && (
                    <div className={styles.mobileMenu}>
                        <div className={`container ${styles.mobileMenuInner}`}>
                            <div className={styles.mobilePrimary}>
                                {PRIMARY_NAV.map((item) => (
                                    <Link
                                        key={item.key}
                                        href={item.href}
                                        className={`${styles.mobileLink}${isNavActive(item.matchPrefixes) ? ` ${styles.mobileLinkActive}` : ''}`}
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        <span className={styles.mobileLinkIcon}><Icon name={item.icon as Parameters<typeof Icon>[0]['name']} /></span>
                                        {copyFor(language, item.labelEn, item.labelHi)}
                                    </Link>
                                ))}
                            </div>

                            <div className={styles.mobileSecondary}>
                                {SECONDARY_LINKS.map((item) => (
                                    <Link key={item.href} href={item.href} className={styles.mobileSecondaryLink} onClick={() => setMobileOpen(false)}>
                                        {copyFor(language, item.labelEn, item.labelHi)}
                                    </Link>
                                ))}
                            </div>

                            {!user ? (
                                <div className={styles.mobileAuth}>
                                    <button type="button" className={styles.textButton} onClick={() => { setAuthTab('login'); setAuthOpen(true); setMobileOpen(false); }}>
                                        {copyFor(language, 'Sign in', 'साइन इन')}
                                    </button>
                                    <button type="button" className={styles.primaryButton} onClick={() => { setAuthTab('register'); setAuthOpen(true); setMobileOpen(false); }}>
                                        {copyFor(language, 'Create account', 'अकाउंट बनाएं')}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}
            </header>

            <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
            <AuthModal isOpen={authOpen || loginRequested} onClose={closeAuth} initialTab={loginRequested ? 'login' : authTab} />
        </>
    );
}
