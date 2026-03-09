'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Home' },
    { href: '/jobs', label: 'Latest Jobs' },
    { href: '/results', label: 'Results' },
    { href: '/admit-card', label: 'Admit Card' },
    { href: '/answer-key', label: 'Answer Key' },
    { href: '/syllabus', label: 'Syllabus' },
    { href: '/admission', label: 'Admission' },
  ];

  return (
    <header className="site-header glass-card" style={{ position: 'sticky', top: 0, zIndex: 100, borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0 }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 'var(--header-height)' }}>
        
        <Link href="/" className="logo" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)', textDecoration: 'none', letterSpacing: '-0.5px' }}>
          SarkariExams<span style={{ color: 'var(--text-primary)' }}>.me</span>
        </Link>

        <nav className="desktop-nav hide-mobile" style={{ display: 'flex', gap: '1.5rem' }}>
          {links.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
            return (
              <Link 
                key={link.href} 
                href={link.href}
                style={{
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/explore" className="btn btn-secondary hide-mobile" style={{ padding: '6px 12px', fontSize: '13px', textDecoration: 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            Search
          </Link>
          
          <AuthHeaderButton />
        </div>

      </div>
    </header>
  );
}

// Separate client component to consume Auth context without making whole header complex
import { useAuth } from '@/context/AuthContext';

function AuthHeaderButton() {
  const { user, setShowAuthModal } = useAuth();
  
  if (user) {
    return (
      <Link href="/profile" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: 'var(--radius-full)' }}>
        Profile
      </Link>
    );
  }
  
  return (
    <button onClick={() => setShowAuthModal(true)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: 'var(--radius-full)' }}>
      Log In
    </button>
  );
}
