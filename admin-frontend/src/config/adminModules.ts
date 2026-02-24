import type { AdminPermission } from '../types';

export type AdminModuleKey =
    | 'dashboard'
    | 'analytics'
    | 'manage-posts'
    | 'create-post'
    | 'quick-add'
    | 'detailed-post'
    | 'job'
    | 'result'
    | 'admit-card'
    | 'answer-key'
    | 'syllabus'
    | 'admission'
    | 'review'
    | 'approvals'
    | 'queue'
    | 'bulk'
    | 'homepage-sections'
    | 'link-manager'
    | 'media-pdfs'
    | 'templates'
    | 'seo-tools'
    | 'users-roles'
    | 'alerts'
    | 'security'
    | 'sessions'
    | 'audit'
    | 'reports'
    | 'community-moderation'
    | 'error-reports'
    | 'settings';

/**
 * Consolidated sidebar groups (9 items)
 * ─────────────────────────────────────
 * Dashboard · Posts · Review & Approvals
 * Homepage · Links · Media
 * Users & Roles · Logs · Settings
 */
export type ModuleGroupKey =
    | 'dashboard'
    | 'posts'
    | 'review'
    | 'homepage'
    | 'links'
    | 'media'
    | 'users'
    | 'logs'
    | 'settings';

export type AdminModuleNavItem = {
    key: AdminModuleKey;
    to: string;
    label: string;
    shortLabel: string;
    icon: string;
    group: ModuleGroupKey;
    summary: string;
};

export const adminModuleNavItems: AdminModuleNavItem[] = [
    // ─── Dashboard ───
    {
        key: 'dashboard',
        to: '/dashboard',
        label: 'Dashboard',
        shortLabel: 'DB',
        icon: '\u2302',
        group: 'dashboard',
        summary: 'Daily operations KPIs, deadlines and quick actions.',
    },

    // ─── Posts ───
    {
        key: 'manage-posts',
        to: '/manage-posts',
        label: 'All Posts',
        shortLabel: 'AP',
        icon: '\u2630',
        group: 'posts',
        summary: 'High-volume listing with filters, saved views, and bulk actions.',
    },
    {
        key: 'create-post',
        to: '/create-post',
        label: 'New Post',
        shortLabel: 'NP',
        icon: '\u271A',
        group: 'posts',
        summary: 'Unified create wizard for all Sarkari content types.',
    },
    {
        key: 'job',
        to: '/job',
        label: 'Jobs',
        shortLabel: 'JB',
        icon: '\uD83D\uDCBC',
        group: 'posts',
        summary: 'Recruitment posts, vacancy details and timeline controls.',
    },
    {
        key: 'result',
        to: '/result',
        label: 'Results',
        shortLabel: 'RS',
        icon: '\uD83C\uDFC6',
        group: 'posts',
        summary: 'Result publication, links and cutoff references.',
    },
    {
        key: 'admit-card',
        to: '/admit-card',
        label: 'Admit Cards',
        shortLabel: 'AC',
        icon: '\uD83C\uDFAB',
        group: 'posts',
        summary: 'Admit card dates, downloads and region-wise links.',
    },
    {
        key: 'answer-key',
        to: '/answer-key',
        label: 'Answer Keys',
        shortLabel: 'AK',
        icon: '\uD83D\uDD11',
        group: 'posts',
        summary: 'Answer key releases and objection window management.',
    },
    {
        key: 'syllabus',
        to: '/syllabus',
        label: 'Syllabus',
        shortLabel: 'SY',
        icon: '\uD83D\uDCDA',
        group: 'posts',
        summary: 'Syllabus docs and marks-breakdown publishing.',
    },
    {
        key: 'admission',
        to: '/admission',
        label: 'Admissions',
        shortLabel: 'AD',
        icon: '\uD83C\uDF93',
        group: 'posts',
        summary: 'Admission and counseling workflow updates.',
    },
    {
        key: 'quick-add',
        to: '/quick-add',
        label: 'Quick Add',
        shortLabel: 'QA',
        icon: '\u26A1',
        group: 'posts',
        summary: 'Fast lightweight posting flow for urgent updates.',
    },
    {
        key: 'detailed-post',
        to: '/detailed-post',
        label: 'Detailed Post',
        shortLabel: 'DP',
        icon: '\uD83D\uDCDD',
        group: 'posts',
        summary: 'Deep editor with autosave and revision timeline support.',
    },
    {
        key: 'templates',
        to: '/templates',
        label: 'Templates',
        shortLabel: 'TP',
        icon: '\uD83D\uDCC4',
        group: 'posts',
        summary: 'Shared posting templates and section block presets.',
    },
    {
        key: 'bulk',
        to: '/bulk',
        label: 'Bulk Import',
        shortLabel: 'BK',
        icon: '\uD83D\uDCE6',
        group: 'posts',
        summary: 'Preview and execute batch operations safely.',
    },

    // ─── Review & Approvals ───
    {
        key: 'review',
        to: '/review',
        label: 'Review Queue',
        shortLabel: 'RQ',
        icon: '\uD83D\uDD0D',
        group: 'review',
        summary: 'Policy-aware review queue with preview-first workflow.',
    },
    {
        key: 'approvals',
        to: '/approvals',
        label: 'Approvals',
        shortLabel: 'AR',
        icon: '\u2705',
        group: 'review',
        summary: 'Approval decisions and change requests with notes.',
    },
    {
        key: 'queue',
        to: '/queue',
        label: 'Scheduled Queue',
        shortLabel: 'QU',
        icon: '\uD83D\uDD52',
        group: 'review',
        summary: 'Scheduled/pending ownership and execution queue states.',
    },

    // ─── Homepage ───
    {
        key: 'homepage-sections',
        to: '/homepage-sections',
        label: 'Homepage Sections',
        shortLabel: 'HS',
        icon: '\uD83C\uDFE0',
        group: 'homepage',
        summary: 'Homepage pinning, ranking and section sort controls.',
    },

    // ─── Links ───
    {
        key: 'link-manager',
        to: '/link-manager',
        label: 'Link Manager',
        shortLabel: 'LK',
        icon: '\uD83D\uDD17',
        group: 'links',
        summary: 'Centralized link records, health checks and replace workflows.',
    },

    // ─── Media / PDFs ───
    {
        key: 'media-pdfs',
        to: '/media-pdfs',
        label: 'Media / PDFs',
        shortLabel: 'MD',
        icon: '\uD83D\uDCC1',
        group: 'media',
        summary: 'Manage uploaded PDF/media metadata and stable URLs.',
    },

    // ─── Users & Roles ───
    {
        key: 'users-roles',
        to: '/users-roles',
        label: 'Users & Roles',
        shortLabel: 'UR',
        icon: '\uD83D\uDC65',
        group: 'users',
        summary: 'Role matrix and admin account governance controls.',
    },

    // ─── Logs ───
    {
        key: 'security',
        to: '/security',
        label: 'Security Log',
        shortLabel: 'SC',
        icon: '\uD83D\uDEE1\uFE0F',
        group: 'logs',
        summary: 'Security event log and filterable incident visibility.',
    },
    {
        key: 'audit',
        to: '/audit',
        label: 'Audit Log',
        shortLabel: 'AU',
        icon: '\uD83D\uDCCB',
        group: 'logs',
        summary: 'Audit timeline for publish, edit, and role operations.',
    },
    {
        key: 'sessions',
        to: '/sessions',
        label: 'Sessions',
        shortLabel: 'SS',
        icon: '\uD83D\uDD12',
        group: 'logs',
        summary: 'Admin session controls and terminations.',
    },
    {
        key: 'alerts',
        to: '/alerts',
        label: 'Alerts',
        shortLabel: 'AL',
        icon: '\uD83D\uDD14',
        group: 'logs',
        summary: 'Operational alerts for deadlines, schedules and link failures.',
    },
    {
        key: 'error-reports',
        to: '/errors',
        label: 'Error Reports',
        shortLabel: 'ER',
        icon: '\u26A0',
        group: 'logs',
        summary: 'Application error triage and resolution workflows.',
    },
    {
        key: 'analytics',
        to: '/analytics',
        label: 'Analytics',
        shortLabel: 'AN',
        icon: '\uD83D\uDCC8',
        group: 'logs',
        summary: 'Traffic and trend snapshots for operational decision support.',
    },
    {
        key: 'reports',
        to: '/reports',
        label: 'Reports',
        shortLabel: 'RP',
        icon: '\uD83D\uDCCA',
        group: 'logs',
        summary: 'Broken links, expiries, and traffic snapshots.',
    },
    {
        key: 'community-moderation',
        to: '/community',
        label: 'Community',
        shortLabel: 'CM',
        icon: '\uD83D\uDCAC',
        group: 'logs',
        summary: 'Moderation queue for community reports and flags.',
    },

    // ─── Settings ───
    {
        key: 'settings',
        to: '/settings',
        label: 'Configuration',
        shortLabel: 'ST',
        icon: '\u2699',
        group: 'settings',
        summary: 'States, boards, tags and core admin configuration.',
    },
    {
        key: 'seo-tools',
        to: '/seo-tools',
        label: 'SEO Tools',
        shortLabel: 'SEO',
        icon: '\uD83D\uDD0E',
        group: 'settings',
        summary: 'Meta/canonical/schema controls per content record.',
    },
];

const MODULE_PERMISSION_MAP: Partial<Record<AdminModuleKey, AdminPermission>> = {
    dashboard: 'admin:read',
    analytics: 'analytics:read',
    'manage-posts': 'announcements:read',
    'create-post': 'announcements:write',
    'quick-add': 'announcements:write',
    'detailed-post': 'announcements:write',
    job: 'announcements:write',
    result: 'announcements:write',
    'admit-card': 'announcements:write',
    'answer-key': 'announcements:write',
    syllabus: 'announcements:write',
    admission: 'announcements:write',
    review: 'announcements:approve',
    approvals: 'announcements:approve',
    queue: 'announcements:read',
    bulk: 'announcements:write',
    'homepage-sections': 'announcements:write',
    'link-manager': 'announcements:write',
    'media-pdfs': 'announcements:write',
    templates: 'announcements:write',
    'seo-tools': 'announcements:write',
    'users-roles': 'admin:read',
    alerts: 'admin:read',
    security: 'security:read',
    sessions: 'security:read',
    audit: 'audit:read',
    reports: 'announcements:read',
    'community-moderation': 'admin:read',
    'error-reports': 'admin:read',
    settings: 'admin:write',
};

export function getModuleRequiredPermission(key: AdminModuleKey): AdminPermission {
    return MODULE_PERMISSION_MAP[key] ?? 'admin:read';
}

const allModuleKeys = new Set<AdminModuleKey>(adminModuleNavItems.map((item) => item.key));

const configuredModulesRaw = (import.meta.env.VITE_ADMIN_VNEXT_MODULES as string | undefined)?.trim();
const configuredTokens = configuredModulesRaw
    ? configuredModulesRaw
        .split(',')
        .map((token) => token.trim().toLowerCase())
        .filter(Boolean)
    : [];

const hasWildcard = configuredTokens.includes('*') || configuredTokens.includes('all');

const configuredModuleSet = hasWildcard || configuredTokens.length === 0
    ? null
    : new Set<AdminModuleKey>(
        configuredTokens.filter((token): token is AdminModuleKey => allModuleKeys.has(token as AdminModuleKey))
    );

export const isModuleGateEnabled = configuredModuleSet !== null;

export function isAdminModuleEnabled(key: AdminModuleKey): boolean {
    if (!configuredModuleSet) {
        return true;
    }
    return configuredModuleSet.has(key);
}

export function getModuleByPath(pathname: string): AdminModuleNavItem | undefined {
    if (pathname === '/announcements' || pathname.startsWith('/announcements/')) {
        return adminModuleNavItems.find((item) => item.key === 'manage-posts');
    }
    return adminModuleNavItems.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
}

/** Sidebar group metadata — ordered as they appear in the sidebar */
export const MODULE_GROUP_ORDER: ModuleGroupKey[] = [
    'dashboard',
    'posts',
    'review',
    'homepage',
    'links',
    'media',
    'users',
    'logs',
    'settings',
];

export const groupedModuleLabels: Record<ModuleGroupKey, string> = {
    dashboard: 'Dashboard',
    posts: 'Posts',
    review: 'Review & Approvals',
    homepage: 'Homepage',
    links: 'Links',
    media: 'Media / PDFs',
    users: 'Users & Roles',
    logs: 'Logs',
    settings: 'Settings',
};

export const groupedModuleIcons: Record<ModuleGroupKey, string> = {
    dashboard: '\u2302',
    posts: '\uD83D\uDCDD',
    review: '\uD83D\uDD0D',
    homepage: '\uD83C\uDFE0',
    links: '\uD83D\uDD17',
    media: '\uD83D\uDCC1',
    users: '\uD83D\uDC65',
    logs: '\uD83D\uDCCB',
    settings: '\u2699',
};
