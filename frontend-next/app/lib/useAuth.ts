'use client';

import { useContext } from 'react';

import { AuthContext, type AuthContextValue } from './auth-context';

const NOOP_AUTH: AuthContextValue = {
    user: null,
    loading: true,
    error: null,
    login: async () => 'success' as const,
    register: async () => {},
    logout: async () => {},
    clearError: () => {},
    isAdmin: false,
    hasAdminPortalAccess: false,
    adminPermissions: null,
    can: () => false,
    canAny: () => false,
    twoFactorChallenge: null,
    clearTwoFactorChallenge: () => {},
};

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    return context ?? NOOP_AUTH;
}
