'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { PRIMARY_NAV } from '@/app/lib/ui';
import { SearchOverlay } from '@/app/components/SearchOverlay';
import { Icon } from '@/app/components/Icon';
import styles from './MobileBottomNav.module.css';

const NAV_ITEMS = [...PRIMARY_NAV.slice(0, 4)];

export function MobileBottomNav() {
    const pathname = usePathname();
    const [searchOpen, setSearchOpen] = useState(false);

    const isActive = (prefixes: string[]) => {
        if (prefixes.includes('/')) return pathname === '/';
        return prefixes.some((prefix) => pathname.startsWith(prefix));
    };

    return (
        <>
            <nav className={styles.nav} aria-label="Mobile bottom navigation">
                {NAV_ITEMS.map((item) => (
                    <Link key={item.key} href={item.href} className={`${styles.item}${isActive(item.matchPrefixes) ? ` ${styles.itemActive}` : ''}`}>
                        <span className={styles.icon}><Icon name={item.icon as Parameters<typeof Icon>[0]['name']} /></span>
                        <span>{item.labelEn}</span>
                    </Link>
                ))}
                <button type="button" className={styles.item} onClick={() => setSearchOpen(true)}>
                    <span className={styles.icon}><Icon name="Search" /></span>
                    <span>Search</span>
                </button>
            </nav>

            <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        </>
    );
}
