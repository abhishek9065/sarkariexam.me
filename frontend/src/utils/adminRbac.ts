import type { AdminPermission, AdminPermissionsSnapshot, AdminPortalRole } from '../types';

export const ADMIN_PORTAL_ROLES: AdminPortalRole[] = ['admin', 'editor', 'contributor', 'reviewer', 'viewer'];

const ADMIN_PORTAL_ROLE_SET = new Set<AdminPortalRole>(ADMIN_PORTAL_ROLES);

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

export const FALLBACK_ADMIN_HIGH_RISK_ACTIONS = [
    'announcement_publish',
    'announcement_bulk_publish',
    'announcement_delete',
];

const matchesPermission = (permission: string, allowed: string): boolean => {
    if (allowed === '*') return true;
    if (allowed.endsWith(':*')) return permission.startsWith(allowed.slice(0, -1));
    return permission === allowed;
};

export function isAdminPortalRole(role?: string | null): role is AdminPortalRole {
    if (!role) return false;
    return ADMIN_PORTAL_ROLE_SET.has(role as AdminPortalRole);
}

export function fallbackPermissionsSnapshot(role: AdminPortalRole): AdminPermissionsSnapshot {
    return {
        role,
        roles: FALLBACK_ADMIN_ROLE_PERMISSIONS,
        tabs: {
            analytics: 'analytics:read',
            list: 'announcements:read',
            review: 'announcements:approve',
            add: 'announcements:write',
            detailed: 'announcements:write',
            bulk: 'announcements:write',
            queue: 'announcements:read',
            security: 'security:read',
            users: 'admin:read',
            audit: 'audit:read',
            community: 'admin:read',
            errors: 'admin:read',
            approvals: 'announcements:approve',
        },
        highRiskActions: FALLBACK_ADMIN_HIGH_RISK_ACTIONS,
    };
}

export function hasAdminPermission(
    snapshot: AdminPermissionsSnapshot | null,
    role: AdminPortalRole | undefined,
    permission: AdminPermission
): boolean {
    if (!role) return false;
    const allowed = snapshot?.roles?.[role] ?? FALLBACK_ADMIN_ROLE_PERMISSIONS[role] ?? [];
    return allowed.some((entry) => matchesPermission(permission, entry));
}
