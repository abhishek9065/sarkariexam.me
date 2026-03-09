'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home', icon: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path> },
    { href: '/jobs', label: 'Jobs', icon: <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path> },
    { href: '/results', label: 'Results', icon: <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path> },
    { href: '/profile', label: 'Profile', icon: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path> },
  ];

  return (
    <nav className="hide-desktop" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'var(--bg-card)',
      borderTop: '1px solid var(--border-primary)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 100,
      display: 'flex',
      justifyContent: 'space-around',
      boxShadow: '0 -4px 12px rgba(0,0,0,0.05)'
    }}>
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
        return (
          <Link 
            key={item.href} 
            href={item.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '10px 0',
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              flex: 1,
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '4px' }}>
              {item.icon}
            </svg>
            <span style={{ fontSize: '10px', fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
