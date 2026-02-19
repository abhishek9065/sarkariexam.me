export type AdminModuleKey =
    | 'dashboard'
    | 'create-post'
    | 'job'
    | 'result'
    | 'admit-card'
    | 'answer-key'
    | 'syllabus'
    | 'admission'
    | 'manage-posts'
    | 'homepage-sections'
    | 'link-manager'
    | 'templates'
    | 'alerts'
    | 'media-pdfs'
    | 'seo-tools'
    | 'users-roles'
    | 'reports'
    | 'settings';

export type ModuleGroupKey = 'overview' | 'content' | 'operations';

export type AdminModuleNavItem = {
    key: AdminModuleKey;
    to: string;
    label: string;
    shortLabel: string;
    group: ModuleGroupKey;
    summary: string;
};

export const adminModuleNavItems: AdminModuleNavItem[] = [
    {
        key: 'dashboard',
        to: '/dashboard',
        label: 'Dashboard',
        shortLabel: 'DB',
        group: 'overview',
        summary: 'Daily operations KPIs, deadlines and quick actions.',
    },
    {
        key: 'create-post',
        to: '/create-post',
        label: 'Create Post',
        shortLabel: 'CP',
        group: 'overview',
        summary: 'Unified create wizard with type blocks and workflow status.',
    },
    {
        key: 'job',
        to: '/job',
        label: 'Job',
        shortLabel: 'JB',
        group: 'content',
        summary: 'Recruitment posts, vacancy details and timeline controls.',
    },
    {
        key: 'result',
        to: '/result',
        label: 'Result',
        shortLabel: 'RS',
        group: 'content',
        summary: 'Result publishing, links and cutoff references.',
    },
    {
        key: 'admit-card',
        to: '/admit-card',
        label: 'Admit Card',
        shortLabel: 'AC',
        group: 'content',
        summary: 'Admit card dates, downloads and region-wise links.',
    },
    {
        key: 'answer-key',
        to: '/answer-key',
        label: 'Answer Key',
        shortLabel: 'AK',
        group: 'content',
        summary: 'Answer key release and objection window management.',
    },
    {
        key: 'syllabus',
        to: '/syllabus',
        label: 'Syllabus',
        shortLabel: 'SY',
        group: 'content',
        summary: 'Syllabus docs and marks-breakdown publishing.',
    },
    {
        key: 'admission',
        to: '/admission',
        label: 'Admission',
        shortLabel: 'AD',
        group: 'content',
        summary: 'Admission workflows for course and counselling updates.',
    },
    {
        key: 'manage-posts',
        to: '/manage-posts',
        label: 'Manage Posts / Announcements',
        shortLabel: 'MP',
        group: 'operations',
        summary: 'Cross-type post listing, filters, status and actions.',
    },
    {
        key: 'homepage-sections',
        to: '/homepage-sections',
        label: 'Homepage Sections',
        shortLabel: 'HS',
        group: 'operations',
        summary: 'Pinning, ranking and section sort rule controls.',
    },
    {
        key: 'link-manager',
        to: '/link-manager',
        label: 'Link Manager',
        shortLabel: 'LM',
        group: 'operations',
        summary: 'Centralized link records, checks and replace workflows.',
    },
    {
        key: 'templates',
        to: '/templates',
        label: 'Templates',
        shortLabel: 'TP',
        group: 'operations',
        summary: 'Shared posting templates and section block presets.',
    },
    {
        key: 'alerts',
        to: '/alerts',
        label: 'Alerts',
        shortLabel: 'AL',
        group: 'operations',
        summary: 'Operational alerts feed for deadlines, schedules, and links.',
    },
    {
        key: 'media-pdfs',
        to: '/media-pdfs',
        label: 'Media / PDFs',
        shortLabel: 'MD',
        group: 'operations',
        summary: 'Manage uploaded PDF/media metadata and stable URLs.',
    },
    {
        key: 'seo-tools',
        to: '/seo-tools',
        label: 'SEO Tools',
        shortLabel: 'SEO',
        group: 'operations',
        summary: 'Meta/canonical/schema controls per content record.',
    },
    {
        key: 'users-roles',
        to: '/users-roles',
        label: 'Users & Roles',
        shortLabel: 'UR',
        group: 'operations',
        summary: 'Role matrix and admin account governance controls.',
    },
    {
        key: 'reports',
        to: '/reports',
        label: 'Reports',
        shortLabel: 'RP',
        group: 'operations',
        summary: 'Broken links, expiries, traffic and deadline snapshots.',
    },
    {
        key: 'settings',
        to: '/settings',
        label: 'Settings',
        shortLabel: 'ST',
        group: 'operations',
        summary: 'States, boards, tags and core admin configuration.',
    },
];

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
    return adminModuleNavItems.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
}

export const groupedModuleLabels: Record<ModuleGroupKey, string> = {
    overview: 'Overview',
    content: 'Content Modules',
    operations: 'Operations',
};
