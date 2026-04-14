'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getMe, login as apiLogin, logout as apiLogout, clearCsrfCache, ApiError } from './api';
import type { User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const EDITORIAL_ROLES = new Set(['editor', 'reviewer', 'admin', 'superadmin']);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getMe();
        const user = res.data.user;
        if (cancelled) return;
        if (!EDITORIAL_ROLES.has(user.role)) {
          setState({ user: null, loading: false, error: 'Editorial access required' });
          return;
        }
        setState({ user, loading: false, error: null });
      } catch {
        clearCsrfCache();
        if (cancelled) return;
        setState({ user: null, loading: false, error: null });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const res = await apiLogin(email, password);
      const user = res.data.user;
      if (!EDITORIAL_ROLES.has(user.role)) {
        clearCsrfCache();
        setState({ user: null, loading: false, error: 'Editorial access required. Your account does not have CMS privileges.' });
        return;
      }
      setState({ user, loading: false, error: null });
    } catch (err) {
      const message = err instanceof ApiError
        ? ((err.body as Record<string, unknown> | null)?.message as string || err.message)
        : err instanceof Error ? err.message : 'Login failed';
      setState(s => ({ ...s, loading: false, error: message }));
    }
  }, []);

  const logout = useCallback(async () => {
    try { await apiLogout(); } catch { /* ignore */ }
    clearCsrfCache();
    setState({ user: null, loading: false, error: null });
  }, []);

  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}
