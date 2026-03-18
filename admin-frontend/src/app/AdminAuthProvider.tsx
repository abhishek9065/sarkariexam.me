import { useCallback, useEffect, useMemo, useState } from 'react';

import {
    AdminApiWorkflowError,
    adminAuthLogin,
    adminAuthLogout,
    adminAuthStepUp,
    getAdminMe,
    getAdminPermissions,
} from '../lib/api/client';
import { AdminAuthContext } from './auth-context';
import type { AdminPermissionSnapshot, AdminUser } from '../types';

const E2E_STEP_UP_BYPASS = import.meta.env.VITE_ADMIN_E2E_STEPUP_BYPASS === 'true';
const E2E_STEP_UP_TOKEN = 'e2e-step-up-token';
const E2E_STEP_UP_EXPIRY = '2099-12-31T23:59:59.000Z';

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AdminUser | null>(null);
    const [permissions, setPermissions] = useState<AdminPermissionSnapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [sessionStatus, setSessionStatus] = useState<'signed_out' | 'active' | 'session_expired'>('signed_out');
    const [stepUpToken, setStepUpToken] = useState<string | null>(E2E_STEP_UP_BYPASS ? E2E_STEP_UP_TOKEN : null);
    const [stepUpExpiresAt, setStepUpExpiresAt] = useState<string | null>(E2E_STEP_UP_BYPASS ? E2E_STEP_UP_EXPIRY : null);

    const clearStepUp = useCallback(() => {
        if (E2E_STEP_UP_BYPASS) return;
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
            setSessionStatus(nextUser ? 'active' : 'signed_out');
            if (!nextUser) clearStepUp();
        } catch (error) {
            setUser(null);
            setPermissions(null);
            clearStepUp();
            if (
                error instanceof AdminApiWorkflowError
                && (error.code === 'session_invalid' || error.code === 'TOKEN_EXPIRED' || error.code === 'TOKEN_INVALID')
            ) {
                setSessionStatus('session_expired');
            } else {
                setSessionStatus('signed_out');
            }
        } finally {
            setLoading(false);
        }
    }, [clearStepUp]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    useEffect(() => {
        if (!E2E_STEP_UP_BYPASS) return;
        setStepUpToken(E2E_STEP_UP_TOKEN);
        setStepUpExpiresAt(E2E_STEP_UP_EXPIRY);
    }, []);

    const login = useCallback(async (email: string, password?: string, twoFactorCode?: string, challengeToken?: string) => {
        const result = await adminAuthLogin(email, password, twoFactorCode, challengeToken);
        if (result.status === 'authenticated') {
            await refresh();
        } else {
            setSessionStatus('signed_out');
        }
        return result;
    }, [refresh]);

    const logout = useCallback(async () => {
        await adminAuthLogout();
        setUser(null);
        setPermissions(null);
        setSessionStatus('signed_out');
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
        if (E2E_STEP_UP_BYPASS) return true;
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
        sessionStatus,
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
        sessionStatus,
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
