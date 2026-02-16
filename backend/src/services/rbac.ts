import type { UserRole } from '../types.js';

import { ADMIN_ROLE_PERMISSIONS } from './adminPermissions.js';

export type Permission =
    | 'admin:read'
    | 'admin:write'
    | 'analytics:read'
    | 'announcements:read'
    | 'announcements:write'
    | 'announcements:approve'
    | 'announcements:delete'
    | 'audit:read'
    | 'security:read';

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    ...ADMIN_ROLE_PERMISSIONS,
    user: [],
};

const matchesPermission = (permission: string, allowed: string): boolean => {
    if (allowed === '*') return true;
    if (allowed.endsWith(':*')) {
        return permission.startsWith(allowed.slice(0, -1));
    }
    return permission === allowed;
};

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
    if (!role) return false;
    const allowed = ROLE_PERMISSIONS[role] ?? [];
    return allowed.some((entry) => matchesPermission(permission, entry));
}

export function listPermissions(role: UserRole | undefined): string[] {
    if (!role) return [];
    return ROLE_PERMISSIONS[role] ?? [];
}
