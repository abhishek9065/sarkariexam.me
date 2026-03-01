/**
 * Pure helper functions extracted from AdminPage.tsx.
 * None of these depend on React state — they are free functions.
 */

import type {
    AdminSummary,
    Announcement,
    AnnouncementStatus,
    ContentType,
    DashboardData,
    DashboardOverview,
    DashboardUsers,
    ListFilterPreset,
    ListFilterState,
    AdminUserProfile,
    TimeZoneMode,
} from './adminTypes';
import {
    ADMIN_SIDEBAR_KEY,
    ADMIN_TIMEZONE_KEY,
    ADMIN_USER_STORAGE_KEY,
    CONTENT_TYPES,
    LIST_FILTER_PRESETS_KEY,
    LIST_FILTER_STORAGE_KEY,
    STATUS_OPTIONS,
} from './adminConstants';

// ─── Cookie ─────────────────────────────────────────────────────────────────

export const readCookieValue = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
    if (!match) return null;
    try {
        return decodeURIComponent(match[1]);
    } catch {
        return match[1];
    }
};

export const requestBodyFingerprint = (body: BodyInit | null | undefined): string => {
    if (typeof body === 'string') return body;
    if (body instanceof URLSearchParams) return body.toString();
    return '';
};

// ─── Safe coercion ──────────────────────────────────────────────────────────

export const getNumber = (value: unknown, fallback = 0): number => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export const asArray = <T,>(value: unknown): T[] => {
    return Array.isArray(value) ? (value as T[]) : [];
};

// ─── Normalisers ────────────────────────────────────────────────────────────

export const normalizeDashboardData = (value: unknown): DashboardData => {
    const data = (value ?? {}) as Partial<DashboardData>;
    const overview = (data.overview ?? {}) as Partial<DashboardOverview>;
    const users = (data.users ?? {}) as Partial<DashboardUsers>;
    return {
        overview: {
            totalAnnouncements: getNumber(overview.totalAnnouncements),
            totalViews: getNumber(overview.totalViews),
            totalBookmarks: getNumber(overview.totalBookmarks),
            activeJobs: getNumber(overview.activeJobs),
            expiringSoon: getNumber(overview.expiringSoon),
            newToday: getNumber(overview.newToday),
            newThisWeek: getNumber(overview.newThisWeek),
        },
        users: {
            totalUsers: getNumber(users.totalUsers),
            newToday: getNumber(users.newToday),
            newThisWeek: getNumber(users.newThisWeek),
            activeSubscribers: getNumber(users.activeSubscribers),
        },
    };
};

export const normalizeAdminSummary = (value: unknown): AdminSummary => {
    const data = (value ?? {}) as Partial<AdminSummary>;
    const counts = (data.counts ?? {}) as Partial<AdminSummary['counts']>;
    const pendingSla = (data.pendingSla ?? {}) as Partial<AdminSummary['pendingSla']>;
    const byStatusSource = (counts.byStatus ?? {}) as Partial<Record<AnnouncementStatus, number>>;
    const byTypeSource = (counts.byType ?? {}) as Partial<Record<ContentType, number>>;
    return {
        counts: {
            total: getNumber(counts.total),
            byStatus: {
                draft: getNumber(byStatusSource.draft),
                pending: getNumber(byStatusSource.pending),
                scheduled: getNumber(byStatusSource.scheduled),
                published: getNumber(byStatusSource.published),
                archived: getNumber(byStatusSource.archived),
            },
            byType: {
                job: getNumber(byTypeSource.job),
                result: getNumber(byTypeSource.result),
                'admit-card': getNumber(byTypeSource['admit-card']),
                syllabus: getNumber(byTypeSource.syllabus),
                'answer-key': getNumber(byTypeSource['answer-key']),
                admission: getNumber(byTypeSource.admission),
            },
            totalQaIssues: getNumber(counts.totalQaIssues),
            pendingQaIssues: getNumber(counts.pendingQaIssues),
        },
        pendingSla: {
            pendingTotal: getNumber(pendingSla.pendingTotal),
            averageDays: getNumber(pendingSla.averageDays),
            buckets: {
                lt1: getNumber(pendingSla.buckets?.lt1),
                d1_3: getNumber(pendingSla.buckets?.d1_3),
                d3_7: getNumber(pendingSla.buckets?.d3_7),
                gt7: getNumber(pendingSla.buckets?.gt7),
            },
            stale: asArray<Announcement & { ageDays: number }>(pendingSla.stale),
        },
    };
};

// ─── LocalStorage loaders ───────────────────────────────────────────────────

export const loadAdminUser = (): AdminUserProfile | null => {
    try {
        const raw = localStorage.getItem(ADMIN_USER_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as AdminUserProfile;
    } catch {
        return null;
    }
};

export const loadTimeZoneMode = (): TimeZoneMode => {
    try {
        const raw = localStorage.getItem(ADMIN_TIMEZONE_KEY);
        if (raw === 'local' || raw === 'ist' || raw === 'utc') return raw;
    } catch {
        // ignore
    }
    return 'local';
};

export const loadSidebarCollapsed = (): boolean => {
    try {
        const raw = localStorage.getItem(ADMIN_SIDEBAR_KEY);
        return raw === '1';
    } catch {
        return false;
    }
};

export const loadListFilters = (): ListFilterState | null => {
    try {
        const raw = localStorage.getItem(LIST_FILTER_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as ListFilterState;
    } catch {
        return null;
    }
};

export const loadListFilterPresets = (): ListFilterPreset[] => {
    try {
        const raw = localStorage.getItem(LIST_FILTER_PRESETS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((preset: Record<string, unknown>) => preset && typeof preset === 'object')
            .map((preset: Record<string, unknown>) => ({
                id: String(preset.id || crypto.randomUUID()),
                label: String(preset.label || 'Untitled preset'),
                query: typeof preset.query === 'string' ? preset.query : '',
                type: preset.type === 'all' || CONTENT_TYPES.some((item) => item.value === preset.type) ? preset.type as ContentType | 'all' : 'all',
                status: preset.status === 'all' || STATUS_OPTIONS.some((item) => item.value === preset.status) ? preset.status as AnnouncementStatus | 'all' : 'all',
                sort: preset.sort === 'updated' || preset.sort === 'deadline' || preset.sort === 'views' || preset.sort === 'oldest' ? preset.sort as ListFilterPreset['sort'] : 'newest',
            }));
    } catch {
        return [];
    }
};

// ─── QA / Validation helpers ────────────────────────────────────────────────

export function isValidUrl(value?: string | null): boolean {
    if (!value) return true;
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

export function getAnnouncementWarnings(item: Announcement): string[] {
    const warnings: string[] = [];
    if (!item.title || item.title.trim().length < 10) {
        warnings.push('Title is too short');
    }
    if (!item.category || !item.category.trim()) {
        warnings.push('Category is missing');
    }
    if (!item.organization || !item.organization.trim()) {
        warnings.push('Organization is missing');
    }
    if (item.status === 'scheduled' && !item.publishAt) {
        warnings.push('Scheduled without publish time');
    }
    if (item.deadline) {
        const deadlineTime = new Date(item.deadline).getTime();
        if (!Number.isNaN(deadlineTime) && deadlineTime < Date.now()) {
            warnings.push('Deadline is expired');
        }
    }
    if (item.externalLink && !isValidUrl(item.externalLink)) {
        warnings.push('External link is invalid');
    }
    return warnings;
}

export function getReviewRisk(item: Announcement) {
    const warnings = getAnnouncementWarnings(item);
    const now = Date.now();
    const baseDate = new Date(item.updatedAt || item.postedAt).getTime();
    const ageDays = Number.isNaN(baseDate) ? 0 : Math.max(0, Math.floor((now - baseDate) / (1000 * 60 * 60 * 24)));
    const deadlineTime = item.deadline ? new Date(item.deadline).getTime() : NaN;
    const dueSoon = !Number.isNaN(deadlineTime) && deadlineTime > now && deadlineTime <= now + (7 * 24 * 60 * 60 * 1000);
    const score = ageDays * 2 + warnings.length * 8 + (dueSoon ? 12 : 0);
    const severity: 'high' | 'medium' | 'low' = score >= 30 ? 'high' : score >= 18 ? 'medium' : 'low';
    return { score, severity, ageDays, warnings, dueSoon };
}

export function getFixableWarnings(item: Announcement): string[] {
    const fixes: string[] = [];
    if (item.externalLink && !isValidUrl(item.externalLink)) {
        fixes.push('Clear invalid external link');
    }
    if (item.status === 'scheduled' && !item.publishAt) {
        fixes.push('Move scheduled item back to pending');
    }
    if (item.deadline) {
        const deadlineTime = new Date(item.deadline).getTime();
        const isExpired = !Number.isNaN(deadlineTime) && deadlineTime < Date.now();
        const isExpirableType = item.type === 'job' || item.type === 'admission';
        if (isExpired && isExpirableType && item.isActive !== false) {
            fixes.push('Deactivate expired listing');
        }
    }
    return fixes;
}

export function buildQaFixPatch(item: Announcement) {
    const patch: Record<string, unknown> = {};
    const fixes = getFixableWarnings(item);

    if (item.externalLink && !isValidUrl(item.externalLink)) {
        patch.externalLink = '';
    }
    if (item.status === 'scheduled' && !item.publishAt) {
        patch.status = 'pending';
        patch.publishAt = '';
    }
    if (item.deadline) {
        const deadlineTime = new Date(item.deadline).getTime();
        const isExpired = !Number.isNaN(deadlineTime) && deadlineTime < Date.now();
        const isExpirableType = item.type === 'job' || item.type === 'admission';
        if (isExpired && isExpirableType && item.isActive !== false) {
            patch.isActive = false;
        }
    }

    return { patch, fixes };
}

// ─── Date / time helpers ────────────────────────────────────────────────────

export const toDate = (value?: string | Date | null): Date | null => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

export const createDateFormatter = (timeZoneId: string | undefined) => {
    const formatDate = (value?: string | Date | null): string => {
        const date = toDate(value);
        if (!date) return 'N/A';
        return new Intl.DateTimeFormat('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone: timeZoneId,
        }).format(date);
    };

    const formatTime = (value?: string | Date | null): string => {
        const date = toDate(value);
        if (!date) return '-';
        return new Intl.DateTimeFormat('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: timeZoneId,
        }).format(date);
    };

    const formatDateTime = (value?: string | Date | null): string => {
        const date = toDate(value);
        if (!date) return '-';
        return new Intl.DateTimeFormat('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: timeZoneId,
        }).format(date);
    };

    const renderDateCell = (value?: string): React.ReactNode => {
        const label = formatDate(value);
        return label === 'N/A' ? null : label;
    };

    return { formatDate, formatTime, formatDateTime, renderDateCell };
};

export const normalizeDateTime = (value?: string | Date): string | undefined => {
    if (!value) return undefined;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return value instanceof Date ? value.toISOString() : value;
    return date.toISOString();
};

export const formatLastUpdated = (value?: string | null, label = 'Updated'): string => {
    if (!value) return 'Not updated yet';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not updated yet';
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 60 * 1000) return `${label} just now`;
    if (diffMs < 60 * 60 * 1000) return `${label} ${Math.round(diffMs / 60000)}m ago`;
    if (diffMs < 24 * 60 * 60 * 1000) return `${label} ${Math.round(diffMs / (60 * 60 * 1000))}h ago`;
    return `${label} ${Math.round(diffMs / (24 * 60 * 60 * 1000))}d ago`;
};

export const parseDateOnly = (value?: string): Date | null => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

export const parseDateTime = (value?: string): Date | null => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

export const formatDateInput = (date: Date): string => {
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const getWarningTone = (warning: string): 'critical' | 'warning' => {
    const lower = warning.toLowerCase();
    if (lower.includes('required') || lower.includes('at least') || lower.includes('need a publish')) {
        return 'critical';
    }
    return 'warning';
};

export function getFormWarnings(formData: {
    title: string;
    organization: string;
    category: string;
    status: string;
    publishAt: string;
    deadline: string;
    externalLink: string;
}): string[] {
    const warnings: string[] = [];
    if (!formData.title.trim() || formData.title.trim().length < 10) {
        warnings.push('Title should be at least 10 characters.');
    }
    if (!formData.organization.trim()) {
        warnings.push('Organization is required.');
    }
    if (!formData.category.trim()) {
        warnings.push('Category is required.');
    }
    if (formData.status === 'scheduled' && !formData.publishAt) {
        warnings.push('Scheduled posts need a publish time.');
    }
    if (formData.deadline) {
        const deadlineDate = parseDateOnly(formData.deadline);
        if (deadlineDate && deadlineDate.getTime() < Date.now()) {
            warnings.push('Deadline is in the past.');
        }
    }
    if (formData.externalLink && !isValidUrl(formData.externalLink)) {
        warnings.push('External link is not a valid URL.');
    }
    return warnings;
}
