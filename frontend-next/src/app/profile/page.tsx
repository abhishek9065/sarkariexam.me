'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, isLoading, logout, setShowAuthModal } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If done loading and no user, ask to login
    if (!isLoading && !user) {
      setShowAuthModal(true);
    }
  }, [user, isLoading, setShowAuthModal]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', minHeight: '60vh', display: 'flex', justifyContent: 'center' }}>
        <p className="text-muted">Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', minHeight: '60vh', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Access Denied</h1>
        <p className="text-secondary" style={{ marginBottom: '2rem' }}>You must be logged in to view your profile.</p>
        <button className="btn btn-primary" onClick={() => setShowAuthModal(true)}>Log In Now</button>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', minHeight: '80vh' }}>
      
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-primary)', paddingBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>My Profile</h1>
          <p className="text-secondary">Manage your account and preferences.</p>
        </div>
        <button onClick={handleLogout} className="btn btn-secondary" style={{ color: 'var(--accent-red)' }}>
          Sign Out
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* User Card */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-purple))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            {user.username?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
          </div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{user.username || 'User'}</h2>
          <p className="text-secondary" style={{ marginBottom: '1rem' }}>{user.email}</p>
          <div style={{ display: 'inline-flex', padding: '4px 8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Role: {user.role === 'admin' ? 'Administrator' : 'Standard User'}
          </div>
        </div>

        {/* Quick Links */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', color: 'var(--accent)' }}>Dashboard</h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <li>
              <Link href="/bookmarks" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontWeight: 500, color: 'var(--text-primary)', textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                  My Saved Jobs
                </div>
                <span style={{ color: 'var(--text-muted)' }}>→</span>
              </Link>
            </li>
            {user.role === 'admin' && (
              <li>
                <a href="/admin" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontWeight: 500, color: '#fff', textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    Go to Admin Panel
                  </div>
                  <span>→</span>
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
