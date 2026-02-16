import { useCallback, useEffect, useMemo, useState } from 'react';

import {
    adminAuthLogin,
    adminAuthLogout,
    adminAuthStepUp,
    getAdminMe,
    getAdminPermissions,
} from '../lib/api/client';
import { AdminAuthContext } from './auth-context';
import type { AdminPermissionSnapshot, AdminUser } from '../types';

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AdminUser | null>(null);
    const [permissions, setPermissions] = useState<AdminPermissionSnapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [stepUpToken, setStepUpToken] = useState<string | null>(null);
    const [stepUpExpiresAt, setStepUpExpiresAt] = useState<string | null>(null);

    const clearStepUp = useCallback(() => {
        setStepUpToken(null);
        setStepUpExpiresAt(null);
    }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const [nextUser, nextPermissions] = await Promise.all([
                getAdminMe(),
                getAdminPermissions(),
            ]);
            setUser(nextUser);
            setPermissions(nextPermissions);
            if (!nextUser) clearStepUp();
        } catch {
            setUser(null);
            setPermissions(null);
            clearStepUp();
        } finally {
            setLoading(false);
        }
    }, [clearStepUp]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const login = useCallback(async (email: string, password: string, twoFactorCode?: string) => {
        await adminAuthLogin(email, password, twoFactorCode);
        await refresh();
    }, [refresh]);

    const logout = useCallback(async () => {
        await adminAuthLogout();
        setUser(null);
        setPermissions(null);
        clearStepUp();
    }, [clearStepUp]);

    const issueStepUp = useCallback(async (password: string, twoFactorCode?: string) => {
        if (!user?.email) {
            throw new Error('Active admin session is required');
        }
        const grant = await adminAuthStepUp(user.email, password, twoFactorCode);
        setStepUpToken(grant.token);
        setStepUpExpiresAt(grant.expiresAt);
    }, [user?.email]);

    const hasValidStepUp = useMemo(() => {
        if (!stepUpToken || !stepUpExpiresAt) return false;
        const expiresAtMs = new Date(stepUpExpiresAt).getTime();
        if (Number.isNaN(expiresAtMs)) return false;
        return expiresAtMs > Date.now();
    }, [stepUpToken, stepUpExpiresAt]);

    useEffect(() => {
        if (!stepUpExpiresAt) return undefined;
        const expiresAtMs = new Date(stepUpExpiresAt).getTime();
        if (Number.isNaN(expiresAtMs)) {
            clearStepUp();
            return undefined;
        }

        const remaining = expiresAtMs - Date.now();
        if (remaining <= 0) {
            clearStepUp();
            return undefined;
        }

        const timeout = window.setTimeout(() => {
            clearStepUp();
        }, remaining);

        return () => window.clearTimeout(timeout);
    }, [stepUpExpiresAt, clearStepUp]);

    const value = useMemo(() => ({
        user,
        permissions,
        loading,
        login,
        logout,
        refresh,
        stepUpToken,
        stepUpExpiresAt,
        hasValidStepUp,
        issueStepUp,
        clearStepUp,
    }), [
        user,
        permissions,
        loading,
        login,
        logout,
        refresh,
        stepUpToken,
        stepUpExpiresAt,
        hasValidStepUp,
        issueStepUp,
        clearStepUp,
    ]);

    return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
