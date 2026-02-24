import type { AdminPermission, AdminPermissionSnapshot, AdminPortalRole } from '../types';

export const FALLBACK_ADMIN_ROLE_PERMISSIONS: Record<AdminPortalRole, string[]> = {
    admin: ['*'],
    editor: [
        'admin:read',
        'admin:write',
        'analytics:read',
        'announcements:read',
        'announcements:write',
    ],
    contributor: [
        'admin:read',
        'analytics:read',
        'announcements:read',
        'announcements:write',
    ],
    reviewer: [
        'admin:read',
        'analytics:read',
        'announcements:read',
        'announcements:approve',
        'audit:read',
    ],
    viewer: [
        'admin:read',
        'analytics:read',
        'announcements:read',
    ],
};

const matchesPermission = (permission: string, allowed: string): boolean => {
    if (allowed === '*') return true;
    if (allowed.endsWith(':*')) return permission.startsWith(allowed.slice(0, -1));
    return permission === allowed;
};

export function hasAdminPermission(
    snapshot: AdminPermissionSnapshot | null,
    role: AdminPortalRole | undefined,
    permission: AdminPermission
): boolean {
    if (!role) return false;
    const allowed = snapshot?.roles?.[role] ?? FALLBACK_ADMIN_ROLE_PERMISSIONS[role] ?? [];
    return allowed.some((entry) => matchesPermission(permission, entry));
}
