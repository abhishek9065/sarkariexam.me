import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getMe, setAuthToken, getAuthToken, login as apiLogin, register as apiRegister, logout as apiLogout, ApiRequestError } from '../utils/api';
import type { User } from '../types';

/** Backend returns `name` but our User type uses `username` — normalize it */
function normalizeUser(raw: any): User {
    return {
        ...raw,
        username: raw.username || raw.name || raw.email,
    };
}

interface AuthState {
    user: User | null;
    loading: boolean;
    error: string | null;
}

export interface TwoFactorChallenge {
    email: string;
    password: string;
}

export type LoginResult = 'success' | 'two_factor_required';

interface AuthContextValue extends AuthState {
    login: (email: string, password: string, twoFactorCode?: string) => Promise<LoginResult>;
    register: (email: string, name: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
    isAdmin: boolean;
    twoFactorChallenge: TwoFactorChallenge | null;
    clearTwoFactorChallenge: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });
    const [twoFactorChallenge, setTwoFactorChallenge] = useState<TwoFactorChallenge | null>(null);

    /* Bootstrap — try to load user from saved token */
    useEffect(() => {
        const token = getAuthToken();
        if (!token) {
            setState({ user: null, loading: false, error: null });
            return;
        }
        (async () => {
            try {
                const res = await getMe();
                setState({ user: normalizeUser(res.data.user), loading: false, error: null });
            } catch {
                setAuthToken(null);
                setState({ user: null, loading: false, error: null });
            }
        })();
    }, []);

    const login = useCallback(async (email: string, password: string, twoFactorCode?: string): Promise<LoginResult> => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const res = await apiLogin(email, password, twoFactorCode);
            /* Admin login uses httpOnly cookies — token may not be in body */
            if (res.data.token) {
                setAuthToken(res.data.token);
            }
            setTwoFactorChallenge(null);
            setState({ user: normalizeUser(res.data.user), loading: false, error: null });
            return 'success';
        } catch (err: unknown) {
            /* Handle 2FA challenge */
            if (err instanceof ApiRequestError && err.status === 403) {
                const body = err.body as Record<string, unknown> | null;
                const errorCode = body?.error;

                if (errorCode === 'two_factor_required') {
                    setTwoFactorChallenge({ email, password });
                    setState((s) => ({ ...s, loading: false, error: null }));
                    return 'two_factor_required';
                }

                if (errorCode === 'two_factor_setup_required') {
                    setState((s) => ({
                        ...s,
                        loading: false,
                        error: 'Two-factor authentication setup is required. Please contact your administrator.',
                    }));
                    throw new Error('Two-factor authentication setup is required. Please contact your administrator.');
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
            if (res.data.token) {
                setAuthToken(res.data.token);
            }
            setState({ user: normalizeUser(res.data.user), loading: false, error: null });
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

    const isAdmin = state.user?.role === 'admin' || state.user?.role === 'editor';

    return (
        <AuthContext.Provider value={{
            ...state, login, register, logout, clearError,
            isAdmin, twoFactorChallenge, clearTwoFactorChallenge,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
