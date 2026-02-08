export type AdminPortalRole = 'admin' | 'editor' | 'reviewer' | 'viewer';
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

export type AdminPermissionRegistry = {
    roles: Record<AdminPortalRole, string[]>;
    tabs: Record<AdminTab, AdminPermission>;
};

const ADMIN_PORTAL_ROLES = new Set<AdminPortalRole>(['admin', 'editor', 'reviewer', 'viewer']);

export const ADMIN_ROLE_PERMISSIONS: Record<AdminPortalRole, string[]> = {
    admin: ['*'],
    editor: ['admin:read', 'admin:write', 'analytics:read', 'announcements:read', 'announcements:write'],
    reviewer: ['admin:read', 'analytics:read', 'announcements:read', 'announcements:approve', 'audit:read'],
    viewer: ['admin:read', 'analytics:read', 'announcements:read'],
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
    users: 'analytics:read',
    audit: 'audit:read',
    community: 'admin:read',
    errors: 'admin:read',
    approvals: 'announcements:approve',
};

const ADMIN_TABS = Object.keys(ADMIN_TAB_PERMISSIONS) as AdminTab[];

export const DEFAULT_PERMISSION_REGISTRY: AdminPermissionRegistry = {
    roles: ADMIN_ROLE_PERMISSIONS,
    tabs: ADMIN_TAB_PERMISSIONS,
};

export const ADMIN_TAB_META: Record<AdminTab, { label: string; description: string }> = {
    analytics: {
        label: 'Analytics Command Center',
        description: 'Track traffic, conversions, and listing performance in real time.',
    },
    list: {
        label: 'All Announcements',
        description: 'Filter, audit, and edit every listing across categories.',
    },
    review: {
        label: 'Review Queue',
        description: 'Triage pending posts, QA alerts, and approvals in one pipeline.',
    },
    add: {
        label: 'Quick Add',
        description: 'Publish fast updates with lightweight form controls.',
    },
    detailed: {
        label: 'Detailed Post',
        description: 'Craft full listings with structured details, eligibility, and links.',
    },
    bulk: {
        label: 'Bulk Import',
        description: 'Apply bulk updates, scheduling, and status changes safely.',
    },
    queue: {
        label: 'Schedule Queue',
        description: 'Monitor scheduled releases and publish time-sensitive notices.',
    },
    users: {
        label: 'User Insights',
        description: 'Understand subscriber growth, activity, and cohorts.',
    },
    community: {
        label: 'Community Moderation',
        description: 'Resolve flags, forums, QA, and study group activity.',
    },
    errors: {
        label: 'Error Reports',
        description: 'Review client error logs and respond quickly to regressions.',
    },
    audit: {
        label: 'Audit Log',
        description: 'Trace admin actions for accountability and compliance.',
    },
    security: {
        label: 'Security Center',
        description: 'Manage access policies, sessions, and risk alerts.',
    },
    approvals: {
        label: 'Dual Approval Queue',
        description: 'Approve or reject high-risk publish and delete operations.',
    },
};

export const isAdminPortalRole = (role?: string): role is AdminPortalRole => {
    if (!role) return false;
    return ADMIN_PORTAL_ROLES.has(role as AdminPortalRole);
};

export const hasAdminPermission = (
    role: AdminPortalRole | undefined,
    permission: AdminPermission,
    rolePermissions: Record<AdminPortalRole, string[]> = ADMIN_ROLE_PERMISSIONS
): boolean => {
    if (!role) return false;
    const allowed = rolePermissions[role] ?? [];
    return allowed.includes('*') || allowed.includes(permission);
};

export const getFirstAccessibleTab = (
    role?: AdminPortalRole,
    tabPermissions: Record<AdminTab, AdminPermission> = ADMIN_TAB_PERMISSIONS,
    rolePermissions: Record<AdminPortalRole, string[]> = ADMIN_ROLE_PERMISSIONS
): AdminTab => {
    const orderedTabs: AdminTab[] = ['analytics', 'list', 'queue', 'users', 'community', 'errors', 'audit', 'security', 'approvals', 'review', 'add', 'detailed', 'bulk'];
    const match = orderedTabs.find((tab) => hasAdminPermission(role, tabPermissions[tab], rolePermissions));
    return match ?? 'analytics';
};

export const parsePermissionRegistry = (raw: any): AdminPermissionRegistry => {
    const nextRoles: Record<AdminPortalRole, string[]> = {
        ...DEFAULT_PERMISSION_REGISTRY.roles,
    };
    const nextTabs: Record<AdminTab, AdminPermission> = {
        ...DEFAULT_PERMISSION_REGISTRY.tabs,
    };

    if (raw?.roles && typeof raw.roles === 'object') {
        (Object.keys(nextRoles) as AdminPortalRole[]).forEach((role) => {
            const value = raw.roles[role];
            if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
                nextRoles[role] = value;
            }
        });
    }

    if (raw?.tabs && typeof raw.tabs === 'object') {
        ADMIN_TABS.forEach((tab) => {
            const value = raw.tabs[tab];
            if (typeof value === 'string') {
                nextTabs[tab] = value as AdminPermission;
            }
        });
    }

    return { roles: nextRoles, tabs: nextTabs };
};
