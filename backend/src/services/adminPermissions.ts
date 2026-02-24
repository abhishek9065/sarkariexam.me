import type { UserRole } from '../types.js';

export type AdminPortalRole = 'admin' | 'editor' | 'contributor' | 'reviewer' | 'viewer';
export type AdminPermission =
  | 'admin:read'
  | 'admin:write'
  | 'analytics:read'
  | 'announcements:read'
  | 'announcements:write'
  | 'announcements:approve'
  | 'announcements:delete'
  | 'audit:read'
  | 'security:read';

export type AdminTab =
  | 'analytics'
  | 'list'
  | 'review'
  | 'add'
  | 'detailed'
  | 'bulk'
  | 'queue'
  | 'security'
  | 'users'
  | 'audit'
  | 'community'
  | 'errors'
  | 'approvals';

export const ADMIN_PORTAL_ROLES: AdminPortalRole[] = ['admin', 'editor', 'contributor', 'reviewer', 'viewer'];
export const ADMIN_PORTAL_ROLE_SET = new Set<AdminPortalRole>(ADMIN_PORTAL_ROLES);

export const ADMIN_ROLE_PERMISSIONS: Record<AdminPortalRole, string[]> = {
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

export const ADMIN_TAB_PERMISSIONS: Record<AdminTab, AdminPermission> = {
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
};

export const ADMIN_HIGH_RISK_ACTIONS = [
  'announcement_publish',
  'announcement_bulk_publish',
  'announcement_delete',
] as const;

export type AdminHighRiskAction = (typeof ADMIN_HIGH_RISK_ACTIONS)[number];

const matchesPermission = (permission: string, allowed: string): boolean => {
  if (allowed === '*') return true;
  if (allowed.endsWith(':*')) {
    return permission.startsWith(allowed.slice(0, -1));
  }
  return permission === allowed;
};

export const isAdminPortalRole = (role?: string): role is AdminPortalRole => {
  if (!role) return false;
  return ADMIN_PORTAL_ROLE_SET.has(role as AdminPortalRole);
};

export const hasAdminPermission = (role: UserRole | undefined, permission: AdminPermission): boolean => {
  if (!role) return false;
  if (role === 'admin') return true;
  if (!isAdminPortalRole(role)) return false;
  const allowed = ADMIN_ROLE_PERMISSIONS[role] ?? [];
  return allowed.some((entry) => matchesPermission(permission, entry));
};

export const getAdminPermissionsSnapshot = () => ({
  roles: ADMIN_ROLE_PERMISSIONS,
  tabs: ADMIN_TAB_PERMISSIONS,
  highRiskActions: ADMIN_HIGH_RISK_ACTIONS,
});
