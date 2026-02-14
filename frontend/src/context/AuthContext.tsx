import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getMe, setAuthToken, getAuthToken, login as apiLogin, register as apiRegister } from '../utils/api';
import type { User } from '../types';

interface AuthState {
    user: User | null;
    loading: boolean;
    error: string | null;
}

interface AuthContextValue extends AuthState {
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, name: string, password: string) => Promise<void>;
    logout: () => void;
    clearError: () => void;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });

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
                setState({ user: res.data, loading: false, error: null });
            } catch {
                setAuthToken(null);
                setState({ user: null, loading: false, error: null });
            }
        })();
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const res = await apiLogin(email, password);
            setAuthToken(res.data.token);
            setState({ user: res.data.user, loading: false, error: null });
        } catch (err: unknown) {
            setState((s) => ({
                ...s,
                loading: false,
                error: err instanceof Error ? err.message : 'Login failed',
            }));
            throw err;
        }
    }, []);

    const register = useCallback(async (email: string, name: string, password: string) => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const res = await apiRegister(email, name, password);
            setAuthToken(res.data.token);
            setState({ user: res.data.user, loading: false, error: null });
        } catch (err: unknown) {
            setState((s) => ({
                ...s,
                loading: false,
                error: err instanceof Error ? err.message : 'Registration failed',
            }));
            throw err;
        }
    }, []);

    const logout = useCallback(() => {
        setAuthToken(null);
        setState({ user: null, loading: false, error: null });
    }, []);

    const clearError = useCallback(() => {
        setState((s) => ({ ...s, error: null }));
    }, []);

    const isAdmin = state.user?.role === 'admin' || state.user?.role === 'editor';

    return (
        <AuthContext.Provider value={{ ...state, login, register, logout, clearError, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
