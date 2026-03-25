'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { buildCategoryPath } from '@/app/lib/urls';
import '@/app/components/MobileBottomNav.css';

const NAV_ITEMS = [
    { key: 'home', label: 'Home', icon: '🏠', to: '/', matchPrefixes: ['/'] },
    { key: 'jobs', label: 'Jobs', icon: '💼', to: buildCategoryPath('job'), matchPrefixes: ['/jobs', '/job'] },
    { key: 'results', label: 'Results', icon: '📊', to: buildCategoryPath('result'), matchPrefixes: ['/results', '/result'] },
    { key: 'admit', label: 'Admit Card', icon: '🎫', to: buildCategoryPath('admit-card'), matchPrefixes: ['/admit-cards', '/admit-card'] },
];

export function MobileBottomNav() {
    const pathname = usePathname();

    // Check if the current route matches the nav item (Home is a special case)
    const isActive = (matchPrefixes: string[]) => {
        if (matchPrefixes.includes('/')) return pathname === '/';
        return matchPrefixes.some((prefix) => pathname.startsWith(prefix));
    };

    return (
        <nav className="mobile-bottom-nav">
            <ul className="mbn-list">
                {NAV_ITEMS.map((item) => {
                    const active = isActive(item.matchPrefixes);
                    return (
                        <li key={item.key} className={`mbn-item ${active ? 'active' : ''}`}>
                            <Link href={item.to} className="mbn-link">
                                <span className="mbn-icon" aria-hidden="true">{item.icon}</span>
                                <span className="mbn-label">{item.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
