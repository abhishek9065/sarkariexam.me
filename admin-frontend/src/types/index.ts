export type AdminPortalRole = 'admin' | 'editor' | 'reviewer' | 'viewer';
export type AnnouncementTypeFilter = 'job' | 'admit-card' | 'result' | 'answer-key' | 'syllabus' | 'admission';
export type AnnouncementStatusFilter = 'draft' | 'pending' | 'scheduled' | 'published' | 'archived';
export type AnnouncementSortOption = 'newest' | 'oldest' | 'updated' | 'deadline' | 'views';

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

export interface AdminAccount {
    id: string;
    userId: string;
    email: string;
    role: AdminPortalRole;
    status: 'active' | 'suspended';
    twoFactorEnabled: boolean;
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string | null;
}

export interface AdminSession {
    id: string;
    userId: string;
    email?: string;
    ip: string;
    userAgent: string;
    device: string;
    browser: string;
    os: string;
    loginTime: string;
    lastActivity: string;
    expiresAt?: string | null;
    isCurrentSession: boolean;
    isActive: boolean;
    riskScore: 'low' | 'medium' | 'high';
    actions: string[];
}

export interface AdminSessionTerminateOthersResult {
    success: boolean;
    removed?: number;
    terminatedCount?: number;
}

export interface AdminPermissionSnapshot {
    role: AdminPortalRole;
    roles: Record<AdminPortalRole, string[]>;
    tabs: Record<string, AdminPermission>;
    highRiskActions: string[];
}

export interface AdminReviewPreview {
    eligibleIds: string[];
    blockedIds: Array<{ id: string; reason: string }>;
    warnings: string[];
}

export interface AdminBulkPreview {
    totalTargets: number;
    affectedByStatus: Record<string, number>;
    warnings: string[];
    missingIds: string[];
}

export interface AdminAnnouncementListItem {
    id?: string;
    _id?: string;
    title?: string;
    status?: string;
    updatedAt?: string;
    publishedAt?: string;
    type?: string;
    slug?: string;
    category?: string;
    organization?: string;
    content?: string;
    externalLink?: string;
    location?: string;
    riskLevel?: 'low' | 'medium' | 'high';
    warningCount?: number;
    approvalState?: string;
    updatedBy?: string;
}

export interface AdminUser {
    id: string;
    email: string;
    username: string;
    role: 'user' | AdminPortalRole;
    twoFactorEnabled?: boolean;
}

export interface AdminAuditLog {
    id?: string;
    action?: string;
    createdAt?: string;
    actorId?: string;
    actorEmail?: string;
    [key: string]: unknown;
}

export interface AdminSecurityLog {
    id?: string;
    eventType?: string;
    endpoint?: string;
    ipAddress?: string;
    createdAt?: string;
    [key: string]: unknown;
}

export interface AdminApprovalItem {
    id?: string;
    action?: string;
    status?: string;
    requestedAt?: string;
    requestedBy?: string;
    [key: string]: unknown;
}

export interface AdminStepUpGrant {
    token: string;
    expiresAt: string;
}

export interface AdminErrorReport {
    id: string;
    errorId: string;
    message: string;
    pageUrl?: string | null;
    userAgent?: string | null;
    note?: string | null;
    status: 'new' | 'triaged' | 'resolved';
    adminNote?: string | null;
    createdAt: string;
    updatedAt?: string;
    userEmail?: string | null;
    resolvedAt?: string | null;
    resolvedBy?: string | null;
}

export interface CommunityFlag {
    id: string;
    entityType: 'forum' | 'qa' | 'group';
    entityId: string;
    reason: string;
    reporter?: string | null;
    status: 'open' | 'reviewed' | 'resolved';
    createdAt: string;
    updatedAt?: string;
}

export interface CommunityForum {
    id: string;
    title: string;
    content: string;
    category: string;
    author: string;
    createdAt: string;
}

export interface CommunityQa {
    id: string;
    question: string;
    answer?: string | null;
    answeredBy?: string | null;
    author: string;
    createdAt: string;
}

export interface CommunityGroup {
    id: string;
    name: string;
    topic: string;
    language: string;
    link?: string | null;
    createdAt: string;
}

export type OpsStatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface OpsFilterPreset {
    id: string;
    label: string;
    filters: Record<string, string | number | boolean | null | undefined>;
}

export interface ModuleHealthState {
    module: string;
    status: 'live' | 'gated' | 'degraded';
    updatedAt?: string;
    note?: string;
}

export interface AdminAnnouncementFilterPreset {
    id: string;
    label: string;
    query: string;
    type: AnnouncementTypeFilter | 'all';
    status: AnnouncementStatusFilter | 'all';
    sort: AnnouncementSortOption;
}
