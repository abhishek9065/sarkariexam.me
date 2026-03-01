/**
 * Shared types for the Admin module.
 * Extracted from AdminPage.tsx monolith — keep this file as the single source of truth.
 */

import type {
    Announcement,
    AnnouncementStatus,
    ContentType,
    AdminPermission,
    BulkPreviewResult,
    ReviewPreviewResult,
} from '../../types';

// ─── Dashboard ──────────────────────────────────────────────────────────────

export type DashboardOverview = {
    totalAnnouncements: number;
    totalViews: number;
    totalBookmarks: number;
    activeJobs: number;
    expiringSoon: number;
    newToday: number;
    newThisWeek: number;
};

export type DashboardUsers = {
    totalUsers: number;
    newToday: number;
    newThisWeek: number;
    activeSubscribers: number;
};

export type DashboardData = {
    overview: DashboardOverview;
    users: DashboardUsers;
};

// ─── Admin Summary / SLA ────────────────────────────────────────────────────

export type AdminSummary = {
    counts: {
        total: number;
        byStatus: Record<AnnouncementStatus, number>;
        byType: Record<ContentType, number>;
        totalQaIssues?: number;
        pendingQaIssues?: number;
    };
    pendingSla: {
        pendingTotal: number;
        averageDays: number;
        buckets: { lt1: number; d1_3: number; d3_7: number; gt7: number };
        stale: Array<Announcement & { ageDays: number }>;
    };
};

// ─── Audit ──────────────────────────────────────────────────────────────────

export type AdminAuditLog = {
    id: string;
    action: string;
    announcementId?: string;
    title?: string;
    userId?: string;
    note?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
};

// ─── Community ──────────────────────────────────────────────────────────────

export type CommunityEntityType = 'forum' | 'qa' | 'group';

export type CommunityFlag = {
    id: string;
    entityType: CommunityEntityType;
    entityId: string;
    reason: string;
    reporter?: string | null;
    status: 'open' | 'reviewed' | 'resolved';
    createdAt: string;
};

export type CommunityForumPost = {
    id: string;
    title: string;
    content: string;
    category: string;
    author: string;
    createdAt: string;
};

export type CommunityQaThread = {
    id: string;
    question: string;
    answer?: string | null;
    answeredBy?: string | null;
    author: string;
    createdAt: string;
};

export type CommunityStudyGroup = {
    id: string;
    name: string;
    topic: string;
    language: string;
    link?: string | null;
    createdAt: string;
};

// ─── Toast ──────────────────────────────────────────────────────────────────

export type ToastTone = 'success' | 'error' | 'info';

export type Toast = {
    id: string;
    message: string;
    tone: ToastTone;
};

// ─── Error Reports ──────────────────────────────────────────────────────────

export type ErrorReportStatus = 'new' | 'triaged' | 'resolved';

export type ErrorReport = {
    id: string;
    errorId: string;
    message: string;
    pageUrl?: string | null;
    userAgent?: string | null;
    note?: string | null;
    adminNote?: string | null;
    stack?: string | null;
    componentStack?: string | null;
    createdAt: string;
    updatedAt?: string | null;
    status: ErrorReportStatus;
    userId?: string | null;
    userEmail?: string | null;
    resolvedAt?: string | null;
    resolvedBy?: string | null;
};

// ─── Sessions ───────────────────────────────────────────────────────────────

export type AdminSession = {
    id: string;
    userId: string;
    email?: string;
    ip: string;
    userAgent: string;
    device: string;
    browser: string;
    os: string;
    lastActivity: string;
    loginTime: string;
    expiresAt?: string | null;
    isCurrentSession: boolean;
    isActive: boolean;
    riskScore: 'low' | 'medium' | 'high';
    actions: string[];
};

// ─── 2FA / Backup Codes ────────────────────────────────────────────────────

export type BackupCodesStatus = {
    total: number;
    remaining: number;
    updatedAt: string | null;
};

// ─── Filters ────────────────────────────────────────────────────────────────

export type TimeZoneMode = 'local' | 'ist' | 'utc';

export type ListFilterState = {
    query?: string;
    type?: ContentType | 'all';
    status?: AnnouncementStatus | 'all';
    sort?: 'newest' | 'oldest' | 'updated' | 'deadline' | 'views';
};

export type ListFilterPreset = ListFilterState & {
    id: string;
    label: string;
};

// ─── Review / Bulk ──────────────────────────────────────────────────────────

export type ReviewPreviewState = {
    action: 'approve' | 'reject' | 'schedule';
    payload: { ids: string[]; note?: string; scheduleAt?: string };
    result: import('../../types').ReviewPreviewResult;
};

export type BulkPreviewState = {
    payload: Record<string, unknown>;
    result: import('../../types').BulkPreviewResult;
};

// ─── Profile ────────────────────────────────────────────────────────────────

export type AdminUserProfile = {
    name?: string;
    email?: string;
    role?: string;
};

// ─── Tab ────────────────────────────────────────────────────────────────────

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
    | 'errors';

export type { AdminPermission, Announcement, AnnouncementStatus, ContentType, BulkPreviewResult, ReviewPreviewResult };
