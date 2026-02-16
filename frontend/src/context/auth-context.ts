import { createContext } from 'react';

import type { AdminPermission, AdminPermissionsSnapshot, User } from '../types';

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

export interface AuthContextValue extends AuthState {
    login: (email: string, password: string, twoFactorCode?: string) => Promise<LoginResult>;
    register: (email: string, name: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
    isAdmin: boolean;
    hasAdminPortalAccess: boolean;
    adminPermissions: AdminPermissionsSnapshot | null;
    can: (permission: AdminPermission) => boolean;
    canAny: (permissions: AdminPermission[]) => boolean;
    twoFactorChallenge: TwoFactorChallenge | null;
    clearTwoFactorChallenge: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
