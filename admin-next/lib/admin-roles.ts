import type { AdminRole } from './types';

export const ADMINISTRATOR_ROLES = ['superadmin', 'admin'] as const satisfies readonly AdminRole[];
export const STAFF_ROLES = ['superadmin', 'admin', 'editor', 'reviewer'] as const satisfies readonly AdminRole[];
export const EDITORIAL_ROLES = STAFF_ROLES;
export const CONTENT_WRITE_ROLES = ['superadmin', 'admin', 'editor'] as const satisfies readonly AdminRole[];
export const REVIEW_WORKFLOW_ROLES = ['superadmin', 'admin', 'reviewer'] as const satisfies readonly AdminRole[];
export const MODERATION_ROLES = ['superadmin', 'admin', 'reviewer'] as const satisfies readonly AdminRole[];

export function isAdminConsoleRole(role: AdminRole) {
  return (STAFF_ROLES as readonly AdminRole[]).includes(role);
}

export function roleIsAllowed(roles: readonly AdminRole[], role?: AdminRole | null) {
  return Boolean(role && roles.includes(role));
}
