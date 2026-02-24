/* ─── Core enums / unions ─── */
export type ContentType = 'job' | 'result' | 'admit-card' | 'syllabus' | 'answer-key' | 'admission';
export type AnnouncementStatus = 'draft' | 'pending' | 'scheduled' | 'published' | 'archived';
export type TrackerStatus = 'saved' | 'applied' | 'admit-card' | 'exam' | 'result';
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
export type NumberLocalePref = 'auto' | 'en-IN' | 'en-US';
export type MetricCategory = 'traffic' | 'engagement' | 'conversion' | 'risk';
export type AdminRowAction = 'view' | 'edit' | 'publish_toggle' | 'boost' | 'delete';
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

export interface AdminPermissionsSnapshot {
    role: AdminPortalRole;
    roles: Record<AdminPortalRole, string[]>;
    tabs: Record<AdminTab, AdminPermission>;
    highRiskActions: string[];
}

export interface AdminUiFlags {
    admin_nav_ux_v2: boolean;
    admin_analytics_ux_v2: boolean;
    admin_lists_ux_v2: boolean;
    admin_lists_v3: boolean;
    admin_review_v3: boolean;
    admin_analytics_v3: boolean;
    admin_command_palette_v1: boolean;
}

export interface AdminV3Flags {
    admin_lists_v3: boolean;
    admin_review_v3: boolean;
    admin_analytics_v3: boolean;
    admin_command_palette_v1: boolean;
}

export interface MetricDefinition {
    key: 'ctr' | 'drop_off_rate' | 'tracking_coverage' | 'conversion_rate';
    label: string;
    description: string;
}

/* ─── Tags ─── */
export interface Tag {
    id: number;
    name: string;
    slug: string;
}

/* ─── Important Dates ─── */
export interface ImportantDate {
    id?: string;
    eventName: string;
    eventDate: string;
    description?: string;
}

/* ─── Announcement (full) ─── */
export interface Announcement {
    id: string;
    title: string;
    slug: string;
    type: ContentType;
    category: string;
    organization: string;
    content?: string;
    externalLink?: string;
    location?: string;
    deadline?: string | null;
    minQualification?: string;
    ageLimit?: string;
    applicationFee?: string;
    salaryMin?: number;
    salaryMax?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    cutoffMarks?: string;
    totalPosts?: number;
    postedBy?: string;
    postedAt: string;
    updatedAt: string;
    status?: AnnouncementStatus;
    publishAt?: string;
    isActive: boolean;
    viewCount: number;
    tags?: Tag[];
    importantDates?: ImportantDate[];
    jobDetails?: Record<string, unknown>;
}

/* ─── Lightweight card returned by /v3/cards ─── */
export interface AnnouncementCard {
    id: string;
    title: string;
    slug: string;
    type: ContentType;
    category: string;
    organization: string;
    location?: string;
    deadline?: string | null;
    totalPosts?: number;
    postedAt: string;
    viewCount?: number;
}

/* ─── User ─── */
export interface User {
    id: string;
    email: string;
    username: string;
    role: 'user' | AdminPortalRole | string;
    isActive?: boolean;
    createdAt?: string;
    lastLogin?: string;
    twoFactorEnabled?: boolean;
}

/* ─── Auth ─── */
export interface AuthResponse {
    token?: string;
    user: User;
}

/* ─── Tracked Application ─── */
export interface TrackedApplication {
    id: string;
    announcementId?: string;
    slug: string;
    type: ContentType;
    title: string;
    organization?: string;
    deadline?: string | null;
    status: TrackerStatus;
    notes?: string;
    reminderAt?: string | null;
    trackedAt: string;
    updatedAt: string;
}

/* ─── Search Suggestion ─── */
export interface SearchSuggestion {
    title: string;
    slug: string;
    type: ContentType;
    organization?: string;
}

/* ─── Paginated response wrapper ─── */
export interface PaginatedResponse<T> {
    data: T[];
    total?: number;
    nextCursor?: string;
    hasMore?: boolean;
}

/* ─── API error shape ─── */
export interface ApiError {
    error: string;
    message?: string;
    details?: Record<string, string[]>;
}

export interface BulkPreviewResult {
    totalTargets: number;
    affectedByStatus: Record<string, number>;
    warnings: string[];
    missingIds: string[];
}

export interface ReviewPreviewResult {
    eligibleIds: string[];
    blockedIds: Array<{ id: string; reason: string }>;
    warnings: string[];
}

export interface AnalyticsComparison {
    viewsDeltaPct: number;
    searchesDeltaPct: number;
    ctrDeltaPct: number;
    dropOffDeltaPct: number;
    compareDays: number;
}

export interface AnalyticsAnomaly {
    key: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
    targetQuery?: Record<string, string>;
}
