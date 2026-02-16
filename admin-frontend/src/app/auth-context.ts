import { createContext } from 'react';

import type { AdminPermissionSnapshot, AdminUser } from '../types';

export interface AdminAuthContextValue {
    user: AdminUser | null;
    permissions: AdminPermissionSnapshot | null;
    loading: boolean;
    login: (email: string, password: string, twoFactorCode?: string) => Promise<void>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
    stepUpToken: string | null;
    stepUpExpiresAt: string | null;
    hasValidStepUp: boolean;
    issueStepUp: (password: string, twoFactorCode?: string) => Promise<void>;
    clearStepUp: () => void;
}

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);
