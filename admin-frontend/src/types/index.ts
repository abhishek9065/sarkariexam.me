export type AdminPortalRole = 'admin' | 'editor' | 'contributor' | 'reviewer' | 'viewer';
export type AnnouncementTypeFilter = 'job' | 'admit-card' | 'result' | 'answer-key' | 'syllabus' | 'admission';
export type AnnouncementStatusFilter = 'draft' | 'pending' | 'scheduled' | 'published' | 'archived';
export type AnnouncementSortOption = 'newest' | 'oldest' | 'updated' | 'deadline' | 'views';
export type AdminSettingKey =
    | 'states'
    | 'boards'
    | 'tags'
    | 'workflow-defaults'
    | 'homepage-defaults'
    | 'alert-thresholds'
    | 'security-policy'
    | 'notification-routing';

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
    roles: Record<AdminPortalRole, string[]>;
    permissions?: AdminPermission[];
    defaults?: AdminPortalRole[];
    role?: AdminPortalRole;
    tabs?: Record<string, AdminPermission>;
    highRiskActions?: string[];
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
    typeDetails?: Record<string, unknown>;
    seo?: {
        metaTitle?: string;
        metaDescription?: string;
        canonical?: string;
        indexPolicy?: 'index' | 'noindex';
        ogImage?: string;
    };
    home?: {
        section?: string;
        stickyRank?: number;
        highlight?: boolean;
        trendingScore?: number;
    };
    schema?: Record<string, unknown>;
    assigneeUserId?: string;
    assigneeEmail?: string;
    assignedAt?: string;
    reviewDueAt?: string;
    claimedByCurrentUser?: boolean;
}

export interface AdminAnnouncementListResponse {
    data: AdminAnnouncementListItem[];
    meta: {
        total: number;
        limit: number;
        offset: number;
    };
}

export interface AdminContentRecord extends AdminAnnouncementListItem {
    id: string;
    title: string;
    type: string;
    category?: string;
    organization?: string;
    status?: string;
}

export interface JobDetails {
    importantDates?: Array<{ eventName: string; eventDate: string; description?: string }>;
    applicationFee?: string;
    ageLimit?: string;
    vacancyDetails?: string;
    eligibility?: string;
    selectionProcess?: string;
    salary?: string;
}

export interface ResultDetails {
    examName?: string;
    conductingBody?: string;
    resultType?: string;
    resultDate?: string;
    resultLinks?: string[];
    cutoffLink?: string;
}

export interface AdmitCardDetails {
    examDate?: string;
    releaseDate?: string;
    downloadLink?: string;
    instructions?: string;
    regionalLinks?: string[];
}

export interface AnswerKeyDetails {
    answerKeyLink?: string;
    objectionStart?: string;
    objectionEnd?: string;
    objectionFee?: string;
}

export interface SyllabusDetails {
    pdfLinks?: string[];
    marksBreakdown?: string;
}

export interface AdmissionDetails {
    courseName?: string;
    collegeName?: string;
    counselingDates?: string;
    eligibility?: string;
}

export interface HomepageSectionConfig {
    id?: string;
    key: string;
    title: string;
    itemType: 'job' | 'result' | 'admit-card' | 'answer-key' | 'syllabus' | 'admission' | 'important';
    sortRule: 'newest' | 'sticky' | 'trending';
    pinnedIds: string[];
    highlightIds: string[];
    updatedAt?: string;
    updatedBy?: string;
}

export interface LinkRecord {
    id: string;
    label: string;
    url: string;
    type: 'official' | 'pdf' | 'external';
    status: 'active' | 'expired' | 'broken';
    announcementId?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
    updatedBy?: string;
}

export interface LinkHealthReport {
    id?: string;
    url: string;
    status: 'ok' | 'redirect' | 'broken' | 'error';
    statusCode?: number;
    redirectTarget?: string;
    responseTimeMs?: number;
}

export interface MediaAsset {
    id: string;
    label: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    category: 'notification' | 'result' | 'admit-card' | 'answer-key' | 'syllabus' | 'other';
    keepStableUrl: boolean;
    fileSizeBytes?: number;
    status: 'active' | 'archived';
    createdAt?: string;
    updatedAt?: string;
    updatedBy?: string;
}

export interface TemplateRecord {
    id: string;
    type: AnnouncementTypeFilter;
    name: string;
    description?: string;
    shared: boolean;
    sections: string[];
    payload: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    updatedBy?: string;
}

export interface AdminAlert {
    id: string;
    source: 'deadline' | 'schedule' | 'link' | 'traffic' | 'manual';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    status: 'open' | 'acknowledged' | 'resolved';
    metadata?: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
}

export interface AdminRoleUser {
    id: string;
    email: string;
    username?: string;
    role: AdminPortalRole;
    isActive: boolean;
    twoFactorEnabled?: boolean;
    createdAt?: string;
    updatedAt?: string;
    lastLoginAt?: string | null;
    activeSessionCount?: number;
    invitationState?: 'pending' | 'accepted' | 'reset-required';
    invitedAt?: string | null;
    invitedBy?: string | null;
    passwordResetRequired?: boolean;
    backupCodesAvailable?: number;
    backupCodesTotal?: number;
}

export interface AdminReportSnapshot {
    summary: {
        totalPosts: number;
        pendingDrafts: number;
        scheduled: number;
        pendingReview: number;
        brokenLinks: number;
        expired: number;
    };
    mostViewed24h: Array<{ id: string; title: string; type: string; views: number; organization?: string }>;
    upcomingDeadlines: Array<{ id: string; title: string; type: string; deadline?: string; organization?: string }>;
    trafficSeries: Array<{ date: string; views: number }>;
    trafficSources: Array<{ source: string; label: string; views: number; percentage: number }>;
    brokenLinkItems: Array<{ id: string; label: string; url: string; updatedAt?: string; announcementId?: string }>;
    workflowSummary?: {
        unassignedPendingReview: number;
        overdueReviewItems: number;
        currentUserAssignedQueue: number;
    };
    incidentSummary?: {
        unresolvedErrorReports: number;
        highRiskSessions: number;
        openCriticalAlerts: number;
    };
    drilldowns?: Array<{
        key: string;
        label: string;
        count: number;
        route: string;
        tone?: 'neutral' | 'info' | 'warning' | 'danger';
    }>;
}

export interface AdminUser {
    id: string;
    email: string;
    username: string;
    role: 'user' | AdminPortalRole;
    twoFactorEnabled?: boolean;
}

export interface AdminSettingRecord {
    key: AdminSettingKey;
    values?: string[];
    payload?: Record<string, unknown>;
    updatedAt?: string | null;
    updatedBy?: string | null;
}

export interface AdminAuthLoginResult {
    status: 'authenticated' | 'two-factor-required' | 'two-factor-setup-required' | 'locked-out';
    challengeToken?: string;
    setupToken?: string;
    message?: string;
    retryAfter?: number;
}

export interface AdminAuditLog {
    id?: string;
    action?: string;
    createdAt?: string;
    announcementId?: string;
    title?: string;
    userId?: string;
    note?: string;
    actorId?: string;
    actorEmail?: string;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}

export interface AdminSecurityLog {
    id?: string;
    eventType?: string;
    endpoint?: string;
    ipAddress?: string;
    createdAt?: string;
    incidentStatus?: 'new' | 'investigating' | 'resolved';
    assigneeEmail?: string | null;
    note?: string | null;
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
    stack?: string | null;
    componentStack?: string | null;
    status: 'new' | 'triaged' | 'resolved';
    adminNote?: string | null;
    assigneeEmail?: string | null;
    createdAt: string;
    updatedAt?: string;
    userEmail?: string | null;
    release?: string | null;
    requestId?: string | null;
    sentryEventUrl?: string | null;
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

export interface AdminSavedView {
    id: string;
    name: string;
    module: string;
    scope: 'private' | 'shared';
    filters: Record<string, unknown>;
    columns?: string[];
    sort?: Record<string, unknown>;
    isDefault?: boolean;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    updatedBy?: string;
}

export interface AdminGlobalSearchResult {
    entity: 'post' | 'link' | 'media' | 'organization' | 'tag';
    id: string;
    title: string;
    subtitle?: string;
    route?: string;
}

export interface AdminDraftRecord {
    id: string;
    title: string;
    type: AnnouncementTypeFilter;
    status: AnnouncementStatusFilter | 'draft';
    updatedAt?: string;
}

export interface AdminAutosavePayload {
    title?: string;
    category?: string;
    organization?: string;
    content?: string;
    externalLink?: string;
    location?: string;
    deadline?: string;
    minQualification?: string;
    ageLimit?: string;
    applicationFee?: string;
    salaryMin?: number;
    salaryMax?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    cutoffMarks?: string;
    totalPosts?: number;
    status?: AnnouncementStatusFilter;
    publishAt?: string;
    approvedAt?: string;
    approvedBy?: string;
    tags?: string[];
    importantDates?: Array<{ eventName: string; eventDate: string; description?: string }>;
    typeDetails?: Record<string, unknown>;
    seo?: {
        metaTitle?: string;
        metaDescription?: string;
        canonical?: string;
        indexPolicy?: 'index' | 'noindex';
        ogImage?: string;
    };
    home?: {
        section?: string;
        stickyRank?: number;
        highlight?: boolean;
        trendingScore?: number;
    };
    schema?: Record<string, unknown>;
    autosave?: {
        editorSessionId?: string;
        clientUpdatedAt?: string;
        cursor?: Record<string, unknown>;
    };
}

export interface AdminRevisionEntry {
    version: number;
    updatedAt?: string;
    updatedBy?: string;
    note?: string;
    changedKeys: string[];
    snapshot: Record<string, unknown>;
}

export interface WorkflowPolicyByType {
    type: AnnouncementTypeFilter;
    requiresReview: boolean;
    requiresStepUpToPublish: boolean;
}
