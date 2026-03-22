'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
    getMe,
    setAuthToken,
    login as apiLogin,
    register as apiRegister,
    logout as apiLogout,
    ApiRequestError,
} from '@/app/lib/api';
import type { User } from '@/app/lib/types';
import { AuthContext, type LoginResult, type TwoFactorChallenge } from './auth-context';

/** Backend returns `name` but our User type uses `username` — normalize it */
function normalizeUser(raw: User | Record<string, unknown>): User {
    // If already a User with username, return as-is
    if ('username' in raw && raw.username) {
        return raw as User;
    }
    
    // Otherwise normalize from Record<string, unknown>
    const record = raw as Record<string, unknown>;
    return {
        id: String(record.id || ''),
        email: String(record.email || ''),
        username: String(record.username || record.name || record.email || ''),
        role: String(record.role || 'user'),
        isActive: record.isActive ? Boolean(record.isActive) : undefined,
        createdAt: record.createdAt ? String(record.createdAt) : undefined,
        lastLogin: record.lastLogin ? String(record.lastLogin) : undefined,
        twoFactorEnabled: record.twoFactorEnabled ? Boolean(record.twoFactorEnabled) : undefined,
    };
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<{ user: User | null; loading: boolean; error: string | null }>({
        user: null,
        loading: true,
        error: null,
    });
    const [twoFactorChallenge, setTwoFactorChallenge] = useState<TwoFactorChallenge | null>(null);

    /* Bootstrap from the cookie-backed session. */
    useEffect(() => {
        let canceled = false;

        (async () => {
            try {
                const res = await getMe();
                const user = normalizeUser(res.data.user);
                if (canceled) return;
                setState({ user, loading: false, error: null });
            } catch {
                setAuthToken(null);
                if (canceled) return;
                setState({ user: null, loading: false, error: null });
            }
        })();

        return () => {
            canceled = true;
        };
    }, []);

    const login = useCallback(async (email: string, password?: string, twoFactorCode?: string, challengeToken?: string): Promise<LoginResult> => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const res = await apiLogin(email, password, twoFactorCode, challengeToken);
            setTwoFactorChallenge(null);
            const user = normalizeUser(res.data.user);
            setState({ user, loading: false, error: null });
            return 'success';
        } catch (err: unknown) {
            /* Handle 2FA challenge */
            if (err instanceof ApiRequestError && err.status === 403) {
                const body = err.body as Record<string, unknown> | null;
                const errorCode = body?.error;

                if (errorCode === 'two_factor_required') {
                    const nextChallengeToken = typeof body?.challengeToken === 'string' ? body.challengeToken : null;
                    if (!nextChallengeToken) {
                        setState((s) => ({
                            ...s,
                            loading: false,
                            error: 'Sign-in challenge expired. Please try again.',
                        }));
                        throw new Error('Missing login challenge token');
                    }
                    setTwoFactorChallenge({ email, challengeToken: nextChallengeToken });
                    setState((s) => ({ ...s, loading: false, error: null }));
                    return 'two_factor_required';
                }

                if (errorCode === 'two_factor_setup_required') {
                    setState((s) => ({
                        ...s,
                        loading: false,
                        error: 'Additional verification setup is required for this account.',
                    }));
                    throw new Error('Additional verification setup is required for this account.');
                }
            }

            const message = err instanceof ApiRequestError
                ? (
                    (err.body as Record<string, unknown> | null)?.error === 'csrf_invalid'
                        ? 'Security session expired. Please retry.'
                        : ((err.body as Record<string, unknown> | null)?.message as string) || err.message
                )
                : err instanceof Error ? err.message : 'Login failed';

            setState((s) => ({ ...s, loading: false, error: message }));
            throw err;
        }
    }, []);

    const register = useCallback(async (email: string, name: string, password: string) => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const res = await apiRegister(email, name, password);
            const user = normalizeUser(res.data.user);
            setState({ user, loading: false, error: null });
        } catch (err: unknown) {
            const message = err instanceof ApiRequestError
                ? (
                    (err.body as Record<string, unknown> | null)?.error === 'csrf_invalid'
                        ? 'Security session expired. Please retry.'
                        : ((err.body as Record<string, unknown> | null)?.message as string) || err.message
                )
                : err instanceof Error ? err.message : 'Registration failed';

            setState((s) => ({ ...s, loading: false, error: message }));
            throw err;
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await apiLogout();
        } catch (error) {
            console.warn('Backend logout failed; clearing local auth state anyway.', error);
        }
        setAuthToken(null);
        setTwoFactorChallenge(null);
        setState({ user: null, loading: false, error: null });
    }, []);

    const clearError = useCallback(() => {
        setState((s) => ({ ...s, error: null }));
    }, []);

    const clearTwoFactorChallenge = useCallback(() => {
        setTwoFactorChallenge(null);
    }, []);

    return (
        <AuthContext.Provider value={{
            ...state, login, register, logout, clearError,
            twoFactorChallenge, clearTwoFactorChallenge,
        }}>
            {children}
        </AuthContext.Provider>
    );
}
