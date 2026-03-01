import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
    getAdminPermissions,
    getMe,
    setAuthToken,
    getAuthToken,
    login as apiLogin,
    register as apiRegister,
    logout as apiLogout,
    ApiRequestError,
} from '../utils/api';
import type { AdminPermission, AdminPermissionsSnapshot, User } from '../types';
import { fallbackPermissionsSnapshot, hasAdminPermission, isAdminPortalRole } from '../utils/adminRbac';
import { AuthContext, type LoginResult, type TwoFactorChallenge } from './auth-context';

/** Backend returns `name` but our User type uses `username` — normalize it */
function normalizeUser(raw: Record<string, unknown>): User {
    return {
        ...(raw as User),
        username: (raw.username || raw.name || raw.email) as string,
    };
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<{ user: User | null; loading: boolean; error: string | null }>({
        user: null,
        loading: true,
        error: null,
    });
    const [twoFactorChallenge, setTwoFactorChallenge] = useState<TwoFactorChallenge | null>(null);
    const [adminPermissions, setAdminPermissions] = useState<AdminPermissionsSnapshot | null>(null);

    const syncAdminPermissions = useCallback(async (user: User | null) => {
        if (!user || !isAdminPortalRole(user.role)) {
            setAdminPermissions(null);
            return;
        }

        try {
            const res = await getAdminPermissions();
            setAdminPermissions(res.data);
        } catch (error) {
            console.warn('Admin permissions fetch failed, using fallback mapping.', error);
            setAdminPermissions(fallbackPermissionsSnapshot(user.role));
        }
    }, []);

    /* Bootstrap — try to load user from saved token */
    useEffect(() => {
        let canceled = false;

        const token = getAuthToken();
        if (!token) {
            setState({ user: null, loading: false, error: null });
            setAdminPermissions(null);
            return;
        }

        (async () => {
            try {
                const res = await getMe();
                const user = normalizeUser(res.data.user);
                if (canceled) return;
                setState({ user, loading: false, error: null });
                await syncAdminPermissions(user);
            } catch {
                setAuthToken(null);
                setAdminPermissions(null);
                setState({ user: null, loading: false, error: null });
            }
        })();

        return () => {
            canceled = true;
        };
    }, [syncAdminPermissions]);

    const login = useCallback(async (email: string, password: string, twoFactorCode?: string): Promise<LoginResult> => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const res = await apiLogin(email, password, twoFactorCode);
            /* Admin login uses httpOnly cookies — token may not be in body */
            if (res.data.token) {
                setAuthToken(res.data.token);
            }
            setTwoFactorChallenge(null);
            const user = normalizeUser(res.data.user);
            setState({ user, loading: false, error: null });
            await syncAdminPermissions(user);
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
    }, [syncAdminPermissions]);

    const register = useCallback(async (email: string, name: string, password: string) => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const res = await apiRegister(email, name, password);
            if (res.data.token) {
                setAuthToken(res.data.token);
            }
            const user = normalizeUser(res.data.user);
            setState({ user, loading: false, error: null });
            await syncAdminPermissions(user);
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
    }, [syncAdminPermissions]);

    const logout = useCallback(async () => {
        try {
            await apiLogout();
        } catch (error) {
            console.warn('Backend logout failed; clearing local auth state anyway.', error);
        }
        setAuthToken(null);
        setAdminPermissions(null);
        setTwoFactorChallenge(null);
        setState({ user: null, loading: false, error: null });
    }, []);

    const clearError = useCallback(() => {
        setState((s) => ({ ...s, error: null }));
    }, []);

    const clearTwoFactorChallenge = useCallback(() => {
        setTwoFactorChallenge(null);
    }, []);

    const hasAdminPortalAccess = isAdminPortalRole(state.user?.role);
    const isAdmin = hasAdminPortalAccess;

    const can = useCallback((permission: AdminPermission): boolean => {
        if (!state.user || !isAdminPortalRole(state.user.role)) return false;
        return hasAdminPermission(adminPermissions, state.user.role, permission);
    }, [adminPermissions, state.user]);

    const canAny = useCallback((permissions: AdminPermission[]): boolean => {
        return permissions.some((permission) => can(permission));
    }, [can]);

    return (
        <AuthContext.Provider value={{
            ...state, login, register, logout, clearError,
            isAdmin, hasAdminPortalAccess, adminPermissions, can, canAny, twoFactorChallenge, clearTwoFactorChallenge,
        }}>
            {children}
        </AuthContext.Provider>
    );
}
