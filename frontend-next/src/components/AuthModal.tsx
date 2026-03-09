'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { login, register } from '@/lib/api';

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, login: setAuthUser } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!showAuthModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await login(email, password);
        if (res?.data?.user) setAuthUser(res.data.user);
      } else {
        const res = await register(email, name, password);
        if (res?.data?.user) setAuthUser(res.data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="glass-card" style={{ 
        width: '100%', maxWidth: '400px', padding: '2rem', 
        position: 'relative', margin: '1rem', background: 'var(--bg-card)' 
      }}>
        
        <button 
          onClick={() => setShowAuthModal(false)}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          aria-label="Close"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {mode === 'register' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', fontWeight: 500 }}>Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required style={{
                width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', background: 'var(--bg-primary)', color: 'var(--text-primary)'
              }} />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', fontWeight: 500 }}>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{
              width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', background: 'var(--bg-primary)', color: 'var(--text-primary)'
            }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', fontWeight: 500 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{
              width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', background: 'var(--bg-primary)', color: 'var(--text-primary)'
            }} />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '12px' }}>
            {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button" 
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </div>

      </div>
    </div>
  );
}
