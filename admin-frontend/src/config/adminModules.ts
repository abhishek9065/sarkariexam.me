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
    | 'dashboard'
    | 'posts'
    | 'review'
    | 'homepage'
    | 'assets'
    | 'team'
    | 'logs'
    | 'settings';

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
        group: 'dashboard',
        summary: 'Daily operations KPIs, deadlines and quick actions.',
    },
    {
        key: 'analytics',
        to: '/analytics',
        label: 'Analytics',
        shortLabel: 'AN',
        group: 'dashboard',
        summary: 'Traffic and trend snapshots for operational decision support.',
    },
    {
        key: 'manage-posts',
        to: '/manage-posts',
        label: 'All Posts',
        shortLabel: 'AP',
        group: 'posts',
        summary: 'High-volume listing with filters, saved views, and bulk actions.',
    },
    {
        key: 'create-post',
        to: '/create-post',
        label: 'New Post',
        shortLabel: 'NP',
        group: 'posts',
        summary: 'Unified create wizard for all Sarkari content types.',
    },
    {
        key: 'quick-add',
        to: '/quick-add',
        label: 'Quick Add',
        shortLabel: 'QA',
        group: 'posts',
        summary: 'Fast lightweight posting flow for urgent updates.',
    },
    {
        key: 'detailed-post',
        to: '/detailed-post',
        label: 'Detailed Post',
        shortLabel: 'DP',
        group: 'posts',
        summary: 'Deep editor with autosave and revision timeline support.',
    },
    {
        key: 'job',
        to: '/job',
        label: 'Job',
        shortLabel: 'JB',
        group: 'posts',
        summary: 'Recruitment posts, vacancy details and timeline controls.',
    },
    {
        key: 'result',
        to: '/result',
        label: 'Result',
        shortLabel: 'RS',
        group: 'posts',
        summary: 'Result publication, links and cutoff references.',
    },
    {
        key: 'admit-card',
        to: '/admit-card',
        label: 'Admit Card',
        shortLabel: 'AC',
        group: 'posts',
        summary: 'Admit card dates, downloads and region-wise links.',
    },
    {
        key: 'answer-key',
        to: '/answer-key',
        label: 'Answer Key',
        shortLabel: 'AK',
        group: 'posts',
        summary: 'Answer key releases and objection window management.',
    },
    {
        key: 'syllabus',
        to: '/syllabus',
        label: 'Syllabus',
        shortLabel: 'SY',
        group: 'posts',
        summary: 'Syllabus docs and marks-breakdown publishing.',
    },
    {
        key: 'admission',
        to: '/admission',
        label: 'Admission',
        shortLabel: 'AD',
        group: 'posts',
        summary: 'Admission and counseling workflow updates.',
    },
    {
        key: 'review',
        to: '/review',
        label: 'Review Queue',
        shortLabel: 'RQ',
        group: 'review',
        summary: 'Policy-aware review queue with preview-first workflow.',
    },
    {
        key: 'approvals',
        to: '/approvals',
        label: 'Approvals',
        shortLabel: 'AR',
        group: 'review',
        summary: 'Approval decisions and change requests with notes.',
    },
    {
        key: 'queue',
        to: '/queue',
        label: 'Queue',
        shortLabel: 'QU',
        group: 'review',
        summary: 'Scheduled/pending ownership and execution queue states.',
    },
    {
        key: 'bulk',
        to: '/bulk',
        label: 'Bulk Import',
        shortLabel: 'BK',
        group: 'review',
        summary: 'Preview and execute batch operations safely.',
    },
    {
        key: 'homepage-sections',
        to: '/homepage-sections',
        label: 'Sections',
        shortLabel: 'HS',
        group: 'homepage',
        summary: 'Homepage pinning, ranking and section sort controls.',
    },
    {
        key: 'link-manager',
        to: '/link-manager',
        label: 'Links',
        shortLabel: 'LK',
        group: 'assets',
        summary: 'Centralized link records, health checks and replace workflows.',
    },
    {
        key: 'media-pdfs',
        to: '/media-pdfs',
        label: 'Media / PDFs',
        shortLabel: 'MD',
        group: 'assets',
        summary: 'Manage uploaded PDF/media metadata and stable URLs.',
    },
    {
        key: 'templates',
        to: '/templates',
        label: 'Templates',
        shortLabel: 'TP',
        group: 'assets',
        summary: 'Shared posting templates and section block presets.',
    },
    {
        key: 'seo-tools',
        to: '/seo-tools',
        label: 'SEO Tools',
        shortLabel: 'SEO',
        group: 'assets',
        summary: 'Meta/canonical/schema controls per content record.',
    },
    {
        key: 'users-roles',
        to: '/users-roles',
        label: 'Users & Roles',
        shortLabel: 'UR',
        group: 'team',
        summary: 'Role matrix and admin account governance controls.',
    },
    {
        key: 'alerts',
        to: '/alerts',
        label: 'Alerts',
        shortLabel: 'AL',
        group: 'logs',
        summary: 'Operational alerts for deadlines, schedules and link failures.',
    },
    {
        key: 'security',
        to: '/security',
        label: 'Security',
        shortLabel: 'SC',
        group: 'logs',
        summary: 'Security event log and filterable incident visibility.',
    },
    {
        key: 'sessions',
        to: '/sessions',
        label: 'Sessions',
        shortLabel: 'SS',
        group: 'logs',
        summary: 'Admin session controls and terminations.',
    },
    {
        key: 'audit',
        to: '/audit',
        label: 'Audit',
        shortLabel: 'AU',
        group: 'logs',
        summary: 'Audit timeline for publish, edit, and role operations.',
    },
    {
        key: 'reports',
        to: '/reports',
        label: 'Reports',
        shortLabel: 'RP',
        group: 'logs',
        summary: 'Broken links, expiries, and traffic snapshots.',
    },
    {
        key: 'community-moderation',
        to: '/community',
        label: 'Community',
        shortLabel: 'CM',
        group: 'logs',
        summary: 'Moderation queue for community reports and flags.',
    },
    {
        key: 'error-reports',
        to: '/errors',
        label: 'Error Reports',
        shortLabel: 'ER',
        group: 'logs',
        summary: 'Application error triage and resolution workflows.',
    },
    {
        key: 'settings',
        to: '/settings',
        label: 'Settings',
        shortLabel: 'ST',
        group: 'settings',
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
    dashboard: 'Dashboard',
    posts: 'Posts',
    review: 'Review',
    homepage: 'Homepage',
    assets: 'Assets',
    team: 'Team',
    logs: 'Logs',
    settings: 'Settings',
};
