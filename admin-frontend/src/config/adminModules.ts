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

export type ModuleGroupKey =
    | 'today'
    | 'content-desk'
    | 'review-pipeline'
    | 'publishing'
    | 'site-ops'
    | 'audience-seo'
    | 'governance'
    | 'monitoring'
    | 'system';

export type AdminModuleArchetype = 'dashboard' | 'table' | 'form' | 'board' | 'timeline' | 'roster' | 'incident' | 'settings';
export type AdminModuleLayoutMode = 'dashboard' | 'table' | 'board' | 'form' | 'timeline';

export type AdminModuleNavItem = {
    key: AdminModuleKey;
    to: string;
    label: string;
    shortLabel: string;
    icon: string;
    group: ModuleGroupKey;
    summary: string;
    priority: number;
    pageArchetype: AdminModuleArchetype;
    layoutMode: AdminModuleLayoutMode;
    defaultPrimaryAction?: {
        label: string;
        to: string;
    };
};

const createItem = (item: AdminModuleNavItem) => item;

export const adminModuleNavItems: AdminModuleNavItem[] = [
    createItem({
        key: 'dashboard',
        to: '/dashboard',
        label: 'Today',
        shortLabel: 'TD',
        icon: '◌',
        group: 'today',
        summary: 'Editorial command desk for assignments, incidents, and priority drilldowns.',
        priority: 10,
        pageArchetype: 'dashboard',
        layoutMode: 'dashboard',
        defaultPrimaryAction: { label: 'Open workbench', to: '/manage-posts' },
    }),
    createItem({
        key: 'manage-posts',
        to: '/manage-posts',
        label: 'Manage Posts',
        shortLabel: 'MP',
        icon: '≣',
        group: 'content-desk',
        summary: 'Main workbench for filters, lanes, saved views, and bulk editorial operations.',
        priority: 20,
        pageArchetype: 'table',
        layoutMode: 'table',
        defaultPrimaryAction: { label: 'New post', to: '/create-post' },
    }),
    createItem({
        key: 'create-post',
        to: '/create-post',
        label: 'Create Post',
        shortLabel: 'CP',
        icon: '+',
        group: 'content-desk',
        summary: 'Unified editor entry for full-form content creation.',
        priority: 21,
        pageArchetype: 'form',
        layoutMode: 'form',
        defaultPrimaryAction: { label: 'Quick Add', to: '/quick-add' },
    }),
    createItem({
        key: 'quick-add',
        to: '/quick-add',
        label: 'Quick Add',
        shortLabel: 'QA',
        icon: '↯',
        group: 'content-desk',
        summary: 'Fast lane for urgent, high-volume updates.',
        priority: 22,
        pageArchetype: 'form',
        layoutMode: 'form',
        defaultPrimaryAction: { label: 'Open full editor', to: '/create-post' },
    }),
    createItem({
        key: 'detailed-post',
        to: '/detailed-post',
        label: 'Detailed Post',
        shortLabel: 'DP',
        icon: '✎',
        group: 'content-desk',
        summary: 'Deep editorial workspace with revisions, autosave, and preview links.',
        priority: 23,
        pageArchetype: 'form',
        layoutMode: 'form',
    }),
    createItem({
        key: 'job',
        to: '/job',
        label: 'Jobs',
        shortLabel: 'JB',
        icon: '◫',
        group: 'publishing',
        summary: 'Recruitment publishing lane and content list.',
        priority: 30,
        pageArchetype: 'table',
        layoutMode: 'table',
        defaultPrimaryAction: { label: 'Create job', to: '/create-post' },
    }),
    createItem({
        key: 'result',
        to: '/result',
        label: 'Results',
        shortLabel: 'RS',
        icon: '◎',
        group: 'publishing',
        summary: 'Results publication queue and release controls.',
        priority: 31,
        pageArchetype: 'table',
        layoutMode: 'table',
        defaultPrimaryAction: { label: 'Create result', to: '/create-post' },
    }),
    createItem({
        key: 'admit-card',
        to: '/admit-card',
        label: 'Admit Cards',
        shortLabel: 'AC',
        icon: '▣',
        group: 'publishing',
        summary: 'Admit card release lane and date management.',
        priority: 32,
        pageArchetype: 'table',
        layoutMode: 'table',
    }),
    createItem({
        key: 'answer-key',
        to: '/answer-key',
        label: 'Answer Keys',
        shortLabel: 'AK',
        icon: '⌘',
        group: 'publishing',
        summary: 'Answer key release and objection window management.',
        priority: 33,
        pageArchetype: 'table',
        layoutMode: 'table',
    }),
    createItem({
        key: 'syllabus',
        to: '/syllabus',
        label: 'Syllabus',
        shortLabel: 'SY',
        icon: '☰',
        group: 'publishing',
        summary: 'Syllabus publishing and document upkeep.',
        priority: 34,
        pageArchetype: 'table',
        layoutMode: 'table',
    }),
    createItem({
        key: 'admission',
        to: '/admission',
        label: 'Admissions',
        shortLabel: 'AD',
        icon: '◇',
        group: 'publishing',
        summary: 'Admission and counselling content operations.',
        priority: 35,
        pageArchetype: 'table',
        layoutMode: 'table',
    }),
    createItem({
        key: 'templates',
        to: '/templates',
        label: 'Templates',
        shortLabel: 'TP',
        icon: '▤',
        group: 'publishing',
        summary: 'Shared editorial templates and content scaffolds.',
        priority: 36,
        pageArchetype: 'table',
        layoutMode: 'table',
    }),
    createItem({
        key: 'bulk',
        to: '/bulk',
        label: 'Bulk Import',
        shortLabel: 'BK',
        icon: '⇵',
        group: 'publishing',
        summary: 'Preview-first bulk import and execution workflow.',
        priority: 37,
        pageArchetype: 'form',
        layoutMode: 'form',
    }),
    createItem({
        key: 'review',
        to: '/review',
        label: 'Review',
        shortLabel: 'RV',
        icon: '□',
        group: 'review-pipeline',
        summary: 'Policy-aware review queue with ownership and SLA control.',
        priority: 40,
        pageArchetype: 'table',
        layoutMode: 'table',
    }),
    createItem({
        key: 'approvals',
        to: '/approvals',
        label: 'Approvals',
        shortLabel: 'AP',
        icon: '✓',
        group: 'review-pipeline',
        summary: 'Dual-control approval decisions and escalation notes.',
        priority: 41,
        pageArchetype: 'table',
        layoutMode: 'table',
    }),
    createItem({
        key: 'queue',
        to: '/queue',
        label: 'Queue',
        shortLabel: 'QU',
        icon: '↻',
        group: 'review-pipeline',
        summary: 'Pending and scheduled execution queue with ownership controls.',
        priority: 42,
        pageArchetype: 'table',
        layoutMode: 'table',
    }),
    createItem({
        key: 'homepage-sections',
        to: '/homepage-sections',
        label: 'Homepage Sections',
        shortLabel: 'HS',
        icon: '⌂',
        group: 'site-ops',
        summary: 'Homepage ranking, section pinning, and front-page sequencing.',
        priority: 50,
        pageArchetype: 'board',
        layoutMode: 'board',
    }),
    createItem({
        key: 'link-manager',
        to: '/link-manager',
        label: 'Link Manager',
        shortLabel: 'LK',
        icon: '∞',
        group: 'site-ops',
        summary: 'Stable URLs, link health, and replacement workflow.',
        priority: 51,
        pageArchetype: 'table',
        layoutMode: 'table',
    }),
    createItem({
        key: 'media-pdfs',
        to: '/media-pdfs',
        label: 'Media and PDFs',
        shortLabel: 'MD',
        icon: '▥',
        group: 'site-ops',
        summary: 'Document inventory and media reference management.',
        priority: 52,
        pageArchetype: 'table',
        layoutMode: 'table',
    }),
    createItem({
        key: 'analytics',
        to: '/analytics',
        label: 'Analytics',
        shortLabel: 'AN',
        icon: '∆',
        group: 'audience-seo',
        summary: 'Audience trends, CTR, and anomaly review.',
        priority: 60,
        pageArchetype: 'dashboard',
        layoutMode: 'dashboard',
    }),
    createItem({
        key: 'reports',
        to: '/reports',
        label: 'Reports',
        shortLabel: 'RP',
        icon: '≋',
        group: 'audience-seo',
        summary: 'Traffic, deadlines, broken links, and content reporting.',
        priority: 61,
        pageArchetype: 'dashboard',
        layoutMode: 'dashboard',
    }),
    createItem({
        key: 'seo-tools',
        to: '/seo-tools',
        label: 'SEO Tools',
        shortLabel: 'SEO',
        icon: '⌕',
        group: 'audience-seo',
        summary: 'Meta, schema, canonical, and discoverability controls.',
        priority: 62,
        pageArchetype: 'form',
        layoutMode: 'form',
    }),
    createItem({
        key: 'users-roles',
        to: '/users-roles',
        label: 'Users and Roles',
        shortLabel: 'UR',
        icon: '◍',
        group: 'governance',
        summary: 'Access governance, roles, and admin roster management.',
        priority: 70,
        pageArchetype: 'roster',
        layoutMode: 'table',
    }),
    createItem({
        key: 'audit',
        to: '/audit',
        label: 'Audit',
        shortLabel: 'AU',
        icon: '⋮',
        group: 'governance',
        summary: 'Administrative activity timeline and change history.',
        priority: 71,
        pageArchetype: 'timeline',
        layoutMode: 'timeline',
    }),
    createItem({
        key: 'community-moderation',
        to: '/community',
        label: 'Community Moderation',
        shortLabel: 'CM',
        icon: '◐',
        group: 'governance',
        summary: 'Moderation queue for community-reported issues.',
        priority: 72,
        pageArchetype: 'table',
        layoutMode: 'table',
    }),
    createItem({
        key: 'alerts',
        to: '/alerts',
        label: 'Alerts',
        shortLabel: 'AL',
        icon: '!',
        group: 'monitoring',
        summary: 'Operational alert feed with severity triage.',
        priority: 80,
        pageArchetype: 'incident',
        layoutMode: 'table',
    }),
    createItem({
        key: 'security',
        to: '/security',
        label: 'Security',
        shortLabel: 'SC',
        icon: '◈',
        group: 'monitoring',
        summary: 'Security events, blocked activity, and risk sessions.',
        priority: 81,
        pageArchetype: 'incident',
        layoutMode: 'table',
    }),
    createItem({
        key: 'sessions',
        to: '/sessions',
        label: 'Sessions',
        shortLabel: 'SS',
        icon: '◗',
        group: 'monitoring',
        summary: 'Session inventory, termination controls, and drift checks.',
        priority: 82,
        pageArchetype: 'table',
        layoutMode: 'table',
    }),
    createItem({
        key: 'error-reports',
        to: '/errors',
        label: 'Error Reports',
        shortLabel: 'ER',
        icon: '⚑',
        group: 'monitoring',
        summary: 'Application error triage and follow-up.',
        priority: 83,
        pageArchetype: 'incident',
        layoutMode: 'table',
    }),
    createItem({
        key: 'settings',
        to: '/settings',
        label: 'Settings',
        shortLabel: 'ST',
        icon: '⚙',
        group: 'system',
        summary: 'Boards, tags, states, and core control-plane configuration.',
        priority: 90,
        pageArchetype: 'settings',
        layoutMode: 'form',
    }),
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
    reports: 'analytics:read',
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
const enabledModules = hasWildcard || configuredTokens.length === 0
    ? allModuleKeys
    : new Set<AdminModuleKey>(
        configuredTokens.filter((token): token is AdminModuleKey => allModuleKeys.has(token as AdminModuleKey))
    );

export function isAdminModuleEnabled(key: AdminModuleKey): boolean {
    return enabledModules.has(key);
}

export function getModuleByPath(pathname: string): AdminModuleNavItem | undefined {
    if (pathname === '/announcements' || pathname.startsWith('/announcements/')) {
        return adminModuleNavItems.find((item) => item.key === 'manage-posts');
    }
    return adminModuleNavItems.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
}

export const MODULE_GROUP_ORDER: ModuleGroupKey[] = [
    'today',
    'content-desk',
    'review-pipeline',
    'publishing',
    'site-ops',
    'audience-seo',
    'governance',
    'monitoring',
    'system',
];

export const groupedModuleLabels: Record<ModuleGroupKey, string> = {
    today: 'Today',
    'content-desk': 'Content Desk',
    'review-pipeline': 'Review Pipeline',
    publishing: 'Publishing',
    'site-ops': 'Site Ops',
    'audience-seo': 'Audience and SEO',
    governance: 'Governance',
    monitoring: 'Monitoring',
    system: 'System',
};

export const groupedModuleIcons: Record<ModuleGroupKey, string> = {
    today: '◌',
    'content-desk': '≣',
    'review-pipeline': '✓',
    publishing: '◇',
    'site-ops': '⌂',
    'audience-seo': '∆',
    governance: '◍',
    monitoring: '!',
    system: '⚙',
};
