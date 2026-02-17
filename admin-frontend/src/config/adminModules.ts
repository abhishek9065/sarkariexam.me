export type AdminModuleKey =
    | 'dashboard'
    | 'analytics'
    | 'announcements'
    | 'review'
    | 'quick-add'
    | 'detailed-post'
    | 'bulk-import'
    | 'queue'
    | 'security'
    | 'sessions'
    | 'audit'
    | 'community-moderation'
    | 'error-reports'
    | 'approvals';

export type ModuleGroupKey = 'core' | 'publishing' | 'risk';

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
        group: 'core',
        summary: 'Operations metrics and rollout insights.',
    },
    {
        key: 'announcements',
        to: '/announcements',
        label: 'Announcements',
        shortLabel: 'AN',
        group: 'core',
        summary: 'Primary listing moderation and controls.',
    },
    {
        key: 'review',
        to: '/review',
        label: 'Review',
        shortLabel: 'RV',
        group: 'core',
        summary: 'Preview-first approvals and scheduling decisions.',
    },
    {
        key: 'approvals',
        to: '/approvals',
        label: 'Approvals',
        shortLabel: 'AP',
        group: 'core',
        summary: 'Dual-control queue and decision actions.',
    },
    {
        key: 'quick-add',
        to: '/create',
        label: 'Quick Add',
        shortLabel: 'QA',
        group: 'publishing',
        summary: 'Rapid create flow for new announcements.',
    },
    {
        key: 'detailed-post',
        to: '/detailed',
        label: 'Detailed Post',
        shortLabel: 'DP',
        group: 'publishing',
        summary: 'Deep edit controls for existing records.',
    },
    {
        key: 'bulk-import',
        to: '/bulk',
        label: 'Bulk Import',
        shortLabel: 'BK',
        group: 'publishing',
        summary: 'Bulk preview and controlled execution.',
    },
    {
        key: 'queue',
        to: '/queue',
        label: 'Queue',
        shortLabel: 'QU',
        group: 'publishing',
        summary: 'Pending throughput and schedule visibility.',
    },
    {
        key: 'security',
        to: '/security',
        label: 'Security',
        shortLabel: 'SE',
        group: 'risk',
        summary: 'Security events and endpoint risk signals.',
    },
    {
        key: 'sessions',
        to: '/sessions',
        label: 'Sessions',
        shortLabel: 'SS',
        group: 'risk',
        summary: 'Session inventory and termination actions.',
    },
    {
        key: 'audit',
        to: '/audit',
        label: 'Audit',
        shortLabel: 'AU',
        group: 'risk',
        summary: 'Immutable audit trail for compliance checks.',
    },
    {
        key: 'community-moderation',
        to: '/community',
        label: 'Community',
        shortLabel: 'CM',
        group: 'risk',
        summary: 'Moderation triage for user content reports.',
    },
    {
        key: 'error-reports',
        to: '/errors',
        label: 'Errors',
        shortLabel: 'ER',
        group: 'risk',
        summary: 'Frontend error triage and resolution tracking.',
    },
    {
        key: 'analytics',
        to: '/analytics',
        label: 'Analytics',
        shortLabel: 'AL',
        group: 'risk',
        summary: 'Behavioral analytics and trend indicators.',
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
    core: 'Core Workflow',
    publishing: 'Publishing Stack',
    risk: 'Risk, Trust and Insights',
};
