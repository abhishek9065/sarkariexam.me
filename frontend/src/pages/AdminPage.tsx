import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import type { JobDetails } from '../components/admin/JobPostingForm';
import { JobDetailsRenderer } from '../components/details/JobDetailsRenderer';
import { ConfirmDialogProvider } from '../components/admin/ConfirmDialog';
import { AuthLoadingIndicator } from '../components/admin/AuthLoadingIndicator';
import { AdminNotificationSystem } from '../components/admin/AdminNotification';
import { useAdminNotifications } from '../components/admin/useAdminNotifications';
import { AdminCommandPalette } from '../components/admin/AdminCommandPalette';
import { useKeyboardShortcuts, type KeyboardShortcut } from '../hooks/useKeyboardShortcuts';
import { useTheme } from '../context/useTheme';
import { useAuth } from '../context/useAuth';
import type {
    Announcement,
    AnnouncementStatus,
    BulkPreviewResult,
    ContentType,
    AdminPermission,
    ReviewPreviewResult,
} from '../types';
import { isAdminPortalRole } from '../utils/adminRbac';
import { getApiErrorMessage } from '../utils/errors';
import { formatNumber } from '../utils/formatters';
import { maskIpAddress } from '../utils/maskIpAddress';
import { adminRequest } from '../utils/adminRequest';
import { useAdminUiFlags } from '../utils/adminFlags';
import { trackAdminTelemetry } from '../utils/adminTelemetry';
import { AdminShellSearch } from '../components/admin/AdminShellSearch';
import './AdminPage.css';

const apiBase = import.meta.env.VITE_API_BASE ?? '';

const AnalyticsDashboard = lazy(() =>
    import('../components/admin/AnalyticsDashboard').then((module) => ({ default: module.AnalyticsDashboard }))
);
const JobPostingForm = lazy(() =>
    import('../components/admin/JobPostingForm').then((module) => ({ default: module.JobPostingForm }))
);
const SecurityLogsTable = lazy(() =>
    import('../components/admin/SecurityLogsTable').then((module) => ({ default: module.SecurityLogsTable }))
);
const AdminContentList = lazy(() =>
    import('../components/admin/AdminContentList').then((module) => ({ default: module.AdminContentList }))
);
const AdminQueue = lazy(() =>
    import('../components/admin/AdminQueue').then((module) => ({ default: module.AdminQueue }))
);
const SessionManager = lazy(() =>
    import('../components/admin/SessionManager').then((module) => ({ default: module.SessionManager }))
);

type DashboardOverview = {
    totalAnnouncements: number;
    totalViews: number;
    totalBookmarks: number;
    activeJobs: number;
    expiringSoon: number;
    newToday: number;
    newThisWeek: number;
};

type DashboardUsers = {
    totalUsers: number;
    newToday: number;
    newThisWeek: number;
    activeSubscribers: number;
};

type DashboardData = {
    overview: DashboardOverview;
    users: DashboardUsers;
};

type AdminAuditLog = {
    id: string;
    action: string;
    announcementId?: string;
    title?: string;
    userId?: string;
    note?: string;
    metadata?: Record<string, any>;
    createdAt: string;
};

type AdminSummary = {
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

type CommunityEntityType = 'forum' | 'qa' | 'group';

type CommunityFlag = {
    id: string;
    entityType: CommunityEntityType;
    entityId: string;
    reason: string;
    reporter?: string | null;
    status: 'open' | 'reviewed' | 'resolved';
    createdAt: string;
};

type CommunityForumPost = {
    id: string;
    title: string;
    content: string;
    category: string;
    author: string;
    createdAt: string;
};

type CommunityQaThread = {
    id: string;
    question: string;
    answer?: string | null;
    answeredBy?: string | null;
    author: string;
    createdAt: string;
};

type CommunityStudyGroup = {
    id: string;
    name: string;
    topic: string;
    language: string;
    link?: string | null;
    createdAt: string;
};

type ToastTone = 'success' | 'error' | 'info';
type Toast = {
    id: string;
    message: string;
    tone: ToastTone;
};

type ErrorReportStatus = 'new' | 'triaged' | 'resolved';
type ErrorReport = {
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

type AdminSession = {
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

type BackupCodesStatus = {
    total: number;
    remaining: number;
    updatedAt: string | null;
};

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
    { value: 'job', label: 'Latest Jobs' },
    { value: 'admit-card', label: 'Admit Cards' },
    { value: 'result', label: 'Latest Results' },
    { value: 'admission', label: 'Admissions' },
    { value: 'syllabus', label: 'Syllabus' },
    { value: 'answer-key', label: 'Answer Keys' },
];

const CATEGORY_OPTIONS: Array<{ value: string; label: string; icon: string }> = [
    { value: 'Central Government', label: 'Central Government', icon: '🏛️' },
    { value: 'State Government', label: 'State Government', icon: '🏢' },
    { value: 'Banking', label: 'Banking', icon: '🏦' },
    { value: 'Railways', label: 'Railways', icon: '🚆' },
    { value: 'Defence', label: 'Defence', icon: '🛡️' },
    { value: 'PSU', label: 'PSU', icon: '⚡' },
    { value: 'University', label: 'University', icon: '🎓' },
    { value: 'Police', label: 'Police', icon: '🚓' },
];

const LIST_FILTER_STORAGE_KEY = 'adminListFilters';
const LIST_FILTER_PRESETS_KEY = 'adminListFilterPresets';
const ADMIN_USER_STORAGE_KEY = 'adminUserProfile';
const ADMIN_TIMEZONE_KEY = 'adminTimezoneMode';
const ADMIN_SIDEBAR_KEY = 'adminSidebarCollapsed';

type TimeZoneMode = 'local' | 'ist' | 'utc';

type ListFilterState = {
    query?: string;
    type?: ContentType | 'all';
    status?: AnnouncementStatus | 'all';
    sort?: 'newest' | 'oldest' | 'updated' | 'deadline' | 'views';
};

type ListFilterPreset = ListFilterState & {
    id: string;
    label: string;
};

type ReviewPreviewState = {
    action: 'approve' | 'reject' | 'schedule';
    payload: { ids: string[]; note?: string; scheduleAt?: string };
    result: ReviewPreviewResult;
};

type BulkPreviewState = {
    payload: Record<string, any>;
    result: BulkPreviewResult;
};

const loadListFilters = (): ListFilterState | null => {
    try {
        const raw = localStorage.getItem(LIST_FILTER_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as ListFilterState;
    } catch {
        return null;
    }
};

const loadListFilterPresets = (): ListFilterPreset[] => {
    try {
        const raw = localStorage.getItem(LIST_FILTER_PRESETS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((preset) => preset && typeof preset === 'object')
            .map((preset) => ({
                id: String(preset.id || crypto.randomUUID()),
                label: String(preset.label || 'Untitled preset'),
                query: typeof preset.query === 'string' ? preset.query : '',
                type: preset.type === 'all' || CONTENT_TYPES.some((item) => item.value === preset.type) ? preset.type : 'all',
                status: preset.status === 'all' || STATUS_OPTIONS.some((item) => item.value === preset.status) ? preset.status : 'all',
                sort: preset.sort === 'updated' || preset.sort === 'deadline' || preset.sort === 'views' || preset.sort === 'oldest' ? preset.sort : 'newest',
            }));
    } catch {
        return [];
    }
};

type AdminUserProfile = {
    name?: string;
    email?: string;
    role?: string;
};

type AdminTab =
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

const ADMIN_TAB_META: Record<AdminTab, { label: string; description: string }> = {
    analytics: {
        label: 'Analytics Command Center',
        description: 'Track traffic, conversions, and listing performance in real time.',
    },
    list: {
        label: 'All Announcements',
        description: 'Filter, audit, and edit every listing across categories.',
    },
    review: {
        label: 'Review Queue',
        description: 'Triage pending posts, QA alerts, and approvals in one pipeline.',
    },
    add: {
        label: 'Quick Add',
        description: 'Publish fast updates with lightweight form controls.',
    },
    detailed: {
        label: 'Detailed Post',
        description: 'Craft full listings with structured details, eligibility, and links.',
    },
    bulk: {
        label: 'Bulk Import',
        description: 'Apply bulk updates, scheduling, and status changes safely.',
    },
    queue: {
        label: 'Schedule Queue',
        description: 'Monitor scheduled releases and publish time-sensitive notices.',
    },
    users: {
        label: 'User Insights',
        description: 'Understand subscriber growth, activity, and cohorts.',
    },
    community: {
        label: 'Community Moderation',
        description: 'Resolve flags, forums, QA, and study group activity.',
    },
    errors: {
        label: 'Error Reports',
        description: 'Review client error logs and respond quickly to regressions.',
    },
    audit: {
        label: 'Audit Log',
        description: 'Trace admin actions for accountability and compliance.',
    },
    security: {
        label: 'Security Center',
        description: 'Manage access policies, sessions, and risk alerts.',
    },
};

const READ_ONLY_MESSAGE = 'Read-only role: changes are restricted for your account.';

const TAB_PERMISSION_MAP: Record<AdminTab, AdminPermission> = {
    analytics: 'analytics:read',
    list: 'announcements:read',
    review: 'announcements:approve',
    add: 'announcements:write',
    detailed: 'announcements:write',
    bulk: 'announcements:write',
    queue: 'announcements:read',
    security: 'security:read',
    users: 'analytics:read',
    audit: 'audit:read',
    community: 'admin:read',
    errors: 'admin:read',
};

const getNumber = (value: unknown, fallback = 0): number => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const asArray = <T,>(value: unknown): T[] => {
    return Array.isArray(value) ? (value as T[]) : [];
};

const normalizeDashboardData = (value: unknown): DashboardData => {
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

const normalizeAdminSummary = (value: unknown): AdminSummary => {
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

const loadAdminUser = (): AdminUserProfile | null => {
    try {
        const raw = localStorage.getItem(ADMIN_USER_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as AdminUserProfile;
    } catch {
        return null;
    }
};

const loadTimeZoneMode = (): TimeZoneMode => {
    try {
        const raw = localStorage.getItem(ADMIN_TIMEZONE_KEY);
        if (raw === 'local' || raw === 'ist' || raw === 'utc') return raw;
    } catch {
        // ignore
    }
    return 'local';
};

const loadSidebarCollapsed = (): boolean => {
    try {
        const raw = localStorage.getItem(ADMIN_SIDEBAR_KEY);
        return raw === '1';
    } catch {
        return false;
    }
};


const STATUS_OPTIONS: { value: AnnouncementStatus; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending Review' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
];

const AUDIT_ACTIONS = [
    'create',
    'update',
    'delete',
    'approve',
    'reject',
    'bulk_update',
    'bulk_approve',
    'bulk_reject',
];

const ACTIVE_USER_WINDOWS = [15, 30, 60, 120];

const REVIEW_NOTE_TEMPLATES = [
    { id: 'approve_clean', label: 'Approve: QA verified', value: 'QA verified. Ready for publish.' },
    { id: 'approve_fast', label: 'Approve: Time-sensitive', value: 'Time-sensitive update. Publishing now.' },
    { id: 'reject_missing_docs', label: 'Reject: Missing details', value: 'Rejected: Missing mandatory details and official references.' },
    { id: 'reject_link_invalid', label: 'Reject: Invalid link', value: 'Rejected: Official link invalid or unreachable.' },
];

const DEFAULT_FORM_DATA = {
    title: '',
    type: 'job' as ContentType,
    category: 'Central Government',
    organization: '',
    externalLink: '',
    location: 'All India',
    deadline: '',
    totalPosts: '',
    minQualification: '',
    ageLimit: '',
    applicationFee: '',
    salaryMin: '',
    salaryMax: '',
    difficulty: '' as '' | 'easy' | 'medium' | 'hard',
    cutoffMarks: '',
    status: 'published' as AnnouncementStatus,
    publishAt: '',
};


export function AdminPage() {
    const {
        notifications,
        removeNotification,
        notifySuccess,
        notifyError,
        notifyWarning,
        notifyInfo,
    } = useAdminNotifications();

    const { themeMode, setThemeMode } = useTheme();
    const { user, hasAdminPortalAccess, can, logout } = useAuth();
    const adminUiFlags = useAdminUiFlags();
    const enableAdminNavUx = adminUiFlags.admin_nav_ux_v2;
    const enableAdminAnalyticsUx = adminUiFlags.admin_analytics_ux_v2;
    const enableAdminListsUx = adminUiFlags.admin_lists_ux_v2;
    const enableAdminListsV3 = adminUiFlags.admin_lists_v3;
    const enableAdminReviewV3 = adminUiFlags.admin_review_v3;
    const enableAdminAnalyticsV3 = adminUiFlags.admin_analytics_v3;
    const enableAdminCommandPalette = adminUiFlags.admin_command_palette_v1;
    const canReadAdmin = hasAdminPortalAccess && can('admin:read');
    const canWriteAnnouncements = can('announcements:write');
    const canDeleteAnnouncements = can('announcements:delete');
    const canApproveAnnouncements = can('announcements:approve');
    const canWriteAdmin = can('admin:write');
    const canAccessTab = useCallback((tab: AdminTab) => can(TAB_PERMISSION_MAP[tab]), [can]);
    const [timeZoneMode, setTimeZoneMode] = useState<TimeZoneMode>(() => loadTimeZoneMode());
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => loadSidebarCollapsed());
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [touchedFields, setTouchedFields] = useState({
        title: false,
        organization: false,
        deadline: false,
        publishAt: false,
        externalLink: false,
    });

    const [isLoggedIn, setIsLoggedIn] = useState(() => canReadAdmin);
    const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('analytics');
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [adminUser, setAdminUser] = useState<AdminUserProfile | null>(() => loadAdminUser());
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [listAnnouncements, setListAnnouncements] = useState<Announcement[]>([]);
    const [listTotal, setListTotal] = useState(0);
    const [listPresets, setListPresets] = useState<ListFilterPreset[]>(() => loadListFilterPresets());
    const [selectedPresetId, setSelectedPresetId] = useState('');
    const [activeQuickMode, setActiveQuickMode] = useState<string>('');
    const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
    const storedFilters = useMemo(() => loadListFilters(), []);
    const [listQuery, setListQuery] = useState(storedFilters?.query ?? '');
    const [debouncedListQuery, setDebouncedListQuery] = useState(listQuery);
    const [listTypeFilter, setListTypeFilter] = useState<ContentType | 'all'>(storedFilters?.type ?? 'all');
    const [listSort, setListSort] = useState<'newest' | 'oldest' | 'updated' | 'deadline' | 'views'>(storedFilters?.sort ?? 'newest');
    const [listPage, setListPage] = useState(1);
    const [categorySearch, setCategorySearch] = useState('');

    const [listStatusFilter, setListStatusFilter] = useState<AnnouncementStatus | 'all'>(storedFilters?.status ?? 'all');
    const [listLoading, setListLoading] = useState(false);
    const [listUpdatedAt, setListUpdatedAt] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkPreview, setBulkPreview] = useState<BulkPreviewState | null>(null);
    const [bulkApplying, setBulkApplying] = useState(false);
    const [bulkStatus, setBulkStatus] = useState<AnnouncementStatus | ''>('');
    const [bulkPublishAt, setBulkPublishAt] = useState('');
    const [bulkIsActive, setBulkIsActive] = useState<'keep' | 'active' | 'inactive'>('keep');
    const [, setBulkLoading] = useState(false);
    const [qaBulkLoading, setQaBulkLoading] = useState(false);
    const [reviewPreview, setReviewPreview] = useState<ReviewPreviewState | null>(null);
    const [reviewBulkNote, setReviewBulkNote] = useState('');
    const [selectedReviewTemplate, setSelectedReviewTemplate] = useState('');
    const [reviewScheduleAt, setReviewScheduleAt] = useState('');
    const [reviewLoading, setReviewLoading] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [commandPaletteQuery, setCommandPaletteQuery] = useState('');
    const [activeUsers, setActiveUsers] = useState<{
        windowMinutes: number;
        since: string;
        total: number;
        authenticated: number;
        anonymous: number;
        admins: number;
    } | null>(null);
    const [activeUsersWindow, setActiveUsersWindow] = useState(15);
    const [activeUsersLoading, setActiveUsersLoading] = useState(false);
    const [activeUsersError, setActiveUsersError] = useState<string | null>(null);
    const [activeUsersUpdatedAt, setActiveUsersUpdatedAt] = useState<string | null>(null);
    const [versionTarget, setVersionTarget] = useState<Announcement | null>(null);
    const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const [dashboardError, setDashboardError] = useState<string | null>(null);
    const [dashboardUpdatedAt, setDashboardUpdatedAt] = useState<string | null>(null);
    const [adminSummary, setAdminSummary] = useState<AdminSummary | null>(null);
    const [adminSummaryLoading, setAdminSummaryLoading] = useState(false);
    const [adminSummaryError, setAdminSummaryError] = useState<string | null>(null);
    const [adminSummaryUpdatedAt, setAdminSummaryUpdatedAt] = useState<string | null>(null);
    const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditError, setAuditError] = useState<string | null>(null);
    const [auditUpdatedAt, setAuditUpdatedAt] = useState<string | null>(null);
    const [auditLimit, setAuditLimit] = useState(50);
    const [auditPage, setAuditPage] = useState(1);
    const [auditTotal, setAuditTotal] = useState(0);
    const [auditFilters, setAuditFilters] = useState({
        userId: '',
        action: '',
        start: '',
        end: '',
    });
    const [mutatingIds, setMutatingIds] = useState<Set<string>>(new Set());
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [pendingEditId, setPendingEditId] = useState<string | null>(null);
    const listRequestInFlight = useRef(false);
    const listLastFetchAt = useRef(0);
    const listRateLimitUntil = useRef(0);
    const hasTrackedFilterRef = useRef(false);
    const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
    const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);
    const [communityTab, setCommunityTab] = useState<'flags' | 'forums' | 'qa' | 'groups'>('flags');
    const [communityFlags, setCommunityFlags] = useState<CommunityFlag[]>([]);
    const [communityForums, setCommunityForums] = useState<CommunityForumPost[]>([]);
    const [communityQa, setCommunityQa] = useState<CommunityQaThread[]>([]);
    const [communityGroups, setCommunityGroups] = useState<CommunityStudyGroup[]>([]);
    const [communityLoading, setCommunityLoading] = useState(false);
    const [communityError, setCommunityError] = useState<string | null>(null);
    const [communityUpdatedAt, setCommunityUpdatedAt] = useState<string | null>(null);
    const [flagFilter, setFlagFilter] = useState<'all' | 'open' | 'reviewed' | 'resolved'>('open');
    const [qaAnswerDrafts, setQaAnswerDrafts] = useState<Record<string, string>>({});
    const [communityMutatingIds, setCommunityMutatingIds] = useState<Set<string>>(new Set());
    const [errorReports, setErrorReports] = useState<ErrorReport[]>([]);
    const [errorReportsLoading, setErrorReportsLoading] = useState(false);
    const [errorReportsError, setErrorReportsError] = useState<string | null>(null);
    const [errorReportsUpdatedAt, setErrorReportsUpdatedAt] = useState<string | null>(null);
    const [errorReportStatusFilter, setErrorReportStatusFilter] = useState<ErrorReportStatus | 'all'>('new');
    const [errorReportNotes, setErrorReportNotes] = useState<Record<string, string>>({});
    const [errorReportQuery, setErrorReportQuery] = useState('');
    const [sessions, setSessions] = useState<AdminSession[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [sessionsError, setSessionsError] = useState<string | null>(null);
    const [backupCodesStatus, setBackupCodesStatus] = useState<BackupCodesStatus | null>(null);
    const [backupCodesLoading, setBackupCodesLoading] = useState(false);
    const [backupCodesModal, setBackupCodesModal] = useState<{ codes: string[]; generatedAt: string } | null>(null);

    const pageSize = 15;
    const auditTotalPages = Math.max(1, Math.ceil(auditTotal / auditLimit));
    const auditStartIndex = auditTotal === 0 ? 0 : (auditPage - 1) * auditLimit + 1;
    const auditEndIndex = Math.min(auditTotal, auditPage * auditLimit);
    const overview = dashboard?.overview;
    const heroTotalPosts = overview?.totalAnnouncements ?? announcements.length;
    const heroTotalViews = overview?.totalViews ?? 0;
    const heroActiveJobs = overview?.activeJobs ?? 0;
    const heroNewThisWeek = overview?.newThisWeek ?? 0;
    const heroExpiringSoon = overview?.expiringSoon ?? 0;
    const timeZoneId = timeZoneMode === 'local' ? undefined : timeZoneMode === 'ist' ? 'Asia/Kolkata' : 'UTC';
    const timeZoneLabel = timeZoneMode === 'local' ? 'Local' : timeZoneMode === 'ist' ? 'IST' : 'UTC';
    const currentSession = useMemo(() => sessions.find((session) => session.isCurrentSession), [sessions]);
    const activeSessionCount = useMemo(() => sessions.filter((session) => session.isActive).length, [sessions]);
    const highRiskSessionCount = useMemo(() => sessions.filter((session) => session.riskScore === 'high').length, [sessions]);

    useEffect(() => {
        localStorage.setItem(ADMIN_TIMEZONE_KEY, timeZoneMode);
    }, [timeZoneMode]);

    useEffect(() => {
        localStorage.setItem(ADMIN_SIDEBAR_KEY, isSidebarCollapsed ? '1' : '0');
    }, [isSidebarCollapsed]);

    const pushToast = useCallback((message: string, tone: ToastTone = 'info') => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts((prev) => [...prev, { id, message, tone }]);
        window.setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 3000);
    }, []);

    const trackAdminEvent = useCallback((
        type: 'admin_list_loaded' | 'admin_filter_applied' | 'admin_row_action_clicked' | 'admin_review_decision_submitted' | 'admin_bulk_preview_opened' | 'admin_metric_drilldown_opened',
        metadata: Record<string, unknown> = {}
    ) => {
        trackAdminTelemetry(
            {
                type,
                metadata: {
                    tab: activeAdminTab,
                    role: user?.role || 'unknown',
                    ...metadata,
                },
            },
            localStorage.getItem('token') || localStorage.getItem('adminToken')
        );
    }, [activeAdminTab, user?.role]);

    const handleNavSelect = useCallback((tab: AdminTab) => {
        if (!canAccessTab(tab)) {
            setMessage(READ_ONLY_MESSAGE);
            pushToast(READ_ONLY_MESSAGE, 'error');
            return;
        }
        setActiveAdminTab(tab);
        setIsNavOpen(false);
    }, [canAccessTab, pushToast]);

    const handleShellSearch = useCallback((query: string) => {
        setListQuery(query);
        setListPage(1);
        if (activeAdminTab !== 'list') {
            handleNavSelect('list');
        }
        window.setTimeout(() => {
            const target = document.getElementById('admin-list-search') as HTMLInputElement | null;
            target?.focus();
        }, 0);
    }, [activeAdminTab, handleNavSelect]);

    const clearAdminSession = useCallback(() => {
        setIsLoggedIn(false);
        setAdminUser(null);
        setSessions([]);
        setSessionsError(null);
        setBackupCodesStatus(null);
        setBackupCodesModal(null);
        localStorage.removeItem('adminToken');
        localStorage.removeItem(ADMIN_USER_STORAGE_KEY);
        setActiveAdminTab('analytics');
    }, []);

    useEffect(() => {
        if (!canReadAdmin || !user) {
            clearAdminSession();
            return;
        }
        const profile: AdminUserProfile = {
            name: user.username || user.email || 'Admin',
            email: user.email,
            role: user.role,
        };
        setAdminUser(profile);
        localStorage.setItem(ADMIN_USER_STORAGE_KEY, JSON.stringify(profile));
        setIsLoggedIn(true);
    }, [canReadAdmin, clearAdminSession, user]);

    // Keyboard shortcuts for admin panel
    const keyboardShortcuts: KeyboardShortcut[] = useMemo(() => [
        {
            key: 'n',
            ctrl: true,
            handler: () => {
                if (isLoggedIn && canWriteAnnouncements) {
                    setActiveAdminTab('add');
                    setFormData({ ...DEFAULT_FORM_DATA });
                    setEditingId(null);
                }
            },
            description: 'Create new announcement',
        },
        {
            key: 'Escape',
            handler: () => {
                // Go back to dashboard on Escape
                if (activeAdminTab !== 'analytics') {
                    setActiveAdminTab('analytics');
                }
            },
            description: 'Go to dashboard',
        },
        {
            key: 'l',
            ctrl: true,
            handler: () => {
                if (isLoggedIn && canAccessTab('list')) setActiveAdminTab('list');
            },
            description: 'Go to list view',
        },
        ...(enableAdminCommandPalette
            ? [{
                key: 'k',
                ctrl: true,
                handler: () => {
                    if (!isLoggedIn) return;
                    setIsCommandPaletteOpen(true);
                },
                description: 'Open command palette',
            } satisfies KeyboardShortcut]
            : []),
    ], [
        isLoggedIn,
        activeAdminTab,
        canWriteAnnouncements,
        canAccessTab,
        enableAdminCommandPalette,
    ]);

    useKeyboardShortcuts(keyboardShortcuts, isLoggedIn);

    const handleUnauthorized = useCallback((reason = 'Session expired. Please log in again.') => {
        clearAdminSession();
        setMessage(reason);
        pushToast(reason, 'error');
    }, [clearAdminSession, pushToast]);

    const canMutateEndpoint = useCallback((method: string, pathname: string): boolean => {
        if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
        if (pathname.includes('/api/admin/announcements/bulk-approve') || pathname.includes('/api/admin/announcements/bulk-reject')) {
            return canApproveAnnouncements;
        }
        if (pathname.match(/\/api\/admin\/announcements\/[^/]+\/(approve|reject)$/)) {
            return canApproveAnnouncements;
        }
        if (pathname.includes('/api/admin/announcements') && method === 'DELETE') {
            return canDeleteAnnouncements;
        }
        if (pathname.includes('/api/admin/announcements') || pathname.includes('/api/bulk/import')) {
            return canWriteAnnouncements;
        }
        if (
            pathname.includes('/api/community') ||
            pathname.includes('/api/support/error-reports') ||
            pathname.includes('/api/auth/admin/sessions') ||
            pathname.includes('/api/auth/admin/ip-allowlist')
        ) {
            return canWriteAdmin;
        }
        return canWriteAnnouncements || canApproveAnnouncements || canDeleteAnnouncements || canWriteAdmin;
    }, [canApproveAnnouncements, canDeleteAnnouncements, canWriteAdmin, canWriteAnnouncements]);

    const resolveRequestPath = useCallback((input: RequestInfo | URL): string => {
        try {
            if (typeof input === 'string') {
                return new URL(input, window.location.origin).pathname;
            }
            if (input instanceof URL) {
                return input.pathname;
            }
            if (input instanceof Request) {
                return new URL(input.url, window.location.origin).pathname;
            }
        } catch {
            // ignore parse errors
        }
        return '';
    }, []);

    const adminFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
        const method = (init?.method ?? 'GET').toUpperCase();
        const path = resolveRequestPath(input);

        if (!canMutateEndpoint(method, path)) {
            setMessage(READ_ONLY_MESSAGE);
            pushToast(READ_ONLY_MESSAGE, 'error');
            return new Response(
                JSON.stringify({ error: 'forbidden', message: READ_ONLY_MESSAGE }),
                { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const headers = new Headers(init?.headers ?? {});
        if (method !== 'GET' && method !== 'HEAD' && !headers.has('Idempotency-Key')) {
            headers.set('Idempotency-Key', crypto.randomUUID());
        }
        const response = await adminRequest(input, {
            ...init,
            headers,
            maxRetries: method === 'GET' ? 2 : 0,
            onRateLimit: (rateLimitResponse) => {
                const retryAfter = rateLimitResponse.headers.get('Retry-After');
                const retrySeconds = retryAfter && Number.isFinite(Number(retryAfter))
                    ? Number(retryAfter)
                    : 60;
                const message = retryAfter
                    ? `Too many requests. Try again in ${retrySeconds}s.`
                    : 'Too many requests. Please wait and try again.';
                setRateLimitUntil((current) => {
                    const nextUntil = Date.now() + retrySeconds * 1000;
                    return current ? Math.max(current, nextUntil) : nextUntil;
                });
                setMessage(message);
            },
        });
        if (response.status === 401) {
            handleUnauthorized();
        }
        return response;
    }, [canMutateEndpoint, handleUnauthorized, pushToast, resolveRequestPath]);

    useEffect(() => {
        if (!rateLimitUntil) {
            setRateLimitRemaining(null);
            return;
        }
        const tick = () => {
            const remainingMs = rateLimitUntil - Date.now();
            if (remainingMs <= 0) {
                setRateLimitUntil(null);
                setRateLimitRemaining(null);
                return;
            }
            setRateLimitRemaining(Math.ceil(remainingMs / 1000));
        };
        tick();
        const timer = window.setInterval(tick, 1000);
        return () => window.clearInterval(timer);
    }, [rateLimitUntil]);

    const handleLogout = useCallback(async () => {
        setMessage('');

        notifyInfo('Logging out...', 'Ending your admin session securely.', 1500);

        try {
            await logout();
        } catch (error) {
            console.error('Logout API call failed:', error);
            notifyWarning('Logout Warning', 'Session cleared locally. Server logout may have failed.');
        }

        clearAdminSession();
        pushToast('Logged out successfully.', 'info');

        notifySuccess(
            'Logout Successful',
            'You have been safely logged out. Redirecting to login page...',
            3000
        );
    }, [clearAdminSession, logout, pushToast, notifyInfo, notifySuccess, notifyWarning]);

    const checkSession = useCallback(async () => {
        if (!user || !canReadAdmin || !isAdminPortalRole(user.role)) {
            clearAdminSession();
            return;
        }
        const profile: AdminUserProfile = {
            name: user.username || user.email || 'Admin',
            email: user.email,
            role: user.role,
        };
        setAdminUser(profile);
        localStorage.setItem(ADMIN_USER_STORAGE_KEY, JSON.stringify(profile));
        setIsLoggedIn(true);
    }, [canReadAdmin, clearAdminSession, user]);

    const [formData, setFormData] = useState(() => ({ ...DEFAULT_FORM_DATA }));
    const [message, setMessage] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [bulkJson, setBulkJson] = useState('');

    const filteredCategories = useMemo(() => {
        const query = categorySearch.trim().toLowerCase();
        if (!query) return CATEGORY_OPTIONS;
        return CATEGORY_OPTIONS.filter((option) =>
            option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query)
        );
    }, [categorySearch]);
    const categoryOptions = useMemo(() => {
        const current = formData.category;
        if (current && !filteredCategories.some((option) => option.value === current)) {
            return [{ value: current, label: current, icon: '🔖' }, ...filteredCategories];
        }
        return filteredCategories;
    }, [filteredCategories, formData.category]);

    // Preview mode state
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState<{ formData: typeof formData; jobDetails: JobDetails | null } | null>(null);

    // Fetch data
    const refreshData = async () => {
        if (!isLoggedIn) return;
        setListLoading(true);
        try {
            const params = new URLSearchParams({
                limit: '500',
                offset: '0',
                includeInactive: 'true',
            });
            const res = await adminFetch(`${apiBase}/api/admin/announcements?${params.toString()}`);
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Failed to load announcements.'));
                return;
            }
            const data = await res.json();
            setAnnouncements(asArray<Announcement>(data.data));
            setListUpdatedAt(new Date().toISOString());
            refreshAdminSummary();
        } catch (e) {
            console.error(e);
            setMessage('Failed to load announcements.');
        } finally {
            setListLoading(false);
        }
    };

    const refreshListData = useCallback(async (options?: { force?: boolean }) => {
        if (!isLoggedIn) return;
        const now = Date.now();
        if (!options?.force) {
            if (listRequestInFlight.current) return;
            if (now < listRateLimitUntil.current) return;
            if (now - listLastFetchAt.current < 800) return;
        }
        listRequestInFlight.current = true;
        listLastFetchAt.current = now;
        setListLoading(true);
        try {
            const params = new URLSearchParams({
                limit: String(pageSize),
                offset: String((listPage - 1) * pageSize),
                includeInactive: 'true',
                sort: listSort,
            });
            if (listStatusFilter !== 'all') params.set('status', listStatusFilter);
            if (listTypeFilter !== 'all') params.set('type', listTypeFilter);
            if (debouncedListQuery.trim()) params.set('search', debouncedListQuery.trim());
            const res = await adminFetch(`${apiBase}/api/admin/announcements?${params.toString()}`);
            if (res.status === 429) {
                const retryAfter = res.headers.get('Retry-After');
                const waitMs = retryAfter && Number.isFinite(Number(retryAfter))
                    ? Number(retryAfter) * 1000
                    : 60_000;
                listRateLimitUntil.current = Date.now() + waitMs;
            }
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Failed to load announcements.'));
                return;
            }
            const data = await res.json();
            setListAnnouncements(asArray<Announcement>(data.data));
            const total = getNumber(data.meta?.total ?? data.total ?? data.count ?? data.data?.length, 0);
            setListTotal(total);
            setListUpdatedAt(new Date().toISOString());
            trackAdminEvent('admin_list_loaded', {
                total,
                page: listPage,
                query: debouncedListQuery.trim(),
                type: listTypeFilter,
                status: listStatusFilter,
                sort: listSort,
            });
        } catch (error) {
            console.error(error);
            setMessage('Failed to load announcements.');
        } finally {
            listRequestInFlight.current = false;
            setListLoading(false);
        }
    }, [adminFetch, debouncedListQuery, isLoggedIn, listPage, listSort, listStatusFilter, listTypeFilter, pageSize, trackAdminEvent]);

    const refreshActiveUsers = async () => {
        if (!isLoggedIn) return;
        setActiveUsersLoading(true);
        setActiveUsersError(null);
        try {
            const res = await adminFetch(`${apiBase}/api/admin/active-users?windowMinutes=${activeUsersWindow}`);
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                setActiveUsers(null);
                setActiveUsersError(getApiErrorMessage(errorBody, 'Unable to load active users.'));
                return;
            }
            const data = await res.json();
            const raw = (data.data ?? {}) as Record<string, unknown>;
            setActiveUsers({
                windowMinutes: getNumber(raw.windowMinutes, activeUsersWindow),
                since: typeof raw.since === 'string' ? raw.since : new Date().toISOString(),
                total: getNumber(raw.total),
                authenticated: getNumber(raw.authenticated),
                anonymous: getNumber(raw.anonymous),
                admins: getNumber(raw.admins),
            });
            setActiveUsersUpdatedAt(new Date().toISOString());
        } catch (error) {
            console.error(error);
            setActiveUsers(null);
            setActiveUsersError('Unable to load active users.');
        } finally {
            setActiveUsersLoading(false);
        }
    };
    const refreshDashboard = async () => {
        if (!isLoggedIn) return;
        setDashboardLoading(true);
        setDashboardError(null);
        try {
            const res = await adminFetch(`${apiBase}/api/admin/dashboard`);
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                setDashboardError(getApiErrorMessage(errorBody, 'Failed to load user analytics.'));
                setDashboard(normalizeDashboardData(null));
                return;
            }
            const payload = await res.json();
            setDashboard(normalizeDashboardData(payload.data));
            setDashboardUpdatedAt(new Date().toISOString());
        } catch (error) {
            console.error(error);
            setDashboardError('Failed to load user analytics.');
        } finally {
            setDashboardLoading(false);
        }
    };

    const refreshAdminSummary = async () => {
        if (!isLoggedIn) return;
        setAdminSummaryLoading(true);
        setAdminSummaryError(null);
        try {
            const res = await adminFetch(`${apiBase}/api/admin/announcements/summary?includeInactive=true`);
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                setAdminSummaryError(getApiErrorMessage(errorBody, 'Failed to load admin summary.'));
                setAdminSummary(normalizeAdminSummary(null));
                return;
            }
            const payload = await res.json();
            setAdminSummary(normalizeAdminSummary(payload.data));
            setAdminSummaryUpdatedAt(new Date().toISOString());
        } catch (error) {
            console.error(error);
            setAdminSummaryError('Failed to load admin summary.');
        } finally {
            setAdminSummaryLoading(false);
        }
    };

    const refreshSessions = async () => {
        if (!isLoggedIn) return;
        setSessionsLoading(true);
        setSessionsError(null);
        try {
            const res = await adminFetch(`${apiBase}/api/admin/sessions`);
            if (!res.ok) {
                if (res.status === 401) {
                    handleUnauthorized();
                    return;
                }
                const errorBody = await res.json().catch(() => ({}));
                setSessionsError(getApiErrorMessage(errorBody, 'Failed to load sessions.'));
                setSessions([]);
                return;
            }
            const payload = await res.json();
            setSessions(asArray<AdminSession>(payload.data));
        } catch (error) {
            console.error(error);
            setSessionsError('Failed to load sessions.');
            setSessions([]);
        } finally {
            setSessionsLoading(false);
        }
    };

    const terminateSession = async (sessionId: string) => {
        if (!canWriteAdmin) {
            setMessage(READ_ONLY_MESSAGE);
            return;
        }
        const res = await adminFetch(`${apiBase}/api/admin/sessions/terminate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
        });
        if (res.status === 401) {
            handleUnauthorized();
            return;
        }
        if (!res.ok) {
            const errorBody = await res.json().catch(() => ({}));
            pushToast(getApiErrorMessage(errorBody, 'Failed to terminate session.'), 'error');
            return;
        }
        pushToast('Session terminated.', 'success');
        refreshSessions();
    };

    const terminateOtherSessions = async () => {
        if (!canWriteAdmin) {
            setMessage(READ_ONLY_MESSAGE);
            return;
        }
        const res = await adminFetch(`${apiBase}/api/admin/sessions/terminate-others`, {
            method: 'POST',
        });
        if (res.status === 401) {
            handleUnauthorized();
            return;
        }
        if (!res.ok) {
            const errorBody = await res.json().catch(() => ({}));
            pushToast(getApiErrorMessage(errorBody, 'Failed to terminate other sessions.'), 'error');
            return;
        }
        pushToast('Other sessions terminated.', 'success');
        refreshSessions();
    };

    const refreshBackupCodesStatus = async () => {
        if (!isLoggedIn) return;
        try {
            const res = await adminFetch(`${apiBase}/api/auth/admin/2fa/backup-codes/status`);
            if (res.status === 401) {
                return;
            }
            if (!res.ok) {
                setBackupCodesStatus(null);
                return;
            }
            const payload = await res.json();
            const raw = (payload.data ?? {}) as Record<string, unknown>;
            setBackupCodesStatus({
                total: getNumber(raw.total),
                remaining: getNumber(raw.remaining),
                updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const generateBackupCodes = async () => {
        if (!canWriteAdmin) {
            setMessage(READ_ONLY_MESSAGE);
            return;
        }
        setBackupCodesLoading(true);
        try {
            const res = await adminFetch(`${apiBase}/api/auth/admin/2fa/backup-codes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            if (res.status === 401) {
                handleUnauthorized();
                return;
            }
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                pushToast(getApiErrorMessage(errorBody, 'Failed to generate backup codes.'), 'error');
                return;
            }
            const payload = await res.json();
            const codes = payload.data?.codes ?? [];
            if (codes.length) {
                setBackupCodesModal({ codes, generatedAt: payload.data?.generatedAt ?? new Date().toISOString() });
                pushToast('Backup codes generated.', 'success');
                refreshBackupCodesStatus();
            }
        } catch (error) {
            console.error(error);
            pushToast('Failed to generate backup codes.', 'error');
        } finally {
            setBackupCodesLoading(false);
        }
    };

    const downloadBackupCodes = (codes: string[]) => {
        const content = [
            'SarkariExams Admin Backup Codes',
            `Generated: ${new Date().toLocaleString()}`,
            '',
            ...codes,
        ].join('\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sarkariexams-backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    const copyBackupCodes = async (codes: string[]) => {
        try {
            await navigator.clipboard.writeText(codes.join('\n'));
            pushToast('Backup codes copied to clipboard.', 'success');
        } catch (error) {
            console.error(error);
            pushToast('Failed to copy backup codes.', 'error');
        }
    };

    const refreshAuditLogs = async (pageOverride?: number) => {
        if (!isLoggedIn) return;
        setAuditLoading(true);
        setAuditError(null);
        try {
            const page = pageOverride ?? auditPage;
            const params = new URLSearchParams({
                limit: String(auditLimit),
                offset: String(Math.max(0, (page - 1) * auditLimit)),
            });
            if (auditFilters.userId) params.set('userId', auditFilters.userId);
            if (auditFilters.action) params.set('action', auditFilters.action);
            if (auditFilters.start) params.set('start', auditFilters.start);
            if (auditFilters.end) params.set('end', auditFilters.end);

            const res = await adminFetch(`${apiBase}/api/admin/audit-log?${params.toString()}`);
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                setAuditError(getApiErrorMessage(errorBody, 'Failed to load audit log.'));
                setAuditLogs([]);
                setAuditTotal(0);
                return;
            }
            const payload = await res.json();
            setAuditLogs(asArray<AdminAuditLog>(payload.data));
            setAuditTotal(getNumber(payload.meta?.total ?? payload.total ?? payload.count ?? payload.data?.length, 0));
            setAuditUpdatedAt(new Date().toISOString());
            if (pageOverride) {
                setAuditPage(pageOverride);
            }
        } catch (error) {
            console.error(error);
            setAuditError('Failed to load audit log.');
            setAuditLogs([]);
            setAuditTotal(0);
        } finally {
            setAuditLoading(false);
        }
    };

    const refreshErrorReports = async () => {
        if (!isLoggedIn) return;
        setErrorReportsLoading(true);
        setErrorReportsError(null);
        try {
            const params = new URLSearchParams({
                limit: '30',
                offset: '0',
            });
            if (errorReportStatusFilter !== 'all') {
                params.set('status', errorReportStatusFilter);
            }
            const trimmedQuery = errorReportQuery.trim();
            if (trimmedQuery) {
                params.set('errorId', trimmedQuery);
            }
            const res = await adminFetch(`${apiBase}/api/support/error-reports?${params.toString()}`);
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                setErrorReportsError(getApiErrorMessage(errorBody, 'Failed to load error reports.'));
                return;
            }
            const payload = await res.json();
            setErrorReports(asArray<ErrorReport>(payload.data));
            setErrorReportsUpdatedAt(new Date().toISOString());
        } catch (error) {
            console.error(error);
            setErrorReportsError('Failed to load error reports.');
        } finally {
            setErrorReportsLoading(false);
        }
    };

    const updateErrorReport = async (id: string, status: ErrorReportStatus) => {
        if (!canWriteAdmin) {
            setMessage(READ_ONLY_MESSAGE);
            return;
        }
        if (!isLoggedIn) return;
        updateCommunityMutating(id, true);
        try {
            const adminNote = errorReportNotes[id]?.trim();
            const res = await adminFetch(`${apiBase}/api/support/error-reports/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status,
                    adminNote: adminNote || undefined,
                }),
            });
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Failed to update error report.'));
                return;
            }
            const payload = await res.json();
            setErrorReports((prev) => prev.map((item) => (item.id === id ? ((payload.data as ErrorReport) ?? item) : item)));
            setMessage('Error report updated.');
        } catch (error) {
            console.error(error);
            setMessage('Failed to update error report.');
        } finally {
            updateCommunityMutating(id, false);
        }
    };

    const refreshCommunity = async () => {
        if (!isLoggedIn) return;
        setCommunityLoading(true);
        setCommunityError(null);
        try {
            const flagParams = new URLSearchParams({
                limit: '50',
                offset: '0',
            });
            if (flagFilter !== 'all') {
                flagParams.set('status', flagFilter);
            }

            const [flagsRes, forumsRes, qaRes, groupsRes] = await Promise.all([
                adminFetch(`${apiBase}/api/community/flags?${flagParams.toString()}`),
                adminFetch(`${apiBase}/api/community/forums?limit=30`),
                adminFetch(`${apiBase}/api/community/qa?limit=30`),
                adminFetch(`${apiBase}/api/community/groups?limit=30`),
            ]);

            const errors: string[] = [];

            if (flagsRes.ok) {
                const payload = await flagsRes.json();
                setCommunityFlags(asArray<CommunityFlag>(payload.data));
            } else {
                errors.push('flags');
            }

            if (forumsRes.ok) {
                const payload = await forumsRes.json();
                setCommunityForums(asArray<CommunityForumPost>(payload.data));
            } else {
                errors.push('forums');
            }

            if (qaRes.ok) {
                const payload = await qaRes.json();
                setCommunityQa(asArray<CommunityQaThread>(payload.data));
            } else {
                errors.push('Q&A');
            }

            if (groupsRes.ok) {
                const payload = await groupsRes.json();
                setCommunityGroups(asArray<CommunityStudyGroup>(payload.data));
            } else {
                errors.push('groups');
            }

            if (errors.length > 0) {
                setCommunityError(`Failed to load ${errors.join(', ')}.`);
            }
            setCommunityUpdatedAt(new Date().toISOString());
        } catch (error) {
            console.error(error);
            setCommunityError('Failed to load community moderation data.');
        } finally {
            setCommunityLoading(false);
        }
    };


    const handleDelete = async (id: string) => {
        if (!canDeleteAnnouncements) {
            setMessage(READ_ONLY_MESSAGE);
            notifyWarning('Read-only role', READ_ONLY_MESSAGE);
            return;
        }
        trackAdminEvent('admin_row_action_clicked', { action: 'delete', id });
        if (!window.confirm('Are you sure you want to delete this announcement?')) return;
        if (!isLoggedIn) {
            setMessage('Not authenticated.');
            notifyError('Authentication Required', 'Please log in to perform this action.');
            return;
        }

        updateMutating(id, true);

        // Show delete in progress notification
        notifyInfo('Deleting...', 'Removing announcement from the system.', 2000);

        try {
            const response = await adminFetch(`${apiBase}/api/admin/announcements/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setMessage('Deleted successfully');
                notifySuccess(
                    'Announcement Deleted',
                    'The announcement has been permanently removed.',
                    4000
                );
                refreshData();
                refreshDashboard();
            } else {
                const errorBody = await response.json().catch(() => ({}));
                const errorMsg = getApiErrorMessage(errorBody, 'Failed to delete announcement.');
                setMessage(errorMsg);
                notifyError('Delete Failed', errorMsg);
            }
        } catch (error) {
            console.error(error);
            const errorMsg = 'Error deleting announcement';
            setMessage(errorMsg);
            notifyError('Delete Error', 'Network error occurred while deleting.');
        } finally {
            updateMutating(id, false);
        }
    };

    const handleCommunityDelete = async (entityType: CommunityEntityType, id: string) => {
        if (!canWriteAdmin) {
            setMessage(READ_ONLY_MESSAGE);
            return;
        }
        if (!isLoggedIn) return;
        if (!window.confirm('Delete this community item?')) return;
        updateCommunityMutating(id, true);
        try {
            const endpoint = entityType === 'forum'
                ? `${apiBase}/api/community/forums/${id}`
                : entityType === 'qa'
                    ? `${apiBase}/api/community/qa/${id}`
                    : `${apiBase}/api/community/groups/${id}`;
            const response = await adminFetch(endpoint, { method: 'DELETE' });
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Failed to delete community item.'));
                return;
            }

            if (entityType === 'forum') {
                setCommunityForums((prev) => prev.filter((item) => item.id !== id));
            } else if (entityType === 'qa') {
                setCommunityQa((prev) => prev.filter((item) => item.id !== id));
            } else {
                setCommunityGroups((prev) => prev.filter((item) => item.id !== id));
            }
            setMessage('Community item deleted.');
        } catch (error) {
            console.error(error);
            setMessage('Failed to delete community item.');
        } finally {
            updateCommunityMutating(id, false);
        }
    };

    const handleResolveFlag = async (id: string) => {
        if (!canWriteAdmin) {
            setMessage(READ_ONLY_MESSAGE);
            return;
        }
        if (!isLoggedIn) return;
        if (!window.confirm('Mark this flag as resolved?')) return;
        updateCommunityMutating(id, true);
        try {
            const response = await adminFetch(`${apiBase}/api/community/flags/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Failed to resolve flag.'));
                return;
            }
            setCommunityFlags((prev) => prev.filter((flag) => flag.id !== id));
            setMessage('Flag resolved.');
        } catch (error) {
            console.error(error);
            setMessage('Failed to resolve flag.');
        } finally {
            updateCommunityMutating(id, false);
        }
    };

    const handleAnswerQa = async (id: string) => {
        if (!canWriteAdmin) {
            setMessage(READ_ONLY_MESSAGE);
            return;
        }
        if (!isLoggedIn) return;
        const answer = qaAnswerDrafts[id]?.trim();
        if (!answer) {
            setMessage('Answer cannot be empty.');
            return;
        }
        updateCommunityMutating(id, true);
        try {
            const response = await adminFetch(`${apiBase}/api/community/qa/${id}/answer`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    answer,
                    answeredBy: adminUser?.name ?? 'Admin',
                }),
            });
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Failed to post answer.'));
                return;
            }
            const payload = await response.json();
            setCommunityQa((prev) => prev.map((item) => (item.id === id ? ((payload.data as CommunityQaThread) ?? item) : item)));
            setQaAnswerDrafts((prev) => ({ ...prev, [id]: '' }));
            setMessage('Answer posted.');
        } catch (error) {
            console.error(error);
            setMessage('Failed to post answer.');
        } finally {
            updateCommunityMutating(id, false);
        }
    };

    const handleEdit = (item: Announcement) => {
        if (!canWriteAnnouncements) {
            setMessage(READ_ONLY_MESSAGE);
            return;
        }
        trackAdminEvent('admin_row_action_clicked', { action: 'edit', id: item.id, status: item.status ?? 'published' });
        setFormData({
            title: item.title,
            type: item.type,
            category: item.category,
            organization: item.organization,
            externalLink: item.externalLink || '',
            location: item.location || '',
            deadline: item.deadline ? item.deadline.split('T')[0] : '',
            totalPosts: item.totalPosts ? item.totalPosts.toString() : '',
            minQualification: item.minQualification || '',
            ageLimit: item.ageLimit || '',
            applicationFee: item.applicationFee || '',
            salaryMin: item.salaryMin ? item.salaryMin.toString() : '',
            salaryMax: item.salaryMax ? item.salaryMax.toString() : '',
            difficulty: item.difficulty || '',
            cutoffMarks: item.cutoffMarks || '',
            status: item.status ?? 'published',
            publishAt: item.publishAt ?? '',
        });
        setTouchedFields({
            title: false,
            organization: false,
            deadline: false,
            publishAt: false,
            externalLink: false,
        });
        setSubmitAttempted(false);
        setEditingId(item.id);

        // Load jobDetails if available for detailed editing
        if (item.jobDetails && Object.keys(item.jobDetails).length > 0) {
            setJobDetails(item.jobDetails as unknown as JobDetails | null);
            setActiveAdminTab('detailed');
            setMessage(`Editing (Detailed): ${item.title}`);
        } else {
            setActiveAdminTab('add');
            setMessage(`Editing: ${item.title}`);
        }
    };
    const handleDuplicate = (item: Announcement) => {
        if (!canWriteAnnouncements) {
            setMessage(READ_ONLY_MESSAGE);
            return;
        }
        trackAdminEvent('admin_row_action_clicked', { action: 'duplicate', id: item.id, status: item.status ?? 'published' });
        setFormData({
            ...DEFAULT_FORM_DATA,
            title: item.title,
            type: item.type,
            category: item.category,
            organization: item.organization,
            externalLink: item.externalLink || '',
            location: item.location || '',
            deadline: item.deadline ? item.deadline.split('T')[0] : '',
            totalPosts: item.totalPosts ? item.totalPosts.toString() : '',
            minQualification: item.minQualification || '',
            ageLimit: item.ageLimit || '',
            applicationFee: item.applicationFee || '',
            salaryMin: item.salaryMin ? item.salaryMin.toString() : '',
            salaryMax: item.salaryMax ? item.salaryMax.toString() : '',
            difficulty: item.difficulty || '',
            cutoffMarks: item.cutoffMarks || '',
            status: 'draft',
            publishAt: '',
        });
        setTouchedFields({
            title: false,
            organization: false,
            deadline: false,
            publishAt: false,
            externalLink: false,
        });
        setSubmitAttempted(false);
        const hasDetails = item.jobDetails && Object.keys(item.jobDetails).length > 0;
        setJobDetails(hasDetails ? (item.jobDetails as unknown as JobDetails) ?? null : null);
        setEditingId(null);
        setShowPreview(false);
        setPreviewData(null);
        setActiveAdminTab(hasDetails ? 'detailed' : 'add');
        setMessage(`Duplicating: ${item.title}`);
    };

    const handleReschedule = async (itemId: string, newDate: Date) => {
        if (!canWriteAnnouncements) {
            setMessage(READ_ONLY_MESSAGE);
            return;
        }
        const item = scheduledAnnouncements.find(i => i.id === itemId);
        if (!item) return;

        if (!window.confirm(`Reschedule "${item.title}" to ${formatDate(newDate)}?`)) {
            return;
        }

        // Optimistic update
        const originalAnnouncements = [...announcements];
        setAnnouncements(prev => prev.map(a =>
            a.id === itemId
                ? { ...a, publishAt: newDate.toISOString() }
                : a
        ));

        updateMutating(itemId, true);
        try {
            const response = await adminFetch(`${apiBase}/api/admin/announcements/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Idempotency-Key': crypto.randomUUID(),
                },
                body: JSON.stringify({
                    publishAt: newDate.toISOString(),
                }),
            });

            if (!response.ok) {
                setAnnouncements(originalAnnouncements);
                const errorBody = await response.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Failed to reschedule.'));
            } else {
                setMessage(`Rescheduled to ${formatDate(newDate)}`);
                refreshAdminSummary();
            }
        } catch (error) {
            setAnnouncements(originalAnnouncements);
            console.error(error);
            setMessage('Error rescheduling announcement');
        } finally {
            updateMutating(itemId, false);
        }
    };

    const handleQuickCreate = (type: ContentType, mode: 'add' | 'detailed') => {
        if (!canWriteAnnouncements) {
            setMessage(READ_ONLY_MESSAGE);
            return;
        }
        setFormData({ ...DEFAULT_FORM_DATA, type });
        setJobDetails(null);
        setEditingId(null);
        setShowPreview(false);
        setPreviewData(null);
        setTouchedFields({
            title: false,
            organization: false,
            deadline: false,
            publishAt: false,
            externalLink: false,
        });
        setSubmitAttempted(false);
        setActiveAdminTab(mode);
        setMessage('');
    };

    const handleView = (item: Announcement) => {
        if (!item.slug) return;
        trackAdminEvent('admin_row_action_clicked', { action: 'view', id: item.id, slug: item.slug });
        const url = `/${item.type}/${item.slug}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleTogglePublish = async (item: Announcement) => {
        if (!canWriteAnnouncements) {
            setMessage(READ_ONLY_MESSAGE);
            return;
        }
        trackAdminEvent('admin_row_action_clicked', {
            action: item.status === 'published' ? 'unpublish' : 'publish',
            id: item.id,
        });
        const isPublished = item.status === 'published';
        const nextStatus: AnnouncementStatus = isPublished ? 'archived' : 'published';
        const nextActive = !isPublished;
        const ok = await applyQaUpdate(
            item.id,
            {
                status: nextStatus,
                isActive: nextActive,
                note: isPublished ? 'Unpublished from content list' : 'Published from content list',
            },
            { successMessage: isPublished ? 'Announcement unpublished.' : 'Announcement published.' }
        );
        if (ok) {
            refreshData();
            refreshDashboard();
        }
    };

    const handleBoost = (item: Announcement) => {
        trackAdminEvent('admin_row_action_clicked', { action: 'boost', id: item.id });
        setMessage(`Boost is not configured for "${item.title}" yet. Configure promotions to enable this action.`);
        notifyInfo('Boost pending', 'Configure promotional workflow to use boost actions.');
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAll = (checked: boolean, ids: string[]) => {
        if (!checked) {
            setSelectedIds(new Set());
            return;
        }
        setSelectedIds(new Set(ids));
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
    };

    const updateMutating = (id: string, isMutating: boolean) => {
        setMutatingIds((prev) => {
            const next = new Set(prev);
            if (isMutating) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    };

    const updateCommunityMutating = (id: string, isMutating: boolean) => {
        setCommunityMutatingIds((prev) => {
            const next = new Set(prev);
            if (isMutating) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    };

    const handleApprove = async (id: string, note?: string) => {
        if (!canApproveAnnouncements) {
            setMessage(READ_ONLY_MESSAGE);
            return;
        }
        if (!isLoggedIn) return;
        updateMutating(id, true);
        try {
            const response = await adminFetch(`${apiBase}/api/admin/announcements/${id}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ note }),
            });
            if (response.ok) {
                trackAdminEvent('admin_review_decision_submitted', { action: 'approve', id });
                setMessage('Announcement approved and published.');
                setReviewNotes((prev) => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
                refreshData();
                refreshDashboard();
            } else {
                const errorBody = await response.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Failed to approve announcement.'));
            }
        } catch (error) {
            console.error(error);
            setMessage('Error approving announcement.');
        } finally {
            updateMutating(id, false);
        }
    };

    const handleEditById = (id: string) => {
        const target = announcements.find((item) => item.id === id);
        if (target) {
            handleEdit(target);
            setActiveAdminTab('list');
            return;
        }
        setPendingEditId(id);
        setActiveAdminTab('list');
        refreshData();
    };

    const handleReject = async (id: string, note?: string) => {
        if (!canApproveAnnouncements) {
            setMessage(READ_ONLY_MESSAGE);
            return;
        }
        if (!isLoggedIn) return;
        updateMutating(id, true);
        try {
            const response = await adminFetch(`${apiBase}/api/admin/announcements/${id}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ note }),
            });
            if (response.ok) {
                trackAdminEvent('admin_review_decision_submitted', { action: 'reject', id });
                setMessage('Announcement moved back to draft.');
                setReviewNotes((prev) => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
                refreshData();
                refreshDashboard();
            } else {
                const errorBody = await response.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Failed to reject announcement.'));
            }
        } catch (error) {
            console.error(error);
            setMessage('Error rejecting announcement.');
        } finally {
            updateMutating(id, false);
        }
    };

    const applyQaUpdate = async (
        id: string,
        payload: Record<string, any>,
        options?: { successMessage?: string; silent?: boolean }
    ): Promise<boolean> => {
        if (!canWriteAnnouncements) {
            if (!options?.silent) setMessage(READ_ONLY_MESSAGE);
            return false;
        }
        if (!isLoggedIn) {
            if (!options?.silent) setMessage('Not authenticated.');
            return false;
        }

        updateMutating(id, true);
        try {
            const response = await adminFetch(`${apiBase}/api/admin/announcements/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                if (options?.successMessage && !options.silent) {
                    setMessage(options.successMessage);
                }
                return true;
            }

            const errorBody = await response.json().catch(() => ({}));
            if (!options?.silent) {
                setMessage(getApiErrorMessage(errorBody, 'Failed to update announcement.'));
            }
            return false;
        } catch (error) {
            console.error(error);
            if (!options?.silent) {
                setMessage('Failed to update announcement.');
            }
            return false;
        } finally {
            updateMutating(id, false);
        }
    };

    const handleQaFix = async (item: Announcement) => {
        const { patch, fixes } = buildQaFixPatch(item);
        if (fixes.length === 0) {
            setMessage('No auto-fix available for this announcement.');
            return;
        }

        const ok = await applyQaUpdate(
            item.id,
            { ...patch, note: `QA auto-fix: ${fixes.join('; ')}` },
            { successMessage: 'QA auto-fix applied.' }
        );

        if (ok) {
            refreshData();
            refreshDashboard();
        }
    };

    const handleQaFlag = async (item: Announcement) => {
        const warnings = getAnnouncementWarnings(item);
        if (warnings.length === 0) {
            setMessage('No QA issues found to flag.');
            return;
        }

        const ok = await applyQaUpdate(
            item.id,
            { status: 'pending', note: `QA flag: ${warnings.join('; ')}` },
            { successMessage: 'Flagged for QA review.' }
        );

        if (ok) {
            refreshData();
            refreshDashboard();
        }
    };

    const handleBulkUpdate = async (options?: { status?: AnnouncementStatus, isActive?: boolean, publishAt?: string, skipPreview?: boolean }) => {
        if (!canWriteAnnouncements) {
            setMessage(READ_ONLY_MESSAGE);
            return;
        }
        if (!isLoggedIn) {
            setMessage('Not authenticated.');
            return;
        }
        if (selectedIds.size === 0) {
            setMessage('Select at least one announcement for bulk updates.');
            return;
        }

        const ids = Array.from(selectedIds);

        const payload: Record<string, any> = {};

        if (options) {
            if (options.status) payload.status = options.status;
            if (options.isActive !== undefined) payload.isActive = options.isActive;
            if (options.publishAt) payload.publishAt = normalizeDateTime(options.publishAt);
        } else {
            // Use state
            if (bulkStatus) {
                payload.status = bulkStatus;
            }
            if (bulkStatus === 'scheduled' && !bulkPublishAt) {
                setMessage('Publish time is required for scheduled updates.');
                return;
            }
            if (bulkPublishAt) {
                payload.publishAt = normalizeDateTime(bulkPublishAt);
            }
            if (bulkIsActive === 'active') {
                payload.isActive = true;
            } else if (bulkIsActive === 'inactive') {
                payload.isActive = false;
            }
        }

        if (Object.keys(payload).length === 0) {
            setMessage('Choose at least one bulk change before applying.');
            return;
        }

        if (enableAdminListsV3 && !options?.skipPreview) {
            try {
                const previewResponse = await adminFetch(`${apiBase}/api/admin/announcements/bulk/preview`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ids,
                        data: payload,
                    }),
                });
                if (previewResponse.ok) {
                    const previewPayload = await previewResponse.json();
                    const previewData = (previewPayload?.data ?? {}) as BulkPreviewResult;
                    setBulkPreview({
                        payload,
                        result: {
                            totalTargets: Number(previewData.totalTargets ?? 0),
                            affectedByStatus: previewData.affectedByStatus ?? {},
                            warnings: Array.isArray(previewData.warnings) ? previewData.warnings : [],
                            missingIds: Array.isArray(previewData.missingIds) ? previewData.missingIds : [],
                        },
                    });
                    trackAdminEvent('admin_bulk_preview_opened', {
                        selected: ids.length,
                        status: payload.status ?? null,
                    });
                    return;
                }
            } catch (error) {
                console.error(error);
                setMessage('Failed to load bulk preview. Proceeding without preview.');
            }
        }

        setBulkLoading(true);
        if (enableAdminListsV3) {
            setBulkApplying(true);
        }
        try {
            const previousAnnouncements = announcements;
            const previousListAnnouncements = listAnnouncements;
            if (enableAdminListsV3) {
                const patch = payload;
                setAnnouncements((prev) => prev.map((item) => (
                    selectedIds.has(item.id)
                        ? {
                            ...item,
                            status: (patch.status as AnnouncementStatus) ?? item.status,
                            publishAt: typeof patch.publishAt === 'string' ? patch.publishAt : item.publishAt,
                            isActive: typeof patch.isActive === 'boolean' ? patch.isActive : item.isActive,
                        }
                        : item
                )));
                setListAnnouncements((prev) => prev.map((item) => (
                    selectedIds.has(item.id)
                        ? {
                            ...item,
                            status: (patch.status as AnnouncementStatus) ?? item.status,
                            publishAt: typeof patch.publishAt === 'string' ? patch.publishAt : item.publishAt,
                            isActive: typeof patch.isActive === 'boolean' ? patch.isActive : item.isActive,
                        }
                        : item
                )));
            }

            const response = await adminFetch(`${apiBase}/api/admin/announcements/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ids,
                    data: payload,
                }),
            });

            if (response.ok) {
                setMessage('Bulk update complete.');
                setBulkStatus('');
                setBulkPublishAt('');
                setBulkIsActive('keep');
                setBulkPreview(null);
                clearSelection();
                refreshData();
                refreshDashboard();
            } else {
                if (enableAdminListsV3) {
                    setAnnouncements(previousAnnouncements);
                    setListAnnouncements(previousListAnnouncements);
                }
                const errorBody = await response.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Bulk update failed.'));
            }
        } catch (error) {
            console.error(error);
            setMessage('Error applying bulk update.');
        } finally {
            setBulkLoading(false);
            setBulkApplying(false);
        }
    };

    const requestReviewPreview = useCallback(async (
        action: 'approve' | 'reject' | 'schedule',
        payload: { ids: string[]; note?: string; scheduleAt?: string }
    ) => {
        const previewResponse = await adminFetch(`${apiBase}/api/admin/review/preview`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ids: payload.ids,
                action,
                note: payload.note,
                scheduleAt: payload.scheduleAt,
            }),
        });
        if (!previewResponse.ok) {
            return null;
        }
        const previewPayload = await previewResponse.json();
        const result = (previewPayload?.data ?? {}) as ReviewPreviewResult;
        const normalized: ReviewPreviewResult = {
            eligibleIds: Array.isArray(result.eligibleIds) ? result.eligibleIds : [],
            blockedIds: Array.isArray(result.blockedIds) ? result.blockedIds : [],
            warnings: Array.isArray(result.warnings) ? result.warnings : [],
        };
        setReviewPreview({ action, payload, result: normalized });
        trackAdminEvent('admin_bulk_preview_opened', { action, eligible: normalized.eligibleIds.length });
        return normalized;
    }, [adminFetch, trackAdminEvent]);

    const handleBulkApprove = async (options?: { skipPreview?: boolean; ids?: string[]; note?: string }) => {
        if (!canApproveAnnouncements) {
            setMessage(READ_ONLY_MESSAGE);
            return;
        }
        if (!isLoggedIn) {
            setMessage('Not authenticated.');
            return;
        }
        const idsToUse = options?.ids ?? Array.from(selectedIds);
        const noteToUse = options?.note ?? (reviewBulkNote.trim() || undefined);

        if (idsToUse.length === 0) {
            setMessage('Select at least one announcement to approve.');
            return;
        }

        const payload = {
            ids: idsToUse,
            note: noteToUse,
        };

        if (enableAdminReviewV3 && !options?.skipPreview) {
            const preview = await requestReviewPreview('approve', payload);
            if (preview) return;
        }

        setReviewLoading(true);
        try {
            const response = await adminFetch(`${apiBase}/api/admin/announcements/bulk-approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                trackAdminEvent('admin_review_decision_submitted', {
                    action: 'bulk_approve',
                    ids: payload.ids.length,
                });
                setMessage('Bulk approve complete.');
                setReviewPreview(null);
                setReviewBulkNote('');
                clearSelection();
                refreshData();
                refreshDashboard();
                refreshAuditLogs();
            } else {
                const errorBody = await response.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Bulk approve failed.'));
            }
        } catch (error) {
            console.error(error);
            setMessage('Error approving announcements.');
        } finally {
            setReviewLoading(false);
        }
    };

    const handleBulkReject = async (options?: { skipPreview?: boolean; ids?: string[]; note?: string }) => {
        if (!canApproveAnnouncements) {
            setMessage(READ_ONLY_MESSAGE);
            return;
        }
        if (!isLoggedIn) {
            setMessage('Not authenticated.');
            return;
        }
        const idsToUse = options?.ids ?? Array.from(selectedIds);
        const noteToUse = options?.note ?? (reviewBulkNote.trim() || undefined);

        if (idsToUse.length === 0) {
            setMessage('Select at least one announcement to reject.');
            return;
        }

        const payload = {
            ids: idsToUse,
            note: noteToUse,
        };

        if (enableAdminReviewV3 && !options?.skipPreview) {
            const preview = await requestReviewPreview('reject', payload);
            if (preview) return;
        }

        setReviewLoading(true);
        try {
            const response = await adminFetch(`${apiBase}/api/admin/announcements/bulk-reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                trackAdminEvent('admin_review_decision_submitted', {
                    action: 'bulk_reject',
                    ids: payload.ids.length,
                });
                setMessage('Bulk reject complete.');
                setReviewPreview(null);
                setReviewBulkNote('');
                clearSelection();
                refreshData();
                refreshDashboard();
                refreshAuditLogs();
            } else {
                const errorBody = await response.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Bulk reject failed.'));
            }
        } catch (error) {
            console.error(error);
            setMessage('Error rejecting announcements.');
        } finally {
            setReviewLoading(false);
        }
    };

    const handleBulkSchedule = async (options?: { skipPreview?: boolean; ids?: string[]; note?: string; scheduleAt?: string }) => {
        if (!canWriteAnnouncements) {
            setMessage(READ_ONLY_MESSAGE);
            return;
        }
        if (!isLoggedIn) {
            setMessage('Not authenticated.');
            return;
        }
        const idsToUse = options?.ids ?? Array.from(selectedIds);
        const noteToUse = options?.note ?? (reviewBulkNote.trim() || undefined);
        const scheduleToUse = options?.scheduleAt ?? reviewScheduleAt;

        if (idsToUse.length === 0) {
            setMessage('Select at least one announcement to schedule.');
            return;
        }
        if (!scheduleToUse) {
            setMessage('Publish time is required for scheduling.');
            return;
        }

        const payload = {
            ids: idsToUse,
            note: noteToUse,
            scheduleAt: normalizeDateTime(scheduleToUse),
        };

        if (enableAdminReviewV3 && !options?.skipPreview) {
            const preview = await requestReviewPreview('schedule', payload);
            if (preview) return;
        }

        setReviewLoading(true);
        try {
            const response = await adminFetch(`${apiBase}/api/admin/announcements/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ids: payload.ids,
                    data: {
                        status: 'scheduled',
                        publishAt: payload.scheduleAt,
                        note: payload.note,
                    },
                }),
            });

            if (response.ok) {
                trackAdminEvent('admin_review_decision_submitted', {
                    action: 'bulk_schedule',
                    ids: payload.ids.length,
                });
                setMessage('Bulk schedule complete.');
                setReviewPreview(null);
                setReviewBulkNote('');
                setReviewScheduleAt('');
                clearSelection();
                refreshData();
                refreshDashboard();
                refreshAuditLogs();
            } else {
                const errorBody = await response.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Bulk schedule failed.'));
            }
        } catch (error) {
            console.error(error);
            setMessage('Error scheduling announcements.');
        } finally {
            setReviewLoading(false);
        }
    };

    const applyBulkPreview = async () => {
        if (!bulkPreview) return;
        const payload = bulkPreview.payload;
        setBulkPreview(null);
        await handleBulkUpdate({
            status: payload.status as AnnouncementStatus | undefined,
            isActive: typeof payload.isActive === 'boolean' ? payload.isActive : undefined,
            publishAt: typeof payload.publishAt === 'string' ? payload.publishAt : undefined,
            skipPreview: true,
        });
    };

    const applyReviewPreview = async () => {
        if (!reviewPreview) return;
        const eligibleIds = reviewPreview.result.eligibleIds;
        if (eligibleIds.length === 0) {
            setMessage('No eligible announcements in this preview.');
            setReviewPreview(null);
            return;
        }

        if (reviewPreview.action === 'approve') {
            await handleBulkApprove({ skipPreview: true, ids: eligibleIds, note: reviewPreview.payload.note });
        } else if (reviewPreview.action === 'reject') {
            await handleBulkReject({ skipPreview: true, ids: eligibleIds, note: reviewPreview.payload.note });
        } else {
            await handleBulkSchedule({
                skipPreview: true,
                ids: eligibleIds,
                note: reviewPreview.payload.note,
                scheduleAt: reviewPreview.payload.scheduleAt,
            });
        }
        setReviewPreview(null);
    };

    const handleBulkQaFix = async () => {
        if (!canWriteAnnouncements) {
            setMessage(READ_ONLY_MESSAGE);
            return;
        }
        if (!isLoggedIn) {
            setMessage('Not authenticated.');
            return;
        }

        if (selectedIds.size === 0) {
            setMessage('Select at least one announcement for QA fixes.');
            return;
        }

        const targets = announcements.filter(
            (item) => selectedIds.has(item.id) && getFixableWarnings(item).length > 0
        );
        if (targets.length === 0) {
            setMessage('No fixable QA issues found in the selected announcements.');
            return;
        }

        setQaBulkLoading(true);
        try {
            const results = await Promise.all(
                targets.map(async (item) => {
                    const { patch, fixes } = buildQaFixPatch(item);
                    if (fixes.length === 0) return false;
                    return applyQaUpdate(
                        item.id,
                        { ...patch, note: `QA auto-fix: ${fixes.join('; ')}` },
                        { silent: true }
                    );
                })
            );

            const successCount = results.filter(Boolean).length;
            setMessage(`QA auto-fix applied to ${successCount}/${targets.length} announcements.`);
            refreshData();
            refreshDashboard();
        } finally {
            setQaBulkLoading(false);
        }
    };

    const handleBulkQaFlag = async () => {
        if (!canWriteAnnouncements) {
            setMessage(READ_ONLY_MESSAGE);
            return;
        }
        if (!isLoggedIn) {
            setMessage('Not authenticated.');
            return;
        }

        if (selectedIds.size === 0) {
            setMessage('Select at least one announcement to flag.');
            return;
        }

        const targets = announcements.filter(
            (item) => selectedIds.has(item.id) && getAnnouncementWarnings(item).length > 0
        );
        if (targets.length === 0) {
            setMessage('No QA issues found to flag.');
            return;
        }

        setQaBulkLoading(true);
        try {
            const results = await Promise.all(
                targets.map(async (item) => {
                    const warnings = getAnnouncementWarnings(item);
                    return applyQaUpdate(
                        item.id,
                        { status: 'pending', note: `QA flag: ${warnings.join('; ')}` },
                        { silent: true }
                    );
                })
            );

            const successCount = results.filter(Boolean).length;
            setMessage(`Flagged ${successCount}/${targets.length} announcements for QA review.`);
            refreshData();
            refreshDashboard();
        } finally {
            setQaBulkLoading(false);
        }
    };

    const downloadCsv = async (endpoint: string, filename: string) => {
        if (!isLoggedIn) {
            setMessage('Not authenticated.');
            return;
        }
        try {
            const response = await adminFetch(`${apiBase}${endpoint}`);
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Export failed.'));
                return;
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            setMessage('Export failed.');
        }
    };


    // Handle form submit (create or update announcement)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canWriteAnnouncements) {
            setMessage(READ_ONLY_MESSAGE);
            notifyWarning('Read-only role', READ_ONLY_MESSAGE);
            return;
        }
        setSubmitAttempted(true);
        setMessage('Processing...');

        // Show processing notification
        notifyInfo(
            editingId ? 'Updating...' : 'Creating...',
            editingId
                ? 'Updating announcement with your changes...'
                : 'Creating new announcement...',
            3000
        );

        if (!isLoggedIn) {
            setMessage('Not authenticated. Please log in again.');
            setIsLoggedIn(false);
            notifyError('Authentication Required', 'Please log in again to save changes.');
            return;
        }

        if (titleInvalid || organizationMissing || (formData.status === 'scheduled' && !formData.publishAt)) {
            setMessage('Please fix the highlighted fields before saving.');
            notifyWarning('Missing required details', 'Complete the required fields to continue.', 4000);
            return;
        }

        try {
            const url = editingId
                ? `${apiBase}/api/admin/announcements/${editingId}`
                : `${apiBase}/api/admin/announcements`;

            const method = editingId ? 'PUT' : 'POST';
            const payload = {
                ...formData,
                totalPosts: formData.totalPosts ? parseInt(formData.totalPosts) : undefined,
                salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
                salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : undefined,
                difficulty: formData.difficulty || undefined,
                cutoffMarks: formData.cutoffMarks || undefined,
                publishAt: formData.status === 'scheduled' && formData.publishAt ? normalizeDateTime(formData.publishAt) : undefined,
            };

            const response = await adminFetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const successMessage = editingId ? 'Announcement updated successfully!' : 'Announcement created successfully!';
                setMessage(successMessage);

                // Enhanced success notification
                notifySuccess(
                    editingId ? 'Update Complete' : 'Created Successfully',
                    editingId
                        ? `Announcement "${formData.title}" has been updated and is now live.`
                        : `New announcement "${formData.title}" has been created and published.`,
                    5000
                );

                setFormData({ ...DEFAULT_FORM_DATA });
                setTouchedFields({
                    title: false,
                    organization: false,
                    deadline: false,
                    publishAt: false,
                    externalLink: false,
                });
                setSubmitAttempted(false);

                setEditingId(null);

                refreshData();

                refreshDashboard();

                setActiveAdminTab('list');

            } else {
                const errorBody = await response.json().catch(() => ({}));
                const errorMsg = getApiErrorMessage(errorBody, 'Failed to save announcement.');
                setMessage(errorMsg);

                notifyError(
                    editingId ? 'Update Failed' : 'Creation Failed',
                    errorMsg,
                    6000
                );
            }
        } catch (error) {
            console.error(error);
            const errorMsg = 'Error saving announcement.';
            setMessage(errorMsg);

            notifyError(
                'Save Error',
                'Network error occurred while saving. Please check your connection and try again.',
                6000
            );
        }
    };

    const statusCounts = useMemo(() => {
        if (adminSummary?.counts?.byStatus) {
            return adminSummary.counts.byStatus;
        }
        const counts: Record<AnnouncementStatus, number> = {
            draft: 0,
            pending: 0,
            scheduled: 0,
            published: 0,
            archived: 0,
        };
        for (const item of announcements) {
            const status = item.status ?? 'published';
            counts[status] = (counts[status] ?? 0) + 1;
        }
        return counts;
    }, [adminSummary, announcements]);

    const scheduledAnnouncements = useMemo(() => {
        return announcements
            .filter((item) => (item.status ?? 'published') === 'scheduled' && item.publishAt)
            .slice()
            .sort((a, b) => new Date(a.publishAt || 0).getTime() - new Date(b.publishAt || 0).getTime());
    }, [announcements]);

    const pendingAnnouncements = useMemo(() => {
        const pending = announcements.filter((item) => (item.status ?? 'published') === 'pending');
        if (!enableAdminReviewV3) return pending;
        return pending.slice().sort((a, b) => {
            const riskDelta = getReviewRisk(b).score - getReviewRisk(a).score;
            if (riskDelta !== 0) return riskDelta;
            const aTime = new Date(a.updatedAt || a.postedAt).getTime();
            const bTime = new Date(b.updatedAt || b.postedAt).getTime();
            return aTime - bTime;
        });
    }, [announcements, enableAdminReviewV3]);

    const pendingWarningCount = useMemo(() => {
        if (adminSummary?.counts?.pendingQaIssues !== undefined) {
            return adminSummary.counts.pendingQaIssues;
        }
        return pendingAnnouncements.filter((item) => getAnnouncementWarnings(item).length > 0).length;
    }, [adminSummary, pendingAnnouncements]);

    const pendingSlaStats = useMemo(() => {
        if (adminSummary?.pendingSla) {
            return {
                buckets: adminSummary.pendingSla.buckets,
                stale: adminSummary.pendingSla.stale.map((item) => ({ item, ageDays: item.ageDays })),
                averageDays: adminSummary.pendingSla.averageDays,
                pendingTotal: adminSummary.pendingSla.pendingTotal,
            };
        }
        const buckets = { lt1: 0, d1_3: 0, d3_7: 0, gt7: 0 };
        const stale: Array<{ item: Announcement; ageDays: number }> = [];
        let totalDays = 0;

        pendingAnnouncements.forEach((item) => {
            const base = item.updatedAt || item.postedAt;
            const baseDate = base ? new Date(base).getTime() : Date.now();
            const diffMs = Date.now() - baseDate;
            const ageDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
            totalDays += ageDays;

            if (ageDays > 7) {
                buckets.gt7 += 1;
                stale.push({ item, ageDays });
            } else if (ageDays >= 3) {
                buckets.d3_7 += 1;
            } else if (ageDays >= 1) {
                buckets.d1_3 += 1;
            } else {
                buckets.lt1 += 1;
            }
        });

        stale.sort((a, b) => b.ageDays - a.ageDays);

        return {
            buckets,
            stale: stale.slice(0, 8),
            averageDays: pendingAnnouncements.length ? Math.round(totalDays / pendingAnnouncements.length) : 0,
            pendingTotal: pendingAnnouncements.length,
        };
    }, [adminSummary, pendingAnnouncements]);

    const selectedAnnouncements = useMemo(() => {
        return announcements.filter((item) => selectedIds.has(item.id));
    }, [announcements, selectedIds]);

    const selectedQaIssueCount = useMemo(() => {
        return selectedAnnouncements.filter((item) => getAnnouncementWarnings(item).length > 0).length;
    }, [selectedAnnouncements]);

    const selectedQaFixableCount = useMemo(() => {
        return selectedAnnouncements.filter((item) => getFixableWarnings(item).length > 0).length;
    }, [selectedAnnouncements]);

    const scheduledStats = useMemo(() => {
        const now = Date.now();
        const nextDay = now + 24 * 60 * 60 * 1000;
        const overdue = scheduledAnnouncements.filter((item) => new Date(item.publishAt || 0).getTime() <= now).length;
        const upcoming24h = scheduledAnnouncements.filter((item) => {
            const time = new Date(item.publishAt || 0).getTime();
            return time > now && time <= nextDay;
        }).length;
        const nextPublish = scheduledAnnouncements[0]?.publishAt;
        return { overdue, upcoming24h, nextPublish };
    }, [scheduledAnnouncements, timeZoneId]);

    const pendingTotal = pendingSlaStats.pendingTotal;
    const scheduledTotal = scheduledAnnouncements.length;
    const activeTabMeta = ADMIN_TAB_META[activeAdminTab];
    const opsPulse = [
        {
            tab: 'review' as AdminTab,
            label: 'Pending review',
            value: pendingTotal,
            tone: pendingTotal > 0 ? 'warning' : 'success',
            onClick: () => handleNavSelect('review'),
        },
        {
            tab: 'review' as AdminTab,
            label: 'QA alerts',
            value: pendingWarningCount,
            tone: pendingWarningCount > 0 ? 'warning' : 'success',
            onClick: () => handleNavSelect('review'),
        },
        {
            tab: 'queue' as AdminTab,
            label: 'Scheduled',
            value: scheduledTotal,
            tone: scheduledTotal > 0 ? 'info' : 'muted',
            onClick: () => handleNavSelect('queue'),
        },
        {
            tab: 'list' as AdminTab,
            label: 'Drafts',
            value: statusCounts.draft ?? 0,
            tone: statusCounts.draft > 0 ? 'muted' : 'success',
            onClick: () => handleNavSelect('list'),
        },
    ];

    const commandPaletteCommands = useMemo(() => ([
        {
            id: 'goto-list',
            label: 'Go to listings',
            description: 'Open all announcements list',
            onSelect: () => handleNavSelect('list'),
        },
        {
            id: 'focus-search',
            label: 'Focus list search',
            description: 'Jump to listings and focus search field',
            onSelect: () => handleShellSearch(listQuery.trim()),
        },
        {
            id: 'goto-review',
            label: 'Go to pending review',
            description: 'Open review queue',
            onSelect: () => handleNavSelect('review'),
        },
        {
            id: 'goto-analytics',
            label: 'Go to analytics',
            description: 'Open analytics command center',
            onSelect: () => handleNavSelect('analytics'),
        },
    ]), [handleNavSelect, handleShellSearch, listQuery]);

    const commandPaletteAnnouncements = useMemo(() => {
        const map = new Map<string, Announcement>();
        for (const item of announcements) {
            if (!item?.id || map.has(item.id)) continue;
            map.set(item.id, item);
        }
        for (const item of listAnnouncements) {
            if (!item?.id || map.has(item.id)) continue;
            map.set(item.id, item);
        }
        return Array.from(map.values());
    }, [announcements, listAnnouncements]);

    const handleCommandPaletteOpenAnnouncement = useCallback((id: string) => {
        trackAdminEvent('admin_row_action_clicked', { action: 'command_open_announcement', id });
        setIsCommandPaletteOpen(false);
        setCommandPaletteQuery('');
        handleEditById(id);
    }, [handleEditById, trackAdminEvent]);

    const parseDateOnly = (value?: string) => {
        if (!value) return null;
        const date = new Date(`${value}T00:00:00`);
        if (Number.isNaN(date.getTime())) return null;
        return date;
    };

    const parseDateTime = (value?: string) => {
        if (!value) return null;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        return date;
    };

    const formatDateInput = (date: Date) => {
        const pad = (num: number) => String(num).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    };

    const formWarnings = useMemo(() => getFormWarnings(), [formData]);
    const titleMissing = !formData.title.trim();
    const titleTooShort = formData.title.trim().length > 0 && formData.title.trim().length < 10;
    const titleInvalid = titleMissing || titleTooShort;
    const organizationMissing = !formData.organization.trim();
    const titleLength = formData.title.trim().length;
    const titleProgress = Math.min(100, Math.round((titleLength / 50) * 100));
    const titleValid = titleLength >= 10;
    const organizationValid = !organizationMissing;
    const externalLinkInvalid = !!formData.externalLink && !isValidUrl(formData.externalLink);
    const deadlineDate = parseDateOnly(formData.deadline) ?? undefined;
    const deadlineInPast = !!deadlineDate && deadlineDate.getTime() < Date.now();
    const showTitleError = (touchedFields.title || submitAttempted) && titleInvalid;
    const showOrganizationError = (touchedFields.organization || submitAttempted) && organizationMissing;
    const showExternalLinkError = (touchedFields.externalLink || submitAttempted) && externalLinkInvalid;
    const showPublishAtError = (touchedFields.publishAt || submitAttempted)
        && formData.status === 'scheduled'
        && !formData.publishAt;
    const showDeadlineWarning = (touchedFields.deadline || submitAttempted) && deadlineInPast;

    const totalPages = Math.max(1, Math.ceil((listTotal || 0) / pageSize));

    const pagedAnnouncements = useMemo(() => listAnnouncements, [listAnnouncements]);

    const listFilterSummary = useMemo(() => {
        const parts: string[] = [];
        const trimmedQuery = listQuery.trim();
        if (trimmedQuery) {
            parts.push(`Search: "${trimmedQuery}"`);
        }
        if (listTypeFilter !== 'all') {
            const typeLabel = CONTENT_TYPES.find((type) => type.value === listTypeFilter)?.label ?? listTypeFilter;
            parts.push(`Type: ${typeLabel}`);
        }
        if (listStatusFilter !== 'all') {
            const statusLabel = STATUS_OPTIONS.find((option) => option.value === listStatusFilter)?.label ?? listStatusFilter;
            parts.push(`Status: ${statusLabel}`);
        }
        return parts.join(' • ');
    }, [listQuery, listStatusFilter, listTypeFilter]);

    const handleClearListFilters = useCallback(() => {
        setListQuery('');
        setListTypeFilter('all');
        setListStatusFilter('all');
        setListSort('newest');
        setListPage(1);
        setSelectedPresetId('');
        setActiveQuickMode('');
    }, [setListQuery, setListTypeFilter, setListStatusFilter, setListSort, setListPage]);

    const applyListPreset = useCallback((presetId: string) => {
        setSelectedPresetId(presetId);
        if (!presetId) return;
        const preset = listPresets.find((item) => item.id === presetId);
        if (!preset) return;
        setListQuery(preset.query ?? '');
        setListTypeFilter((preset.type as ContentType | 'all') ?? 'all');
        setListStatusFilter((preset.status as AnnouncementStatus | 'all') ?? 'all');
        setListSort(preset.sort ?? 'newest');
        setListPage(1);
        setActiveQuickMode('');
    }, [listPresets]);

    const saveCurrentFiltersAsPreset = useCallback(() => {
        const hasAnyFilter = !!listQuery.trim() || listTypeFilter !== 'all' || listStatusFilter !== 'all' || listSort !== 'newest';
        if (!hasAnyFilter) {
            setMessage('Apply filters before saving a preset.');
            return;
        }
        const label = window.prompt('Preset name', `Preset ${listPresets.length + 1}`)?.trim();
        if (!label) return;

        const preset: ListFilterPreset = {
            id: crypto.randomUUID(),
            label,
            query: listQuery.trim(),
            type: listTypeFilter,
            status: listStatusFilter,
            sort: listSort,
        };
        const next = [preset, ...listPresets].slice(0, 12);
        setListPresets(next);
        localStorage.setItem(LIST_FILTER_PRESETS_KEY, JSON.stringify(next));
        setSelectedPresetId(preset.id);
        setMessage(`Saved preset "${label}".`);
    }, [listPresets, listQuery, listSort, listStatusFilter, listTypeFilter]);

    const applyQuickMode = useCallback((mode: 'pending' | 'expiring' | 'low_ctr' | 'stale') => {
        setActiveQuickMode(mode);
        if (mode === 'pending') {
            setListStatusFilter('pending');
            setListTypeFilter('all');
            setListSort('updated');
            setListQuery('');
            return;
        }
        if (mode === 'expiring') {
            setListStatusFilter('published');
            setListTypeFilter('all');
            setListSort('deadline');
            setListQuery('');
            return;
        }
        if (mode === 'stale') {
            setListStatusFilter('pending');
            setListTypeFilter('all');
            setListSort('oldest');
            setListQuery('');
            return;
        }
        setActiveAdminTab('analytics');
        setMessage('Low CTR mode opens analytics anomalies. Use "Fix now" to jump into targeted lists.');
    }, []);

    const handleAnalyticsDrilldown = useCallback((query: Record<string, string>) => {
        trackAdminEvent('admin_metric_drilldown_opened', query);
        if (query.tab === 'analytics') {
            setActiveAdminTab('analytics');
            if (query.focus === 'tracking') {
                setMessage('Tracking coverage details opened. Validate listing_view event flow and rollup freshness.');
            }
            return;
        }

        if (query.tab === 'review') {
            handleNavSelect('review');
            return;
        }

        handleNavSelect('list');
        if (typeof query.q === 'string') setListQuery(query.q);
        if (query.type && CONTENT_TYPES.some((item) => item.value === query.type)) {
            setListTypeFilter(query.type as ContentType);
        }
        if (query.status && STATUS_OPTIONS.some((item) => item.value === query.status)) {
            setListStatusFilter(query.status as AnnouncementStatus);
        }
        if (query.sort && ['newest', 'updated', 'deadline', 'views', 'oldest'].includes(query.sort)) {
            setListSort(query.sort as 'newest' | 'oldest' | 'updated' | 'deadline' | 'views');
        }
        if (query.mode) setActiveQuickMode(query.mode);
        setListPage(1);
    }, [handleNavSelect, trackAdminEvent]);

    const listQuickChips = useMemo(() => ([
        {
            id: 'pending',
            label: 'Pending',
            active: activeQuickMode === 'pending',
            onClick: () => applyQuickMode('pending'),
        },
        {
            id: 'expiring',
            label: 'Expiring',
            active: activeQuickMode === 'expiring',
            onClick: () => applyQuickMode('expiring'),
        },
        {
            id: 'stale',
            label: 'Stale',
            active: activeQuickMode === 'stale',
            onClick: () => applyQuickMode('stale'),
        },
        {
            id: 'low_ctr',
            label: 'Low CTR',
            active: activeQuickMode === 'low_ctr',
            onClick: () => applyQuickMode('low_ctr'),
        },
    ]), [activeQuickMode, applyQuickMode]);

    const handleReviewTemplateSelect = useCallback((templateId: string) => {
        setSelectedReviewTemplate(templateId);
        if (!templateId) return;
        const template = REVIEW_NOTE_TEMPLATES.find((item) => item.id === templateId);
        if (template) {
            setReviewBulkNote(template.value);
        }
    }, []);

    function isValidUrl(value?: string | null) {
        if (!value) return true;
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    }

    function getAnnouncementWarnings(item: Announcement) {
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

    function getReviewRisk(item: Announcement) {
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

    function getFixableWarnings(item: Announcement) {
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

    function buildQaFixPatch(item: Announcement) {
        const patch: Record<string, any> = {};
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

    function getFormWarnings() {
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

    const getWarningTone = (warning: string) => {
        const lower = warning.toLowerCase();
        if (lower.includes('required') || lower.includes('at least') || lower.includes('need a publish')) {
            return 'critical';
        }
        if (lower.includes('past') || lower.includes('invalid')) {
            return 'warning';
        }
        return 'warning';
    };

    const toDate = (value?: string | Date | null) => {
        if (!value) return null;
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        return date;
    };

    const formatDate = (value?: string | Date | null) => {
        const date = toDate(value);
        if (!date) return 'N/A';
        return new Intl.DateTimeFormat('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone: timeZoneId,
        }).format(date);
    };

    const formatTime = (value?: string | Date | null) => {
        const date = toDate(value);
        if (!date) return '-';
        return new Intl.DateTimeFormat('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: timeZoneId,
        }).format(date);
    };

    const formatDateTime = (value?: string | Date | null) => {
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

    const renderDateCell = (value?: string) => {
        const label = formatDate(value);
        return label === 'N/A' ? <span className="cell-muted" title="No deadline set">No deadline</span> : label;
    };

    const normalizeDateTime = (value?: string | Date) => {
        if (!value) return undefined;
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) return value instanceof Date ? value.toISOString() : value;
        return date.toISOString();
    };

    const formatLastUpdated = (value?: string | null, label = 'Updated') => {
        if (!value) return 'Not updated yet';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Not updated yet';
        const diffMs = Date.now() - date.getTime();
        if (diffMs < 60 * 1000) return `${label} just now`;
        if (diffMs < 60 * 60 * 1000) return `${label} ${Math.round(diffMs / 60000)}m ago`;
        if (diffMs < 24 * 60 * 60 * 1000) return `${label} ${Math.round(diffMs / (60 * 60 * 1000))}h ago`;
        return `${label} ${Math.round(diffMs / (24 * 60 * 60 * 1000))}d ago`;
    };

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    useEffect(() => {
        if (!isLoggedIn) return;
        if (canAccessTab(activeAdminTab)) return;
        const fallbackTab = (Object.keys(TAB_PERMISSION_MAP) as AdminTab[]).find((tab) => canAccessTab(tab)) ?? 'analytics';
        setActiveAdminTab(fallbackTab);
        setMessage(READ_ONLY_MESSAGE);
    }, [activeAdminTab, canAccessTab, isLoggedIn]);

    useEffect(() => {
        if (!isLoggedIn) return;
        refreshData();
        refreshDashboard();
        refreshActiveUsers();
        refreshAdminSummary();
        refreshSessions();
        refreshBackupCodesStatus();
    }, [isLoggedIn]);

    useEffect(() => {
        if (!isLoggedIn) return;
        refreshActiveUsers();
    }, [activeUsersWindow, isLoggedIn]);

    useEffect(() => {
        if (!isLoggedIn) return;
        if (activeAdminTab === 'audit') {
            refreshAuditLogs();
        }
        if (activeAdminTab === 'list') {
            refreshListData();
        }
        if (activeAdminTab === 'community') {
            refreshCommunity();
        }
        if (activeAdminTab === 'errors') {
            refreshErrorReports();
        }
        if (activeAdminTab === 'security') {
            refreshSessions();
            refreshBackupCodesStatus();
        }
    }, [activeAdminTab, isLoggedIn]);

    useEffect(() => {
        if (!isLoggedIn || activeAdminTab !== 'errors') return;
        refreshErrorReports();
    }, [errorReportStatusFilter, errorReportQuery, activeAdminTab, isLoggedIn]);

    useEffect(() => {
        if (!isLoggedIn || activeAdminTab !== 'community') return;
        refreshCommunity();
    }, [flagFilter, activeAdminTab, isLoggedIn]);

    useEffect(() => {
        setSelectedIds(new Set());
        setReviewBulkNote('');
        setReviewScheduleAt('');
    }, [activeAdminTab]);

    useEffect(() => {
        setIsNavOpen(false);
    }, [activeAdminTab]);

    useEffect(() => {
        if (!isLoggedIn || !enableAdminReviewV3 || activeAdminTab !== 'review') return;

        const handler = (event: KeyboardEvent) => {
            if (!(event.ctrlKey || event.metaKey) || !event.shiftKey) return;
            const key = event.key.toLowerCase();
            if (key === 'a' && canApproveAnnouncements && selectedIds.size > 0 && !reviewLoading) {
                event.preventDefault();
                void handleBulkApprove();
            }
            if (key === 'r' && canApproveAnnouncements && selectedIds.size > 0 && !reviewLoading) {
                event.preventDefault();
                void handleBulkReject();
            }
            if (key === 's' && canWriteAnnouncements && selectedIds.size > 0 && !reviewLoading) {
                event.preventDefault();
                void handleBulkSchedule();
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [
        activeAdminTab,
        canApproveAnnouncements,
        canWriteAnnouncements,
        enableAdminReviewV3,
        isLoggedIn,
        reviewLoading,
        selectedIds.size,
        handleBulkApprove,
        handleBulkReject,
        handleBulkSchedule,
    ]);

    useEffect(() => {
        setListPage(1);
        setSelectedIds(new Set());
    }, [listQuery, listTypeFilter, listStatusFilter, listSort]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedListQuery(listQuery);
        }, 350);
        return () => window.clearTimeout(timer);
    }, [listQuery]);

    useEffect(() => {
        const payload: ListFilterState = {
            query: listQuery,
            type: listTypeFilter,
            status: listStatusFilter,
            sort: listSort,
        };
        localStorage.setItem(LIST_FILTER_STORAGE_KEY, JSON.stringify(payload));
    }, [listQuery, listTypeFilter, listStatusFilter, listSort]);

    useEffect(() => {
        if (!isLoggedIn || activeAdminTab !== 'list') return;
        if (!hasTrackedFilterRef.current) {
            hasTrackedFilterRef.current = true;
            return;
        }
        trackAdminEvent('admin_filter_applied', {
            query: listQuery.trim(),
            type: listTypeFilter,
            status: listStatusFilter,
            sort: listSort,
        });
    }, [activeAdminTab, isLoggedIn, listQuery, listSort, listStatusFilter, listTypeFilter, trackAdminEvent]);

    useEffect(() => {
        setListPage((page) => Math.min(page, totalPages));
    }, [totalPages]);

    useEffect(() => {
        setAuditPage((page) => Math.min(page, auditTotalPages));
    }, [auditTotalPages]);

    useEffect(() => {
        if (!isLoggedIn || activeAdminTab !== 'list') return;
        refreshListData();
    }, [isLoggedIn, activeAdminTab, debouncedListQuery, listTypeFilter, listStatusFilter, listSort, listPage, refreshListData]);

    useEffect(() => {
        if (!pendingEditId) return;
        const target = announcements.find((item) => item.id === pendingEditId);
        if (!target) return;
        setPendingEditId(null);
        handleEdit(target);
    }, [pendingEditId, announcements]);

    if (!canReadAdmin) {
        return (
            <div className="admin-page">
                <div className="admin-container">
                    <div className="admin-banner warning" role="status">
                        Access denied. Your account does not have permission to access the admin command center.
                    </div>
                </div>
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className="admin-page">
                <AuthLoadingIndicator message="Loading admin command center..." />
            </div>
        );
    }

    return (
        <div className="admin-page">
            <a className="skip-link" href="#admin-main">
                Skip to main content
            </a>
            <AdminNotificationSystem
                notifications={notifications}
                onRemove={removeNotification}
            />

            <div className="toast-stack" role="status" aria-live="polite" aria-atomic="true">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`toast ${toast.tone}`}>
                        <span className="toast-icon">{toast.tone === 'success' ? '✓' : toast.tone === 'error' ? '!' : 'ℹ️'}</span>
                        <span>{toast.message}</span>
                    </div>
                ))}
            </div>
            {enableAdminCommandPalette && (
                <AdminCommandPalette
                    open={isCommandPaletteOpen}
                    query={commandPaletteQuery}
                    onQueryChange={setCommandPaletteQuery}
                    onClose={() => setIsCommandPaletteOpen(false)}
                    commands={commandPaletteCommands}
                    announcements={commandPaletteAnnouncements}
                    onOpenAnnouncement={handleCommandPaletteOpenAnnouncement}
                />
            )}
            <div className="admin-container">
                {rateLimitRemaining && (
                    <div className="admin-banner warning" role="status">
                        Rate limited. Retry in {rateLimitRemaining}s.
                    </div>
                )}
                {currentSession && (
                    <div className="admin-banner info with-actions" role="status">
                        <div className="admin-banner-content">
                            <strong>Secure session active</strong>
                            <span>{currentSession.device} • {currentSession.browser}</span>
                            <span title={currentSession.ip}>IP: {maskIpAddress(currentSession.ip)}</span>
                            <span>{formatLastUpdated(currentSession.lastActivity, 'Last active')}</span>
                        </div>
                        <div className="admin-banner-actions">
                            <button
                                className="admin-btn secondary small"
                                onClick={() => handleNavSelect('security')}
                            >
                                View sessions
                            </button>
                            <button
                                className="admin-btn ghost small"
                                onClick={refreshSessions}
                                disabled={sessionsLoading}
                            >
                                {sessionsLoading ? 'Refreshing…' : 'Refresh'}
                            </button>
                        </div>
                    </div>
                )}
                {!canWriteAnnouncements && (
                    <div className="admin-banner info" role="status">
                        {READ_ONLY_MESSAGE}
                    </div>
                )}
                <div className="admin-hero">
                    <div className="admin-hero-main">
                        <div className="admin-hero-title">
                            <span className="admin-kicker">SarkariExams Admin</span>
                            <h2>Operations Hub</h2>
                            <p className="admin-subtitle">Monitor content health, QA, and growth signals in one place.</p>
                        </div>
                        <div className="admin-hero-actions">
                            <details className="admin-user-menu">
                                <summary className="admin-user-trigger">
                                    <span className="admin-avatar">
                                        {(adminUser?.name ?? adminUser?.email ?? 'A').charAt(0).toUpperCase()}
                                    </span>
                                    <span className="admin-user-info">
                                        <span className="admin-user-name">{adminUser?.name ?? 'Admin'}</span>
                                        <span className="admin-user-role">{adminUser?.role ?? 'admin'}</span>
                                    </span>
                                </summary>
                                <div className="admin-user-panel">
                                    <div className="admin-user-meta">
                                        <span>{adminUser?.email ?? 'admin session'}</span>
                                        <span>Secure session</span>
                                    </div>
                                    <button className="admin-btn logout" onClick={handleLogout}>
                                        Sign out
                                    </button>
                                </div>
                            </details>
                        </div>
                    </div>
                    <div className="admin-hero-metrics">
                        <div className="admin-metric">
                            <span className="metric-label">Total posts</span>
                            <span className="metric-value">{formatNumber(heroTotalPosts, '0')}</span>
                            <span className="metric-sub">All time listings</span>
                        </div>
                        <div className="admin-metric">
                            <span className="metric-label">Total views</span>
                            <span className="metric-value">{formatNumber(heroTotalViews, '0')}</span>
                            <span className="metric-sub">All time views</span>
                        </div>
                        <div className="admin-metric">
                            <span className="metric-label">Active jobs</span>
                            <span className="metric-value">{formatNumber(heroActiveJobs, '0')}</span>
                            <span className="metric-sub">Currently published</span>
                        </div>
                        <div className="admin-metric">
                            <span className="metric-label">New this week</span>
                            <span className="metric-value">{formatNumber(heroNewThisWeek, '0')}</span>
                            <span className="metric-sub">
                                {heroExpiringSoon ? `${heroExpiringSoon} expiring` : 'No expiring alerts'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className={`admin-shell ${isSidebarCollapsed ? 'collapsed' : ''} ${isNavOpen ? 'nav-open' : ''}`}>
                    <aside className="admin-sidebar">
                        <div className="admin-nav">
                            <div className="admin-nav-header">
                                <div>
                                    <span className="admin-nav-title">Navigation</span>
                                    <span className="admin-nav-subtitle">Admin workspace</span>
                                </div>
                                <div className="admin-nav-header-actions">
                                    <span className="admin-nav-pill">{adminUser?.role ?? 'admin'}</span>
                                    <button
                                        type="button"
                                        className="admin-sidebar-toggle"
                                        aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                                        aria-pressed={isSidebarCollapsed}
                                        onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                                    >
                                        {isSidebarCollapsed ? '››' : '‹‹'}
                                    </button>
                                </div>
                            </div>
                            <div className="admin-nav-group">
                                <span className="admin-nav-group-title">Overview</span>
                                <div className="admin-nav-list">
                                    <button
                                        className={`admin-nav-button ${activeAdminTab === 'analytics' ? 'active' : ''}`}
                                        onClick={() => handleNavSelect('analytics')}
                                        aria-label="Analytics"
                                        title="Analytics"
                                        aria-current={activeAdminTab === 'analytics' ? 'page' : undefined}
                                    >
                                        <span className="nav-label">Analytics</span>
                                        <span className="nav-short">AN</span>
                                        <span className="nav-trailing">
                                            {analyticsLoading && <span className="tab-spinner" aria-hidden="true" />}
                                        </span>
                                    </button>
                                    {canAccessTab('users') && (
                                        <button
                                            className={`admin-nav-button ${activeAdminTab === 'users' ? 'active' : ''}`}
                                            onClick={() => handleNavSelect('users')}
                                            aria-label="Users"
                                            title="Users"
                                            aria-current={activeAdminTab === 'users' ? 'page' : undefined}
                                        >
                                            <span className="nav-label">Users</span>
                                            <span className="nav-short">US</span>
                                            <span className="nav-trailing" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="admin-nav-group">
                                <span className="admin-nav-group-title">Content</span>
                                <div className="admin-nav-list">
                                    <button
                                        className={`admin-nav-button ${activeAdminTab === 'list' ? 'active' : ''}`}
                                        onClick={() => handleNavSelect('list')}
                                        aria-label="All announcements"
                                        title="All announcements"
                                        aria-current={activeAdminTab === 'list' ? 'page' : undefined}
                                    >
                                        <span className="nav-label">All Announcements</span>
                                        <span className="nav-short">AL</span>
                                        <span className="nav-trailing" />
                                    </button>
                                    {canAccessTab('review') && (
                                        <button
                                            className={`admin-nav-button ${activeAdminTab === 'review' ? 'active' : ''}`}
                                            onClick={() => handleNavSelect('review')}
                                            aria-label="Review queue"
                                            title="Review queue"
                                            aria-current={activeAdminTab === 'review' ? 'page' : undefined}
                                        >
                                            <span className="nav-label">Review Queue</span>
                                            <span className="nav-short">RQ</span>
                                            <span className="nav-trailing">
                                                {pendingTotal > 0 && (
                                                    <span className="admin-nav-count warning">{formatNumber(pendingTotal, '0')}</span>
                                                )}
                                            </span>
                                        </button>
                                    )}
                                    {canWriteAnnouncements && (
                                        <>
                                            <button
                                                className={`admin-nav-button ${activeAdminTab === 'add' ? 'active' : ''}`}
                                                onClick={() => handleNavSelect('add')}
                                                aria-label="Quick add"
                                                title="Quick add"
                                                aria-current={activeAdminTab === 'add' ? 'page' : undefined}
                                            >
                                                <span className="nav-label">Quick Add</span>
                                                <span className="nav-short">QA</span>
                                                <span className="nav-trailing" />
                                            </button>
                                            <button
                                                className={`admin-nav-button ${activeAdminTab === 'detailed' ? 'active' : ''}`}
                                                onClick={() => handleNavSelect('detailed')}
                                                aria-label="Detailed post"
                                                title="Detailed post"
                                                aria-current={activeAdminTab === 'detailed' ? 'page' : undefined}
                                            >
                                                <span className="nav-label">Detailed Post</span>
                                                <span className="nav-short">DP</span>
                                                <span className="nav-trailing" />
                                            </button>
                                            <button
                                                className={`admin-nav-button ${activeAdminTab === 'bulk' ? 'active' : ''}`}
                                                onClick={() => handleNavSelect('bulk')}
                                                aria-label="Bulk import"
                                                title="Bulk import"
                                                aria-current={activeAdminTab === 'bulk' ? 'page' : undefined}
                                            >
                                                <span className="nav-label">Bulk Import</span>
                                                <span className="nav-short">BI</span>
                                                <span className="nav-trailing" />
                                            </button>
                                        </>
                                    )}
                                    {canAccessTab('queue') && (
                                        <button
                                            className={`admin-nav-button ${activeAdminTab === 'queue' ? 'active' : ''}`}
                                            onClick={() => handleNavSelect('queue')}
                                            aria-label="Schedule queue"
                                            title="Schedule queue"
                                            aria-current={activeAdminTab === 'queue' ? 'page' : undefined}
                                        >
                                            <span className="nav-label">Schedule Queue</span>
                                            <span className="nav-short">SQ</span>
                                            <span className="nav-trailing">
                                                {scheduledTotal > 0 && (
                                                    <span className="admin-nav-count info">{formatNumber(scheduledTotal, '0')}</span>
                                                )}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="admin-nav-group">
                                <span className="admin-nav-group-title">Trust & QA</span>
                                <div className="admin-nav-list">
                                    {canAccessTab('community') && (
                                        <button
                                            className={`admin-nav-button ${activeAdminTab === 'community' ? 'active' : ''}`}
                                            onClick={() => handleNavSelect('community')}
                                            aria-label="Community"
                                            title="Community"
                                            aria-current={activeAdminTab === 'community' ? 'page' : undefined}
                                        >
                                            <span className="nav-label">Community</span>
                                            <span className="nav-short">CM</span>
                                            <span className="nav-trailing" />
                                        </button>
                                    )}
                                    {canAccessTab('errors') && (
                                        <button
                                            className={`admin-nav-button ${activeAdminTab === 'errors' ? 'active' : ''}`}
                                            onClick={() => handleNavSelect('errors')}
                                            aria-label="Error reports"
                                            title="Error reports"
                                            aria-current={activeAdminTab === 'errors' ? 'page' : undefined}
                                        >
                                            <span className="nav-label">Error Reports</span>
                                            <span className="nav-short">ER</span>
                                            <span className="nav-trailing" />
                                        </button>
                                    )}
                                    {canAccessTab('audit') && (
                                        <button
                                            className={`admin-nav-button ${activeAdminTab === 'audit' ? 'active' : ''}`}
                                            onClick={() => handleNavSelect('audit')}
                                            aria-label="Audit log"
                                            title="Audit log"
                                            aria-current={activeAdminTab === 'audit' ? 'page' : undefined}
                                        >
                                            <span className="nav-label">Audit Log</span>
                                            <span className="nav-short">AU</span>
                                            <span className="nav-trailing" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="admin-nav-group">
                                <span className="admin-nav-group-title">Security</span>
                                <div className="admin-nav-list">
                                    {canAccessTab('security') && (
                                        <button
                                            className={`admin-nav-button ${activeAdminTab === 'security' ? 'active' : ''}`}
                                            onClick={() => handleNavSelect('security')}
                                            aria-label="Security"
                                            title="Security"
                                            aria-current={activeAdminTab === 'security' ? 'page' : undefined}
                                        >
                                            <span className="nav-label">Security</span>
                                            <span className="nav-short">SC</span>
                                            <span className="nav-trailing" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="admin-nav-meta">
                                {listUpdatedAt && (
                                    <span className="admin-nav-note">{formatLastUpdated(listUpdatedAt, 'Listings synced')}</span>
                                )}
                                {adminSummaryUpdatedAt && (
                                    <span className="admin-nav-note">{formatLastUpdated(adminSummaryUpdatedAt, 'Ops summary')}</span>
                                )}
                            </div>
                        </div>

                        <div className="admin-sidebar-card admin-ops-card">
                            <div className="admin-ops-header">
                                <div>
                                    <span className="admin-ops-title">Ops pulse</span>
                                    <span className="admin-ops-subtitle">Queue health at a glance</span>
                                </div>
                                {adminSummaryLoading ? (
                                    <span className="admin-ops-status">Syncing…</span>
                                ) : adminSummaryUpdatedAt ? (
                                    <span className="admin-ops-updated">{formatLastUpdated(adminSummaryUpdatedAt, 'Summary')}</span>
                                ) : null}
                            </div>
                            {adminSummaryError && (
                                <div className="admin-ops-error">{adminSummaryError}</div>
                            )}
                            <div className="admin-ops-grid">
                                {opsPulse.filter((stat) => canAccessTab(stat.tab)).map((stat) => (
                                    <button
                                        key={stat.label}
                                        type="button"
                                        className={`admin-ops-item ${stat.tone}`}
                                        onClick={stat.onClick}
                                    >
                                        <span className="admin-ops-value">{formatNumber(stat.value, '0')}</span>
                                        <span className="admin-ops-label">{stat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="admin-sidebar-card admin-settings-card">
                            <div>
                                <span className="admin-ops-title">Workspace settings</span>
                                <span className="admin-ops-subtitle">Theme and time zone preferences</span>
                            </div>
                            <div className="admin-setting">
                                <span className="admin-setting-label">Theme</span>
                                <div className="admin-toggle">
                                    <button
                                        type="button"
                                        className={`admin-btn secondary small ${themeMode === 'dark' ? 'active' : ''}`}
                                        onClick={() => setThemeMode('dark')}
                                    >
                                        Dark
                                    </button>
                                    <button
                                        type="button"
                                        className={`admin-btn secondary small ${themeMode === 'light' ? 'active' : ''}`}
                                        onClick={() => setThemeMode('light')}
                                    >
                                        Light
                                    </button>
                                </div>
                            </div>
                            <div className="admin-setting">
                                <label className="admin-setting-label" htmlFor="admin-timezone-select">Time zone</label>
                                <select
                                    id="admin-timezone-select"
                                    className="admin-select"
                                    value={timeZoneMode}
                                    onChange={(e) => setTimeZoneMode(e.target.value as TimeZoneMode)}
                                >
                                    <option value="local">Local</option>
                                    <option value="ist">IST (Asia/Kolkata)</option>
                                    <option value="utc">UTC</option>
                                </select>
                            </div>
                        </div>

                        <div className="admin-help-panel">
                            <div>
                                <h3>Workflow tips</h3>
                                <p className="admin-subtitle">Quick reminders to keep reviews, scheduling, and bulk edits smooth.</p>
                                <ul className="admin-help-list">
                                    <li>Move drafts to Pending for review, then Approve to publish or Reject to send back.</li>
                                    <li>Schedule posts with a publish time, then manage them in the Schedule Queue tab.</li>
                                    <li>Use Bulk Update to change status or active state across multiple rows.</li>
                                    <li>Audit Log shows approvals, rejects, deletes, and bulk edits for accountability.</li>
                                </ul>
                            </div>
                            <div className="admin-help-actions">
                                {canAccessTab('list') && <button className="admin-btn secondary" onClick={() => handleNavSelect('list')}>Manage listings</button>}
                                {canAccessTab('queue') && <button className="admin-btn secondary" onClick={() => handleNavSelect('queue')}>Schedule queue</button>}
                                {canAccessTab('audit') && <button className="admin-btn secondary" onClick={() => handleNavSelect('audit')}>Audit log</button>}
                            </div>
                        </div>
                    </aside>
                    <button
                        type="button"
                        className="admin-nav-backdrop"
                        aria-hidden="true"
                        onClick={() => setIsNavOpen(false)}
                    />

                    <section className="admin-workspace" id="admin-main" role="main" tabIndex={-1}>
                        {message && <div className="admin-banner" role="status">{message}</div>}

                        <div className="admin-context">
                            <div className="admin-context-info">
                                <div className="admin-breadcrumbs">
                                    {enableAdminNavUx ? (
                                        <button
                                            type="button"
                                            className="breadcrumb-link"
                                            onClick={() => handleNavSelect('analytics')}
                                        >
                                            Admin Command Center
                                        </button>
                                    ) : (
                                        <span>Admin</span>
                                    )}
                                    <span className="breadcrumb-sep">›</span>
                                    <span>{activeTabMeta.label}</span>
                                </div>
                                <span className="admin-context-kicker">Active module</span>
                                <h3>{activeTabMeta.label}</h3>
                                <p className="admin-subtitle">{activeTabMeta.description}</p>
                                <div className="admin-context-meta">
                                    <span className="admin-context-pill">Timezone: {timeZoneLabel}</span>
                                    <span className="admin-context-pill">Theme: {themeMode === 'dark' ? 'Dark' : 'Light'}</span>
                                </div>
                            </div>
                            <div className="admin-context-actions">
                                {enableAdminNavUx && canAccessTab('list') && (
                                    <AdminShellSearch
                                        onSearch={handleShellSearch}
                                        disabled={listLoading}
                                    />
                                )}
                                {enableAdminCommandPalette && (
                                    <button
                                        type="button"
                                        className="admin-btn secondary"
                                        onClick={() => setIsCommandPaletteOpen(true)}
                                    >
                                        Command palette (Ctrl+K)
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="admin-nav-toggle"
                                    onClick={() => setIsNavOpen((prev) => !prev)}
                                    aria-label="Toggle navigation"
                                    aria-expanded={isNavOpen}
                                >
                                    Menu
                                </button>
                                {canWriteAnnouncements && activeAdminTab !== 'add' && activeAdminTab !== 'detailed' && (
                                    <button className="admin-btn primary" onClick={() => handleQuickCreate('job', 'add')}>
                                        {enableAdminNavUx ? 'New announcement' : 'New job post'}
                                    </button>
                                )}
                                {canAccessTab('list') && activeAdminTab !== 'list' && (
                                    <button className="admin-btn secondary" onClick={() => handleNavSelect('list')}>
                                        Manage listings
                                    </button>
                                )}
                                {canAccessTab('review') && activeAdminTab !== 'review' && (
                                    <button className="admin-btn secondary" onClick={() => handleNavSelect('review')}>
                                        Review queue
                                    </button>
                                )}
                            </div>
                        </div>

                        {activeAdminTab === 'analytics' ? (
                            <Suspense fallback={<div className="admin-loading">Loading analytics...</div>}>
                                <AnalyticsDashboard
                                    onEditById={handleEditById}
                                    onOpenList={() => handleNavSelect('list')}
                                    onDrilldown={handleAnalyticsDrilldown}
                                    onMetricDrilldown={(source, query) => trackAdminEvent('admin_metric_drilldown_opened', { source, ...query })}
                                    onUnauthorized={handleUnauthorized}
                                    onLoadingChange={setAnalyticsLoading}
                                    enableUxV2={enableAdminAnalyticsUx}
                                    enableV3={enableAdminAnalyticsV3}
                                />
                            </Suspense>
                        ) : activeAdminTab === 'users' ? (
                            <div className="admin-users">
                                <div className="admin-list-header">
                                    <div>
                                        <h3>User analytics</h3>
                                        <p className="admin-subtitle">Track subscriber growth and engagement.</p>
                                    </div>
                                    <div className="admin-list-actions">
                                        <span className="admin-updated">{formatLastUpdated(dashboardUpdatedAt)}</span>
                                        <button className="admin-btn secondary" onClick={refreshDashboard} disabled={dashboardLoading}>
                                            {dashboardLoading ? 'Refreshing...' : 'Refresh'}
                                        </button>
                                    </div>
                                </div>

                                {dashboardLoading ? (
                                    <div className="admin-loading">Loading user analytics...</div>
                                ) : dashboardError ? (
                                    <div className="admin-error">{dashboardError}</div>
                                ) : (
                                    <div className="admin-user-grid">
                                        <div className="user-card">
                                            <div className="card-label">Total users</div>
                                            <div className="card-value">{dashboard?.users?.totalUsers ?? 0}</div>
                                        </div>
                                        <div className="user-card">
                                            <div className="card-label">New today</div>
                                            <div className="card-value accent">{dashboard?.users?.newToday ?? 0}</div>
                                        </div>
                                        <div className="user-card">
                                            <div className="card-label">New this week</div>
                                            <div className="card-value accent">{dashboard?.users?.newThisWeek ?? 0}</div>
                                        </div>
                                        <div className="user-card">
                                            <div className="card-label">Active subscribers</div>
                                            <div className="card-value">{dashboard?.users?.activeSubscribers ?? 0}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="admin-section-panel">
                                    <div className="admin-list-header">
                                        <div>
                                            <h4>Current users</h4>
                                            <p className="admin-subtitle">Activity in the last {activeUsersWindow} minutes.</p>
                                        </div>
                                        <div className="admin-list-actions">
                                            <label htmlFor="activeWindow" className="admin-inline-label">Window</label>
                                            <select
                                                id="activeWindow"
                                                value={activeUsersWindow}
                                                onChange={(e) => setActiveUsersWindow(parseInt(e.target.value))}
                                            >
                                                {ACTIVE_USER_WINDOWS.map((window) => (
                                                    <option key={window} value={window}>{window}m</option>
                                                ))}
                                            </select>
                                            <span className="admin-updated">{formatLastUpdated(activeUsersUpdatedAt)}</span>
                                            <button className="admin-btn secondary" onClick={refreshActiveUsers} disabled={activeUsersLoading}>
                                                {activeUsersLoading ? 'Refreshing...' : 'Refresh'}
                                            </button>
                                        </div>
                                    </div>

                                    {activeUsersLoading ? (
                                        <div className="admin-loading">Loading active users...</div>
                                    ) : activeUsers ? (
                                        <div className="admin-user-grid">
                                            <div className="user-card">
                                                <div className="card-label">Active now</div>
                                                <div className="card-value">{activeUsers.total}</div>
                                            </div>
                                            <div className="user-card">
                                                <div className="card-label">Authenticated</div>
                                                <div className="card-value">{activeUsers.authenticated}</div>
                                            </div>
                                            <div className="user-card">
                                                <div className="card-label">Anonymous</div>
                                                <div className="card-value">{activeUsers.anonymous}</div>
                                            </div>
                                            <div className="user-card">
                                                <div className="card-label">Admins</div>
                                                <div className="card-value">{activeUsers.admins}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="admin-error">{activeUsersError ?? 'Unable to load active users.'}</div>
                                    )}
                                </div>
                            </div>
                        ) : activeAdminTab === 'community' ? (
                            <div className="admin-list">
                                <div className="admin-list-header">
                                    <div>
                                        <h3>Community moderation</h3>
                                        <p className="admin-subtitle">Review reports, answer Q&amp;A, and remove abusive content.</p>
                                    </div>
                                    <div className="admin-list-actions">
                                        <span className="admin-updated">{formatLastUpdated(communityUpdatedAt)}</span>
                                        <button className="admin-btn secondary" onClick={refreshCommunity} disabled={communityLoading}>
                                            {communityLoading ? 'Refreshing...' : 'Refresh'}
                                        </button>
                                    </div>
                                </div>

                                <div className="admin-toggle">
                                    <button
                                        className={`admin-btn secondary ${communityTab === 'flags' ? 'active' : ''}`}
                                        onClick={() => setCommunityTab('flags')}
                                    >
                                        Flags
                                    </button>
                                    <button
                                        className={`admin-btn secondary ${communityTab === 'forums' ? 'active' : ''}`}
                                        onClick={() => setCommunityTab('forums')}
                                    >
                                        Forums
                                    </button>
                                    <button
                                        className={`admin-btn secondary ${communityTab === 'qa' ? 'active' : ''}`}
                                        onClick={() => setCommunityTab('qa')}
                                    >
                                        Q&amp;A
                                    </button>
                                    <button
                                        className={`admin-btn secondary ${communityTab === 'groups' ? 'active' : ''}`}
                                        onClick={() => setCommunityTab('groups')}
                                    >
                                        Groups
                                    </button>
                                </div>

                                {communityTab === 'flags' && (
                                    <div className="admin-community-filter">
                                        <label htmlFor="flagFilter" className="admin-inline-label">Status</label>
                                        <select
                                            id="flagFilter"
                                            value={flagFilter}
                                            onChange={(e) => setFlagFilter(e.target.value as 'all' | 'open' | 'reviewed' | 'resolved')}
                                        >
                                            <option value="open">Open</option>
                                            <option value="reviewed">Reviewed</option>
                                            <option value="resolved">Resolved</option>
                                            <option value="all">All</option>
                                        </select>
                                    </div>
                                )}

                                {communityError && <div className="admin-error">{communityError}</div>}

                                {communityLoading ? (
                                    <div className="admin-loading">Loading community moderation data...</div>
                                ) : communityTab === 'flags' ? (
                                    <div className="admin-community-grid">
                                        {communityFlags.length === 0 ? (
                                            <div className="empty-state">No flags to review.</div>
                                        ) : (
                                            communityFlags.map((flag) => (
                                                <div key={flag.id} className="admin-community-item">
                                                    <div className="admin-community-header">
                                                        <div>
                                                            <h4>Flagged {flag.entityType.toUpperCase()}</h4>
                                                            <p className="admin-subtitle">{flag.reason}</p>
                                                        </div>
                                                        <span className={`status-pill ${flag.status === 'open' ? 'danger' : 'info'}`}>{flag.status}</span>
                                                    </div>
                                                    <div className="admin-community-meta">
                                                        <span>Item ID: {flag.entityId}</span>
                                                        <span>Reporter: {flag.reporter || 'Anonymous'}</span>
                                                        <span>{new Date(flag.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    <div className="admin-community-actions">
                                                        {canWriteAdmin && (
                                                            <button
                                                                className="admin-btn warning small"
                                                                onClick={() => handleCommunityDelete(flag.entityType, flag.entityId)}
                                                                disabled={communityMutatingIds.has(flag.entityId)}
                                                            >
                                                                Delete item
                                                            </button>
                                                        )}
                                                        {canWriteAdmin && (
                                                            <button
                                                                className="admin-btn secondary small"
                                                                onClick={() => handleResolveFlag(flag.id)}
                                                                disabled={communityMutatingIds.has(flag.id)}
                                                            >
                                                                Resolve flag
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                ) : communityTab === 'forums' ? (
                                    <div className="admin-community-grid">
                                        {communityForums.length === 0 ? (
                                            <div className="empty-state">No forum posts yet.</div>
                                        ) : (
                                            communityForums.map((post) => (
                                                <div key={post.id} className="admin-community-item">
                                                    <div className="admin-community-header">
                                                        <div>
                                                            <h4>{post.title}</h4>
                                                            <p className="admin-subtitle">{post.category}</p>
                                                        </div>
                                                    </div>
                                                    <p className="admin-community-content">{post.content}</p>
                                                    <div className="admin-community-meta">
                                                        <span>By {post.author}</span>
                                                        <span>{new Date(post.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    <div className="admin-community-actions">
                                                        {canWriteAdmin && (
                                                            <button
                                                                className="admin-btn warning small"
                                                                onClick={() => handleCommunityDelete('forum', post.id)}
                                                                disabled={communityMutatingIds.has(post.id)}
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                ) : communityTab === 'qa' ? (
                                    <div className="admin-community-grid">
                                        {communityQa.length === 0 ? (
                                            <div className="empty-state">No Q&amp;A threads yet.</div>
                                        ) : (
                                            communityQa.map((thread) => (
                                                <div key={thread.id} className="admin-community-item">
                                                    <div className="admin-community-header">
                                                        <div>
                                                            <h4>{thread.question}</h4>
                                                            <p className="admin-subtitle">Asked by {thread.author}</p>
                                                        </div>
                                                        <span className={`status-pill ${thread.answer ? 'success' : 'warning'}`}>
                                                            {thread.answer ? 'Answered' : 'Pending'}
                                                        </span>
                                                    </div>
                                                    <div className="admin-community-meta">
                                                        <span>{new Date(thread.createdAt).toLocaleString()}</span>
                                                        {thread.answeredBy && <span>Answered by {thread.answeredBy}</span>}
                                                    </div>
                                                    <div className="admin-community-answer">
                                                        {thread.answer ? thread.answer : 'No answer yet.'}
                                                    </div>
                                                    <textarea
                                                        className="review-note-input compact"
                                                        rows={3}
                                                        placeholder="Write an official answer..."
                                                        value={qaAnswerDrafts[thread.id] ?? ''}
                                                        onChange={(e) => setQaAnswerDrafts((prev) => ({ ...prev, [thread.id]: e.target.value }))}
                                                    />
                                                    <div className="admin-community-actions">
                                                        {canWriteAdmin && (
                                                            <button
                                                                className="admin-btn success small"
                                                                onClick={() => handleAnswerQa(thread.id)}
                                                                disabled={communityMutatingIds.has(thread.id)}
                                                            >
                                                                {communityMutatingIds.has(thread.id) ? 'Saving...' : 'Post answer'}
                                                            </button>
                                                        )}
                                                        {canWriteAdmin && (
                                                            <button
                                                                className="admin-btn warning small"
                                                                onClick={() => handleCommunityDelete('qa', thread.id)}
                                                                disabled={communityMutatingIds.has(thread.id)}
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                ) : (
                                    <div className="admin-community-grid">
                                        {communityGroups.length === 0 ? (
                                            <div className="empty-state">No study groups yet.</div>
                                        ) : (
                                            communityGroups.map((group) => (
                                                <div key={group.id} className="admin-community-item">
                                                    <div className="admin-community-header">
                                                        <div>
                                                            <h4>{group.name}</h4>
                                                            <p className="admin-subtitle">{group.topic}</p>
                                                        </div>
                                                        <span className="status-pill info">{group.language}</span>
                                                    </div>
                                                    <div className="admin-community-meta">
                                                        <span>{new Date(group.createdAt).toLocaleString()}</span>
                                                        {group.link && <span>Invite: {group.link}</span>}
                                                    </div>
                                                    <div className="admin-community-actions">
                                                        {canWriteAdmin && (
                                                            <button
                                                                className="admin-btn warning small"
                                                                onClick={() => handleCommunityDelete('group', group.id)}
                                                                disabled={communityMutatingIds.has(group.id)}
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : activeAdminTab === 'errors' ? (
                            <div className="admin-list">
                                <div className="admin-list-header">
                                    <div>
                                        <h3>Error reports</h3>
                                        <p className="admin-subtitle">Review client error reports submitted from the UI.</p>
                                    </div>
                                    <div className="admin-list-actions">
                                        <span className="admin-updated">{formatLastUpdated(errorReportsUpdatedAt)}</span>
                                        <button className="admin-btn secondary" onClick={refreshErrorReports} disabled={errorReportsLoading}>
                                            {errorReportsLoading ? 'Refreshing...' : 'Refresh'}
                                        </button>
                                    </div>
                                </div>

                                <div className="admin-community-filter">
                                    <label htmlFor="errorStatusFilter" className="admin-inline-label">Status</label>
                                    <select
                                        id="errorStatusFilter"
                                        value={errorReportStatusFilter}
                                        onChange={(e) => setErrorReportStatusFilter(e.target.value as ErrorReportStatus | 'all')}
                                    >
                                        <option value="new">New</option>
                                        <option value="triaged">Triaged</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="all">All</option>
                                    </select>
                                    <label htmlFor="errorIdFilter" className="admin-inline-label">Error ID</label>
                                    <input
                                        id="errorIdFilter"
                                        type="text"
                                        placeholder="Search error ID"
                                        value={errorReportQuery}
                                        onChange={(e) => setErrorReportQuery(e.target.value)}
                                    />
                                </div>

                                {errorReportsError && <div className="admin-error">{errorReportsError}</div>}

                                {errorReportsLoading ? (
                                    <div className="admin-loading">Loading error reports...</div>
                                ) : errorReports.length === 0 ? (
                                    <div className="empty-state">No error reports available.</div>
                                ) : (
                                    <div className="admin-community-grid">
                                        {errorReports.map((report) => (
                                            <div key={report.id} className="admin-community-item">
                                                <div className="admin-community-header">
                                                    <div>
                                                        <h4>{report.message}</h4>
                                                        <p className="admin-subtitle">Error ID: {report.errorId}</p>
                                                    </div>
                                                    <span className={`status-pill ${report.status === 'new' ? 'danger' : report.status === 'resolved' ? 'success' : 'warning'}`}>
                                                        {report.status}
                                                    </span>
                                                </div>
                                                <div className="admin-community-meta">
                                                    <span>{new Date(report.createdAt).toLocaleString()}</span>
                                                    {report.userEmail && <span>User: {report.userEmail}</span>}
                                                    {report.pageUrl && (
                                                        <a href={report.pageUrl} target="_blank" rel="noreferrer" className="community-link">
                                                            Page link
                                                        </a>
                                                    )}
                                                </div>
                                                {report.note && (
                                                    <div className="admin-community-answer">User note: {report.note}</div>
                                                )}
                                                {(report.stack || report.componentStack || report.userAgent) && (
                                                    <details className="admin-trace">
                                                        <summary>Debug details</summary>
                                                        {report.userAgent && (
                                                            <p className="admin-trace-meta"><strong>User agent:</strong> {report.userAgent}</p>
                                                        )}
                                                        {report.stack && (
                                                            <pre className="admin-trace-block">{report.stack}</pre>
                                                        )}
                                                        {report.componentStack && (
                                                            <>
                                                                <p className="admin-trace-meta"><strong>Component stack:</strong></p>
                                                                <pre className="admin-trace-block">{report.componentStack}</pre>
                                                            </>
                                                        )}
                                                    </details>
                                                )}
                                                <textarea
                                                    className="review-note-input compact"
                                                    rows={3}
                                                    placeholder="Add internal triage notes..."
                                                    value={errorReportNotes[report.id] ?? report.adminNote ?? ''}
                                                    onChange={(e) => setErrorReportNotes((prev) => ({ ...prev, [report.id]: e.target.value }))}
                                                />
                                                {canWriteAdmin && (
                                                    <div className="admin-community-actions">
                                                        <button
                                                            className="admin-btn warning small"
                                                            onClick={() => updateErrorReport(report.id, 'triaged')}
                                                            disabled={communityMutatingIds.has(report.id)}
                                                        >
                                                            Mark triaged
                                                        </button>
                                                        <button
                                                            className="admin-btn success small"
                                                            onClick={() => updateErrorReport(report.id, 'resolved')}
                                                            disabled={communityMutatingIds.has(report.id)}
                                                        >
                                                            Resolve
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : activeAdminTab === 'list' ? (
                            <Suspense fallback={<div className="admin-loading">Loading listings...</div>}>
                                <AdminContentList
                                    items={pagedAnnouncements}
                                    loading={listLoading}
                                    total={listTotal}
                                    page={listPage}
                                    totalPages={totalPages}
                                    onPageChange={setListPage}
                                    searchQuery={listQuery}
                                    onSearchChange={setListQuery}
                                    typeFilter={listTypeFilter}
                                    onTypeFilterChange={setListTypeFilter}
                                    statusFilter={listStatusFilter}
                                    onStatusFilterChange={setListStatusFilter}
                                    sortOption={listSort}
                                    onSortChange={setListSort}
                                    onRefresh={refreshListData}
                                    onEdit={handleEdit}
                                    onDelete={(id) => handleDelete(id)}
                                    onView={handleView}
                                    onDuplicate={handleDuplicate}
                                    onTogglePublish={handleTogglePublish}
                                    onBoost={handleBoost}
                                    onExport={() => {
                                        const params = new URLSearchParams();
                                        if (listStatusFilter !== 'all') params.set('status', listStatusFilter);
                                        if (listTypeFilter !== 'all') params.set('type', listTypeFilter);
                                        params.set('includeInactive', 'true');
                                        downloadCsv(`/api/admin/announcements/export/csv?${params.toString()}`, `admin-announcements-${new Date().toISOString().split('T')[0]}.csv`);
                                    }}
                                    onCreate={() => handleQuickCreate('job', 'add')}
                                    selectedIds={selectedIds}
                                    onSelectionChange={setSelectedIds}
                                    onBulkAction={(action) => {
                                        if (action === 'approve') handleBulkUpdate({ status: 'published' });
                                        else if (action === 'reject') handleBulkUpdate({ status: 'pending' });
                                        else if (action === 'archive') handleBulkUpdate({ status: 'archived' });
                                        else if (action === 'delete') {
                                            if (window.confirm('Are you sure you want to move selected items to Draft?')) {
                                                handleBulkUpdate({ status: 'draft' });
                                            }
                                        }
                                    }}
                                    lastUpdated={listUpdatedAt}
                                    formatDateTime={formatDateTime}
                                    timeZoneLabel={timeZoneLabel}
                                    filterSummary={listFilterSummary}
                                    onClearFilters={handleClearListFilters}
                                    quickChips={enableAdminListsV3 ? listQuickChips : []}
                                    presets={enableAdminListsV3 ? listPresets.map((preset) => ({ id: preset.id, label: preset.label })) : []}
                                    selectedPresetId={selectedPresetId}
                                    onSelectPreset={enableAdminListsV3 ? applyListPreset : undefined}
                                    onSavePreset={enableAdminListsV3 ? saveCurrentFiltersAsPreset : undefined}
                                    canWrite={canWriteAnnouncements}
                                    canDelete={canDeleteAnnouncements}
                                    canApprove={canApproveAnnouncements}
                                    enableCompactActions={enableAdminListsUx}
                                />
                            </Suspense>
                        ) : activeAdminTab === 'review' ? (
                            <div className="admin-list">
                                <div className="admin-list-header">
                                    <div>
                                        <h3>Pending review queue</h3>
                                        <p className="admin-subtitle">Approve, reject, or schedule announcements awaiting review.</p>
                                    </div>
                                    <div className="admin-list-actions">
                                        <span className="admin-updated">{formatLastUpdated(listUpdatedAt)}</span>
                                        <button className="admin-btn secondary" onClick={refreshData} disabled={listLoading}>
                                            {listLoading ? 'Refreshing...' : 'Refresh'}
                                        </button>
                                    </div>
                                </div>
                                {enableAdminReviewV3 && !canApproveAnnouncements && (
                                    <div className="admin-banner warning" role="status">
                                        Read-only role: review decisions are disabled for your account.
                                    </div>
                                )}

                                <div className={`admin-review-panel ${enableAdminReviewV3 ? 'sticky' : ''}`}>
                                    <div className="admin-review-meta">
                                        <span>{pendingSlaStats.pendingTotal} pending</span>
                                        <span>Showing {pendingAnnouncements.length} of {pendingSlaStats.pendingTotal}</span>
                                        <span>{selectedIds.size} selected</span>
                                    </div>
                                    <div className="admin-review-controls">
                                        {enableAdminReviewV3 && (
                                            <select
                                                className="admin-select"
                                                value={selectedReviewTemplate}
                                                onChange={(e) => handleReviewTemplateSelect(e.target.value)}
                                                aria-label="Review note templates"
                                            >
                                                <option value="">Decision templates</option>
                                                {REVIEW_NOTE_TEMPLATES.map((template) => (
                                                    <option key={template.id} value={template.id}>{template.label}</option>
                                                ))}
                                            </select>
                                        )}
                                        <input
                                            className="review-note-input"
                                            aria-label="Review note"
                                            type="text"
                                            value={reviewBulkNote}
                                            onChange={(e) => setReviewBulkNote(e.target.value)}
                                            placeholder="Review note for bulk actions"
                                            disabled={reviewLoading}
                                        />
                                        <input
                                            type="datetime-local"
                                            value={reviewScheduleAt}
                                            onChange={(e) => setReviewScheduleAt(e.target.value)}
                                            disabled={reviewLoading}
                                        />
                                        {canApproveAnnouncements && (
                                            <button className="admin-btn success" onClick={() => handleBulkApprove()} disabled={reviewLoading}>
                                                {reviewLoading ? 'Working...' : 'Approve selected'}
                                            </button>
                                        )}
                                        {canApproveAnnouncements && (
                                            <button className="admin-btn warning" onClick={() => handleBulkReject()} disabled={reviewLoading}>
                                                Reject selected
                                            </button>
                                        )}
                                        {canWriteAnnouncements && (
                                            <button className="admin-btn primary" onClick={() => handleBulkSchedule()} disabled={reviewLoading}>
                                                Schedule selected
                                            </button>
                                        )}
                                        {canWriteAnnouncements && (
                                            <button
                                                className="admin-btn info"
                                                onClick={handleBulkQaFix}
                                                disabled={reviewLoading || qaBulkLoading || selectedQaFixableCount === 0}
                                            >
                                                {qaBulkLoading ? 'Working...' : `QA auto-fix (${selectedQaFixableCount})`}
                                            </button>
                                        )}
                                        {canWriteAnnouncements && (
                                            <button
                                                className="admin-btn warning"
                                                onClick={handleBulkQaFlag}
                                                disabled={reviewLoading || qaBulkLoading || selectedQaIssueCount === 0}
                                            >
                                                Flag QA ({selectedQaIssueCount})
                                            </button>
                                        )}
                                        <button className="admin-btn secondary" onClick={clearSelection} disabled={reviewLoading}>
                                            Clear selection
                                        </button>
                                    </div>
                                </div>

                                <div className="admin-section-panel">
                                    <div className="admin-list-header">
                                        <div>
                                            <h4>SLA view</h4>
                                            <p className="admin-subtitle">Ageing pending items and stale backlog (7+ days).</p>
                                        </div>
                                        <div className="admin-list-actions">
                                            <span className="admin-updated">Average age: {pendingSlaStats.averageDays}d</span>
                                        </div>
                                    </div>
                                    <div className="admin-user-grid">
                                        <div className="user-card">
                                            <div className="card-label">&lt; 1 day</div>
                                            <div className="card-value">{pendingSlaStats.buckets.lt1}</div>
                                        </div>
                                        <div className="user-card">
                                            <div className="card-label">1 - 3 days</div>
                                            <div className="card-value">{pendingSlaStats.buckets.d1_3}</div>
                                        </div>
                                        <div className="user-card">
                                            <div className="card-label">3 - 7 days</div>
                                            <div className="card-value">{pendingSlaStats.buckets.d3_7}</div>
                                        </div>
                                        <div className="user-card">
                                            <div className="card-label">Stale &gt; 7d</div>
                                            <div className="card-value accent">{pendingSlaStats.buckets.gt7}</div>
                                        </div>
                                    </div>
                                </div>

                                {pendingSlaStats.stale.length > 0 && (
                                    <div className="admin-table-wrapper">
                                        <table className="admin-table">
                                            <thead>
                                                <tr>
                                                    <th>Stale pending</th>
                                                    <th>Age</th>
                                                    <th>QA</th>
                                                    {enableAdminReviewV3 && <th>Risk</th>}
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pendingSlaStats.stale.map(({ item, ageDays }) => {
                                                    const warnings = getAnnouncementWarnings(item);
                                                    const risk = getReviewRisk(item);
                                                    const reviewNote = reviewNotes[item.id] ?? '';
                                                    const isRowMutating = mutatingIds.has(item.id);
                                                    return (
                                                        <tr key={item.id}>
                                                            <td>
                                                                <div className="title-cell">
                                                                    <div className="title-text" title={item.title}>{item.title}</div>
                                                                    <div className="title-meta">
                                                                        <span title={item.organization || 'Unknown'}>{item.organization || 'Unknown'}</span>
                                                                        <span className="meta-sep">|</span>
                                                                        <span>{item.category || 'Uncategorized'}</span>
                                                                        <span className="meta-sep">|</span>
                                                                        <span>v{(item as any).version ?? 1}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>{ageDays}d</td>
                                                            <td>
                                                                {warnings.length > 0 ? (
                                                                    <span className="qa-warning" title={warnings.join(' • ')}>
                                                                        {warnings.length} issue{warnings.length > 1 ? 's' : ''}
                                                                    </span>
                                                                ) : (
                                                                    <span className="status-sub success">Clear</span>
                                                                )}
                                                            </td>
                                                            {enableAdminReviewV3 && (
                                                                <td>
                                                                    <span className={`status-pill ${risk.severity === 'high' ? 'warning' : risk.severity === 'medium' ? 'info' : 'success'}`}>
                                                                        {risk.severity} ({risk.score})
                                                                    </span>
                                                                </td>
                                                            )}
                                                            <td>
                                                                <div className="table-actions">
                                                                    <input
                                                                        className="review-note-input"
                                                                        aria-label="Review note"
                                                                        type="text"
                                                                        value={reviewNote}
                                                                        onChange={(e) => setReviewNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                                                        placeholder="Review note (optional)"
                                                                        disabled={isRowMutating}
                                                                    />
                                                                    <button className="admin-btn secondary small" onClick={() => handleView(item)} disabled={isRowMutating}>View</button>
                                                                    {canWriteAnnouncements && (
                                                                        <button className="admin-btn primary small" onClick={() => handleEdit(item)} disabled={isRowMutating}>Edit</button>
                                                                    )}
                                                                    {canWriteAnnouncements && warnings.length > 0 && (
                                                                        <>
                                                                            <button
                                                                                className="admin-btn info small"
                                                                                onClick={() => handleQaFix(item)}
                                                                                disabled={isRowMutating}
                                                                                title="Apply automated QA fixes for this row"
                                                                            >
                                                                                Auto-fix
                                                                            </button>
                                                                            <button
                                                                                className="admin-btn warning small"
                                                                                onClick={() => handleQaFlag(item)}
                                                                                disabled={isRowMutating}
                                                                                title="Flag this listing for QA review"
                                                                            >
                                                                                Flag
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    {canApproveAnnouncements && (
                                                                        <button className="admin-btn success small" onClick={() => handleApprove(item.id, reviewNote)} disabled={isRowMutating}>Approve</button>
                                                                    )}
                                                                    {canApproveAnnouncements && (
                                                                        <button className="admin-btn warning small" onClick={() => handleReject(item.id, reviewNote)} disabled={isRowMutating}>Reject</button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {pendingAnnouncements.length === 0 ? (
                                    <div className="empty-state">No announcements pending review.</div>
                                ) : (
                                    <div className="admin-table-wrapper">
                                        <table className="admin-table">
                                            <thead>
                                                <tr>
                                                    <th>
                                                        <input
                                                            type="checkbox"
                                                            aria-label="Select all pending"
                                                            checked={pendingAnnouncements.length > 0 && pendingAnnouncements.every((item) => selectedIds.has(item.id))}
                                                            onChange={(e) => toggleSelectAll(e.target.checked, pendingAnnouncements.map((item) => item.id))}
                                                        />
                                                    </th>
                                                    <th>Title</th>
                                                    <th>Type</th>
                                                    <th>Deadline</th>
                                                    <th>QA</th>
                                                    {enableAdminReviewV3 && <th>Risk</th>}
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pendingAnnouncements.map((item) => {
                                                    const qaWarnings = getAnnouncementWarnings(item);
                                                    const risk = getReviewRisk(item);
                                                    const reviewNote = reviewNotes[item.id] ?? '';
                                                    const isRowMutating = mutatingIds.has(item.id);
                                                    return (
                                                        <tr key={item.id}>
                                                            <td>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedIds.has(item.id)}
                                                                    onChange={() => toggleSelection(item.id)}
                                                                    disabled={isRowMutating}
                                                                />
                                                            </td>
                                                            <td>
                                                                <div className="title-cell">
                                                                    <div className="title-text" title={item.title}>{item.title}</div>
                                                                    <div className="title-meta">
                                                                        <span title={item.organization || 'Unknown'}>{item.organization || 'Unknown'}</span>
                                                                        <span className="meta-sep">|</span>
                                                                        <span>{item.category || 'Uncategorized'}</span>
                                                                        <span className="meta-sep">|</span>
                                                                        <span>v{(item as any).version ?? 1}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td><span className={`type-badge ${item.type}`}>{item.type}</span></td>
                                                            <td>{renderDateCell(item.deadline ?? undefined)}</td>
                                                            <td>
                                                                {qaWarnings.length > 0 ? (
                                                                    <span className="qa-warning" title={qaWarnings.join(' • ')}>
                                                                        {qaWarnings.length} issue{qaWarnings.length > 1 ? 's' : ''}
                                                                    </span>
                                                                ) : (
                                                                    <span className="status-sub success">Looks good</span>
                                                                )}
                                                            </td>
                                                            {enableAdminReviewV3 && (
                                                                <td>
                                                                    <span className={`status-pill ${risk.severity === 'high' ? 'warning' : risk.severity === 'medium' ? 'info' : 'success'}`}>
                                                                        {risk.severity} ({risk.score})
                                                                    </span>
                                                                </td>
                                                            )}
                                                            <td>
                                                                <div className="table-actions">
                                                                    <input
                                                                        className="review-note-input"
                                                                        aria-label="Review note"
                                                                        type="text"
                                                                        value={reviewNote}
                                                                        onChange={(e) => setReviewNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                                                        placeholder="Review note (optional)"
                                                                        disabled={isRowMutating}
                                                                    />
                                                                    <button className="admin-btn secondary small" onClick={() => handleView(item)} disabled={isRowMutating}>View</button>
                                                                    {canWriteAnnouncements && (
                                                                        <button className="admin-btn primary small" onClick={() => handleEdit(item)} disabled={isRowMutating}>Edit</button>
                                                                    )}
                                                                    {canApproveAnnouncements && (
                                                                        <button className="admin-btn success small" onClick={() => handleApprove(item.id, reviewNote)} disabled={isRowMutating}>Approve</button>
                                                                    )}
                                                                    {canApproveAnnouncements && (
                                                                        <button className="admin-btn warning small" onClick={() => handleReject(item.id, reviewNote)} disabled={isRowMutating}>Reject</button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ) : activeAdminTab === 'queue' ? (
                            <Suspense fallback={<div className="admin-loading">Loading schedule queue...</div>}>
                                <AdminQueue
                                    items={scheduledAnnouncements}
                                    stats={scheduledStats}
                                    formatDateTime={formatDateTime}
                                    formatDate={formatDate}
                                    formatTime={formatTime}
                                    timeZoneLabel={timeZoneLabel}
                                    onEdit={handleEdit}
                                    onReschedule={handleReschedule}
                                    onPublishNow={(id) => handleApprove(id, '')}
                                    onReject={(id) => handleReject(id, '')}
                                    onRefresh={refreshData}
                                    onExport={() => { }}
                                    onNewJob={() => handleQuickCreate('job', 'add')}
                                    lastUpdated={listUpdatedAt}
                                    loading={listLoading}
                                    canWrite={canWriteAnnouncements}
                                    canApprove={canApproveAnnouncements}
                                />
                            </Suspense>
                        ) : activeAdminTab === 'detailed' ? (

                            <div className="admin-form-container">
                                <h3>Detailed Job Posting</h3>
                                <p className="admin-form-intro">
                                    Create a comprehensive job posting with all details like UP Police example.
                                </p>

                                {/* Basic Info Section */}
                                <div className="basic-info-section admin-form-card">
                                    <h4 className="admin-form-section-title">Basic Information</h4>
                                    <div className="form-row two-col">
                                        <div className="form-group">
                                            <label htmlFor="detailed-title">Title <span className="field-required">*</span></label>
                                            <input
                                                id="detailed-title"
                                                type="text"
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                onBlur={() => setTouchedFields((prev) => ({ ...prev, title: true }))}
                                                placeholder="e.g. UP Police Constable Recruitment 2026"
                                                required
                                                className={showTitleError ? 'field-invalid' : titleValid ? 'field-valid' : ''}
                                                aria-invalid={showTitleError || undefined}
                                            />
                                            {showTitleError && (
                                                <span className="field-error">Title must be at least 10 characters.</span>
                                            )}
                                            <div className="field-meta">
                                                <span className={`field-status ${titleValid ? 'ok' : 'warn'}`}>
                                                    {(formData.title.trim().length > 0 || submitAttempted)
                                                        ? (titleValid ? '✓ Looks good' : 'Needs 10+ characters')
                                                        : 'Start typing to validate'}
                                                </span>
                                                <span className="field-count">{titleLength}/50</span>
                                            </div>
                                            <div className="field-progress">
                                                <span style={{ width: `${titleProgress}%` }} />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="detailed-organization">Organization <span className="field-required">*</span></label>
                                            <input
                                                id="detailed-organization"
                                                type="text"
                                                value={formData.organization}
                                                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                                onBlur={() => setTouchedFields((prev) => ({ ...prev, organization: true }))}
                                                placeholder="e.g. UPPRPB"
                                                required
                                                className={showOrganizationError ? 'field-invalid' : organizationValid ? 'field-valid' : ''}
                                                aria-invalid={showOrganizationError || undefined}
                                            />
                                            {showOrganizationError && (
                                                <span className="field-error">Organization is required.</span>
                                            )}
                                            {organizationValid && (touchedFields.organization || submitAttempted) && (
                                                <span className="field-status ok">✓ Looks good</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="form-row two-col">
                                        <div className="form-group">
                                            <label htmlFor="detailed-type">Type <span className="field-required">*</span></label>
                                            <select id="detailed-type" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as ContentType })}>
                                                <option value="job">Job</option>
                                                <option value="result">Result</option>
                                                <option value="admit-card">Admit Card</option>
                                                <option value="answer-key">Answer Key</option>
                                                <option value="admission">Admission</option>
                                                <option value="syllabus">Syllabus</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="detailed-category">Category <span className="field-required">*</span></label>
                                            <input
                                                id="detailed-category-search"
                                                type="search"
                                                className="category-search"
                                                placeholder="Filter categories"
                                                value={categorySearch}
                                                onChange={(e) => setCategorySearch(e.target.value)}
                                                aria-label="Filter categories"
                                            />
                                            <select id="detailed-category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                                                {categoryOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.icon} {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-row two-col">
                                        <div className="form-group">
                                            <label htmlFor="detailed-total-posts">Total Posts</label>
                                            <input
                                                id="detailed-total-posts"
                                                type="number"
                                                value={formData.totalPosts}
                                                onChange={(e) => setFormData({ ...formData, totalPosts: e.target.value })}
                                                min={0}
                                                step={1}
                                                inputMode="numeric"
                                                placeholder="e.g. 32679 (numbers only)"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="detailed-deadline">Last Date to Apply</label>
                                            <DatePicker
                                                id="detailed-deadline"
                                                selected={parseDateOnly(formData.deadline)}
                                                onChange={(date: Date | null) => {
                                                    setFormData({ ...formData, deadline: date ? formatDateInput(date) : '' });
                                                    setTouchedFields((prev) => ({ ...prev, deadline: true }));
                                                }}
                                                onBlur={() => setTouchedFields((prev) => ({ ...prev, deadline: true }))}
                                                placeholderText="Select deadline"
                                                className={`admin-datepicker-input ${showDeadlineWarning ? 'field-warning' : ''}`}
                                                calendarClassName="admin-datepicker-calendar"
                                                popperClassName="admin-datepicker-popper"
                                                dateFormat="dd MMM yyyy"
                                                aria-describedby="detailed-deadline-hint"
                                            />
                                            {showDeadlineWarning && (
                                                <span id="detailed-deadline-hint" className="field-error" role="alert">Deadline is in the past.</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="form-row two-col">
                                        <div className="form-group">
                                            <label htmlFor="detailed-salary-min">Salary (Min)</label>
                                            <input
                                                id="detailed-salary-min"
                                                type="number"
                                                value={formData.salaryMin}
                                                onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                                                min={0}
                                                step={1}
                                                inputMode="numeric"
                                                placeholder="e.g. 25000"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="detailed-salary-max">Salary (Max)</label>
                                            <input
                                                id="detailed-salary-max"
                                                type="number"
                                                value={formData.salaryMax}
                                                onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                                                min={0}
                                                step={1}
                                                inputMode="numeric"
                                                placeholder="e.g. 55000"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-row two-col">
                                        <div className="form-group">
                                            <label htmlFor="detailed-difficulty">Difficulty</label>
                                            <select
                                                id="detailed-difficulty"
                                                value={formData.difficulty}
                                                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as 'easy' | 'medium' | 'hard' | '' })}
                                            >
                                                <option value="">Not specified</option>
                                                <option value="easy">Easy</option>
                                                <option value="medium">Medium</option>
                                                <option value="hard">Hard</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="detailed-cutoff">Previous Cutoff</label>
                                            <input
                                                id="detailed-cutoff"
                                                type="text"
                                                value={formData.cutoffMarks}
                                                onChange={(e) => setFormData({ ...formData, cutoffMarks: e.target.value })}
                                                placeholder="e.g. 132/200 or 65%"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-row two-col">
                                        <div className="form-group">
                                            <label htmlFor="detailed-status">Status</label>
                                            <select
                                                id="detailed-status"
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value as AnnouncementStatus })}
                                            >
                                                {STATUS_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="detailed-publish-at">
                                                Publish at
                                                {formData.status !== 'scheduled' && (
                                                    <span className="field-lock" title="Enabled only when Status is Scheduled">🔒</span>
                                                )}
                                            </label>
                                            <DatePicker
                                                id="detailed-publish-at"
                                                selected={parseDateTime(formData.publishAt)}
                                                onChange={(date: Date | null) => {
                                                    setFormData({ ...formData, publishAt: date ? date.toISOString() : '' });
                                                    setTouchedFields((prev) => ({ ...prev, publishAt: true }));
                                                }}
                                                onBlur={() => setTouchedFields((prev) => ({ ...prev, publishAt: true }))}
                                                placeholderText="Select date & time"
                                                className={`admin-datepicker-input ${showPublishAtError ? 'field-invalid' : ''}`}
                                                calendarClassName="admin-datepicker-calendar"
                                                popperClassName="admin-datepicker-popper"
                                                dateFormat="dd MMM yyyy, h:mm aa"
                                                showTimeSelect
                                                timeIntervals={15}
                                                disabled={formData.status !== 'scheduled'}
                                                aria-describedby="detailed-publish-hint"
                                            />
                                            {formData.status !== 'scheduled' && (
                                                <p className="field-hint">Enabled only when Status is Scheduled.</p>
                                            )}
                                            {formData.status === 'scheduled' && (
                                                <p className="field-hint">Time zone: {timeZoneLabel}</p>
                                            )}
                                            {showPublishAtError && (
                                                <span id="detailed-publish-hint" className="field-error" role="alert">Publish time is required for scheduled posts.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {formWarnings.length > 0 && (
                                    <div className="qa-panel">
                                        <h4>QA checks</h4>
                                        <ul>
                                            {formWarnings.map((warning) => {
                                                const tone = getWarningTone(warning);
                                                return (
                                                    <li key={warning} className={`qa-item ${tone}`}>
                                                        <span className="qa-badge" aria-hidden="true">
                                                            {tone === 'critical' ? '🔴' : '🟡'}
                                                        </span>
                                                        <span>{warning}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}

                                {/* Job Details Form */}
                                <Suspense fallback={<div className="admin-loading">Loading job form...</div>}>
                                    <JobPostingForm
                                        initialData={jobDetails || undefined}
                                        isDisabled={titleInvalid || organizationMissing}
                                        onSubmit={async (details) => {
                                            if (!isLoggedIn) {
                                                setMessage('Not authenticated');
                                                return;
                                            }

                                            if (!formData.title || !formData.organization) {
                                                setMessage('Please fill in Title and Organization in Basic Information');
                                                return;
                                            }

                                            setMessage(editingId ? 'Updating...' : 'Saving...');
                                            try {
                                                const url = editingId
                                                    ? `${apiBase}/api/admin/announcements/${editingId}`
                                                    : `${apiBase}/api/admin/announcements`;
                                                const method = editingId ? 'PUT' : 'POST';
                                                const payload = {
                                                    ...formData,
                                                    totalPosts: formData.totalPosts ? parseInt(formData.totalPosts) : undefined,
                                                    salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
                                                    salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : undefined,
                                                    difficulty: formData.difficulty || undefined,
                                                    cutoffMarks: formData.cutoffMarks || undefined,
                                                    publishAt: formData.status === 'scheduled' && formData.publishAt ? normalizeDateTime(formData.publishAt) : undefined,
                                                    jobDetails: details,
                                                };

                                                const response = await adminFetch(url, {
                                                    method,
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                    },
                                                    body: JSON.stringify(payload),
                                                });

                                                if (response.ok) {
                                                    setMessage(editingId ? 'Job posting updated successfully!' : 'Job posting created successfully!');

                                                    setFormData({ ...DEFAULT_FORM_DATA });

                                                    setJobDetails(null);

                                                    setEditingId(null);

                                                    setPreviewData(null);

                                                    refreshData();

                                                    refreshDashboard();

                                                    setActiveAdminTab('list');
                                                } else {
                                                    const error = await response.json();
                                                    setMessage(error.message || 'Failed to save');
                                                }
                                            } catch (error) {
                                                console.error(error);
                                                setMessage('Error saving job posting');
                                            }
                                        }}
                                        onCancel={() => {
                                            setEditingId(null);
                                            setJobDetails(null);
                                            setActiveAdminTab('list');
                                        }}
                                        onPreview={(details) => {
                                            if (!formData.title || !formData.organization) {
                                                setMessage('Please fill in Title and Organization before previewing');
                                                return;
                                            }
                                            setPreviewData({ formData, jobDetails: details });
                                            setShowPreview(true);
                                        }}
                                    />
                                </Suspense>
                            </div>
                        ) : activeAdminTab === 'bulk' ? (
                            <div className="admin-form-container">
                                <h3>Bulk Import Announcements</h3>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>Paste JSON array of announcements below. Required fields: title, type, category, organization.</p>
                                <textarea
                                    value={bulkJson}
                                    onChange={(e) => setBulkJson(e.target.value)}
                                    placeholder={`{
"announcements": [
  {
    "title": "SSC CGL 2025",
    "type": "job",
    "category": "Central Government",
    "organization": "SSC",
    "totalPosts": 5000
  }
]
}`}
                                    style={{
                                        width: '100%',
                                        height: '300px',
                                        fontFamily: 'monospace',
                                        fontSize: '0.9rem',
                                        padding: '15px',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: '8px',
                                        marginBottom: '15px'
                                    }}
                                />
                                <button
                                    className="admin-btn primary"
                                    onClick={async () => {
                                        if (!isLoggedIn) {
                                            setMessage('Not authenticated');
                                            return;
                                        }
                                        try {
                                            const jsonData = JSON.parse(bulkJson);
                                            const response = await adminFetch(`${apiBase}/api/bulk/import`, {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                },
                                                body: JSON.stringify(jsonData),
                                            });
                                            const result = await response.json();
                                            setMessage(result.message || 'Import complete');
                                            if (response.ok) {

                                                refreshData();

                                                refreshDashboard();

                                                setBulkJson('');

                                            }

                                        } catch (err: any) {
                                            setMessage('Invalid JSON: ' + err.message);
                                        }
                                    }}
                                >
                                    Import Announcements
                                </button>
                            </div>
                        ) : activeAdminTab === 'audit' ? (
                            <div className="admin-list">
                                <div className="admin-list-header">
                                    <div>
                                        <h3>Audit log</h3>
                                        <p className="admin-subtitle">Recent admin actions across create, review, and bulk updates.</p>
                                    </div>
                                    <div className="admin-list-actions">
                                        <span className="admin-updated">{formatLastUpdated(auditUpdatedAt)}</span>
                                        <button className="admin-btn secondary" onClick={() => refreshAuditLogs()} disabled={auditLoading}>
                                            {auditLoading ? 'Refreshing...' : 'Refresh'}
                                        </button>
                                    </div>
                                </div>

                                <div className="admin-filter-panel">
                                    <div className="filter-group">
                                        <label htmlFor="audit-admin-id">Admin ID</label>
                                        <input
                                            id="audit-admin-id"
                                            type="text"
                                            value={auditFilters.userId}
                                            onChange={(e) => setAuditFilters((prev) => ({ ...prev, userId: e.target.value }))}
                                            placeholder="User ID"
                                        />
                                    </div>
                                    <div className="filter-group">
                                        <label htmlFor="audit-action">Action</label>
                                        <select
                                            id="audit-action"
                                            value={auditFilters.action}
                                            onChange={(e) => setAuditFilters((prev) => ({ ...prev, action: e.target.value }))}
                                        >
                                            <option value="">All actions</option>
                                            {AUDIT_ACTIONS.map((action) => (
                                                <option key={action} value={action}>{action}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="filter-group">
                                        <label htmlFor="audit-start-date">Start date</label>
                                        <input
                                            id="audit-start-date"
                                            type="date"
                                            value={auditFilters.start}
                                            onChange={(e) => setAuditFilters((prev) => ({ ...prev, start: e.target.value }))}
                                        />
                                    </div>
                                    <div className="filter-group">
                                        <label htmlFor="audit-end-date">End date</label>
                                        <input
                                            id="audit-end-date"
                                            type="date"
                                            value={auditFilters.end}
                                            onChange={(e) => setAuditFilters((prev) => ({ ...prev, end: e.target.value }))}
                                        />
                                    </div>
                                    <div className="filter-group">
                                        <label htmlFor="audit-limit">Limit</label>
                                        <input
                                            id="audit-limit"
                                            type="number"
                                            min={10}
                                            max={200}
                                            value={auditLimit}
                                            onChange={(e) => {
                                                setAuditLimit(Number(e.target.value) || 50);
                                                setAuditPage(1);
                                            }}
                                        />
                                    </div>
                                    <div className="filter-actions">
                                        <button
                                            className="admin-btn secondary"
                                            onClick={() => refreshAuditLogs(1)}
                                            disabled={auditLoading}
                                        >
                                            Apply
                                        </button>
                                        <button
                                            className="admin-btn secondary"
                                            onClick={() => {
                                                setAuditFilters({ userId: '', action: '', start: '', end: '' });
                                                setAuditLimit(50);
                                                refreshAuditLogs(1);
                                            }}
                                            disabled={auditLoading}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>

                                {auditLoading ? (
                                    <div className="admin-loading">Loading audit log...</div>
                                ) : auditError ? (
                                    <div className="admin-error">{auditError}</div>
                                ) : auditLogs.length === 0 ? (
                                    <div className="empty-state">No audit entries yet. Approvals, rejects, deletes, and bulk edits will appear here.</div>
                                ) : (
                                    <>
                                        <div className="admin-table-wrapper">
                                            <table className="admin-table">
                                                <thead>
                                                    <tr>
                                                        <th>Time</th>
                                                        <th>Action</th>
                                                        <th>Title</th>
                                                        <th>Note</th>
                                                        <th>Admin</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {auditLogs.map((log) => (
                                                        <tr key={log.id}>
                                                            <td>{formatDateTime(log.createdAt)}</td>
                                                            <td><span className="status-pill info">{log.action}</span></td>
                                                            <td>{log.title || log.announcementId || '-'}</td>
                                                            <td>{log.note || '-'}</td>
                                                            <td>{log.userId || 'system'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="admin-pagination">
                                            <span className="pagination-info">
                                                Showing {auditStartIndex}-{auditEndIndex} of {auditTotal}
                                            </span>
                                            <button
                                                className="admin-btn secondary small"
                                                onClick={() => refreshAuditLogs(Math.max(1, auditPage - 1))}
                                                disabled={auditLoading || auditPage <= 1}
                                            >
                                                Prev
                                            </button>
                                            <span className="pagination-info">
                                                Page {auditPage} of {auditTotalPages}
                                            </span>
                                            <button
                                                className="admin-btn secondary small"
                                                onClick={() => refreshAuditLogs(Math.min(auditTotalPages, auditPage + 1))}
                                                disabled={auditLoading || auditPage >= auditTotalPages}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : activeAdminTab === 'security' ? (
                            <div className="admin-security">
                                <div className="admin-security-grid">
                                    <div className="admin-security-card">
                                        <div className="security-card-header">
                                            <div>
                                                <h4>Two-factor recovery</h4>
                                                <p className="admin-subtitle">Generate backup codes for account recovery.</p>
                                            </div>
                                            <span className="security-card-pill">
                                                {backupCodesStatus
                                                    ? `${backupCodesStatus.remaining}/${backupCodesStatus.total} remaining`
                                                    : 'Not generated'}
                                            </span>
                                        </div>
                                        <div className="security-card-body">
                                            <div className="security-stat">
                                                <span className="stat-label">Backup codes remaining</span>
                                                <span className="stat-value">{backupCodesStatus?.remaining ?? 0}</span>
                                            </div>
                                            <div className="security-stat">
                                                <span className="stat-label">Last generated</span>
                                                <span className="stat-value">
                                                    {backupCodesStatus?.updatedAt ? formatDateTime(backupCodesStatus.updatedAt) : 'Not generated'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="security-card-actions">
                                            {canWriteAdmin && (
                                                <button
                                                    className="admin-btn primary small"
                                                    onClick={generateBackupCodes}
                                                    disabled={backupCodesLoading}
                                                >
                                                    {backupCodesLoading ? 'Generating…' : 'Generate backup codes'}
                                                </button>
                                            )}
                                            <button
                                                className="admin-btn secondary small"
                                                onClick={refreshBackupCodesStatus}
                                                disabled={backupCodesLoading}
                                            >
                                                Refresh status
                                            </button>
                                        </div>
                                        <p className="security-card-note">
                                            Generate a new set to invalidate old codes and store them somewhere safe.
                                        </p>
                                    </div>

                                    <div className="admin-security-card">
                                        <div className="security-card-header">
                                            <div>
                                                <h4>Session health</h4>
                                                <p className="admin-subtitle">Monitor active sessions and risk signals.</p>
                                            </div>
                                            <span className="security-card-pill">{sessions.length} total</span>
                                        </div>
                                        <div className="security-card-body">
                                            <div className="security-stat">
                                                <span className="stat-label">Active now</span>
                                                <span className="stat-value">{activeSessionCount}</span>
                                            </div>
                                            <div className="security-stat">
                                                <span className="stat-label">High risk</span>
                                                <span className="stat-value">{highRiskSessionCount}</span>
                                            </div>
                                        </div>
                                        <div className="security-card-actions">
                                            <button
                                                className="admin-btn secondary small"
                                                onClick={refreshSessions}
                                                disabled={sessionsLoading}
                                            >
                                                {sessionsLoading ? 'Refreshing…' : 'Refresh sessions'}
                                            </button>
                                            {sessions.length > 1 && (
                                                <button
                                                    className="admin-btn warning small"
                                                    onClick={terminateOtherSessions}
                                                    disabled={sessionsLoading || !canWriteAdmin}
                                                >
                                                    End other sessions
                                                </button>
                                            )}
                                        </div>
                                        <p className="security-card-note">
                                            Terminate unknown sessions immediately if you see unfamiliar devices.
                                        </p>
                                    </div>
                                </div>

                                {sessionsError && <div className="admin-error">{sessionsError}</div>}

                                <Suspense fallback={<div className="admin-loading">Loading sessions...</div>}>
                                    <SessionManager
                                        sessions={sessions}
                                        onTerminateSession={terminateSession}
                                        onTerminateAllOther={terminateOtherSessions}
                                        onRefresh={refreshSessions}
                                        loading={sessionsLoading}
                                        canManage={canWriteAdmin}
                                    />
                                </Suspense>

                                <Suspense fallback={<div className="admin-loading">Loading security logs...</div>}>
                                    <SecurityLogsTable onUnauthorized={handleUnauthorized} />
                                </Suspense>
                            </div>
                        ) : (
                            <div className="admin-form-container">
                                <form onSubmit={handleSubmit} className="admin-form">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="quick-title">
                                                Title <span className="field-required">*</span>
                                            </label>
                                            <input
                                                id="quick-title"
                                                type="text"
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                onBlur={() => setTouchedFields((prev) => ({ ...prev, title: true }))}
                                                placeholder="e.g. SSC CGL 2025 Recruitment"
                                                required
                                                className={showTitleError ? 'field-invalid' : titleValid ? 'field-valid' : ''}
                                                aria-invalid={showTitleError || undefined}
                                                aria-describedby="quick-title-error"
                                            />
                                            {showTitleError && (
                                                <span id="quick-title-error" className="field-error" role="alert">Title must be at least 10 characters.</span>
                                            )}
                                            <div className="field-meta">
                                                <span className={`field-status ${(formData.title.trim().length > 0 || submitAttempted) ? (titleValid ? 'ok' : 'warn') : 'info'}`}>
                                                    {(formData.title.trim().length > 0 || submitAttempted)
                                                        ? (titleValid ? '✓ Looks good' : 'Needs 10+ characters')
                                                        : 'Start typing to validate'}
                                                </span>
                                                <span className="field-count">{titleLength}/50</span>
                                            </div>
                                            <div className="field-progress">
                                                <span style={{ width: `${titleProgress}%` }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-row two-col">
                                        <div className="form-group">
                                            <label htmlFor="quick-type">Type <span className="field-required">*</span></label>
                                            <select id="quick-type" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as ContentType })}>
                                                <option value="job">Job</option>
                                                <option value="result">Result</option>
                                                <option value="admit-card">Admit Card</option>
                                                <option value="answer-key">Answer Key</option>
                                                <option value="admission">Admission</option>
                                                <option value="syllabus">Syllabus</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="quick-category">Category <span className="field-required">*</span></label>
                                            <input
                                                id="quick-category-search"
                                                type="search"
                                                className="category-search"
                                                placeholder="Filter categories"
                                                value={categorySearch}
                                                onChange={(e) => setCategorySearch(e.target.value)}
                                                aria-label="Filter categories"
                                            />
                                            <select id="quick-category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                                                {categoryOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.icon} {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Rest of form fields - simplified for brevity, assume similar to original */}
                                    <div className="form-row two-col">
                                        <div className="form-group">
                                            <label htmlFor="quick-organization">
                                                Organization <span className="field-required">*</span>
                                            </label>
                                            <input
                                                id="quick-organization"
                                                type="text"
                                                value={formData.organization}
                                                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                                onBlur={() => setTouchedFields((prev) => ({ ...prev, organization: true }))}
                                                required
                                                className={showOrganizationError ? 'field-invalid' : organizationValid ? 'field-valid' : ''}
                                                aria-invalid={showOrganizationError || undefined}
                                                aria-describedby="quick-organization-error"
                                            />
                                            {showOrganizationError && (
                                                <span id="quick-organization-error" className="field-error" role="alert">Organization is required.</span>
                                            )}
                                            {organizationValid && (touchedFields.organization || submitAttempted) && (
                                                <span className="field-status ok">✓ Looks good</span>
                                            )}
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="quick-location">Location</label>
                                            <input
                                                id="quick-location"
                                                type="text"
                                                value={formData.location}
                                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-row two-col">
                                        <div className="form-group">
                                            <label htmlFor="quick-total-posts">Total Posts</label>
                                            <input
                                                id="quick-total-posts"
                                                type="number"
                                                value={formData.totalPosts}
                                                onChange={(e) => setFormData({ ...formData, totalPosts: e.target.value })}
                                                min={0}
                                                step={1}
                                                inputMode="numeric"
                                                placeholder="e.g. 32679 (numbers only)"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="quick-deadline">Last Date</label>
                                            <DatePicker
                                                id="quick-deadline"
                                                selected={parseDateOnly(formData.deadline)}
                                                onChange={(date: Date | null) => {
                                                    setFormData({ ...formData, deadline: date ? formatDateInput(date) : '' });
                                                    setTouchedFields((prev) => ({ ...prev, deadline: true }));
                                                }}
                                                onBlur={() => setTouchedFields((prev) => ({ ...prev, deadline: true }))}
                                                placeholderText="Select deadline"
                                                className={`admin-datepicker-input ${showDeadlineWarning ? 'field-warning' : ''}`}
                                                calendarClassName="admin-datepicker-calendar"
                                                popperClassName="admin-datepicker-popper"
                                                dateFormat="dd MMM yyyy"
                                                aria-describedby="quick-deadline-hint"
                                            />
                                            {showDeadlineWarning && (
                                                <span id="quick-deadline-hint" className="field-error" role="alert">Deadline is in the past.</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="form-row two-col">
                                        <div className="form-group">
                                            <label htmlFor="quick-qualification">Qualification</label>
                                            <input
                                                id="quick-qualification"
                                                type="text"
                                                value={formData.minQualification}
                                                onChange={(e) => setFormData({ ...formData, minQualification: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="quick-age-limit">Age Limit</label>
                                            <input
                                                id="quick-age-limit"
                                                type="text"
                                                value={formData.ageLimit}
                                                onChange={(e) => setFormData({ ...formData, ageLimit: e.target.value })}
                                                placeholder="e.g., 18-27 years"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row two-col">
                                        <div className="form-group">
                                            <label htmlFor="quick-salary-min">Salary (Min)</label>
                                            <input
                                                id="quick-salary-min"
                                                type="number"
                                                value={formData.salaryMin}
                                                onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                                                min={0}
                                                step={1}
                                                inputMode="numeric"
                                                placeholder="e.g. 25000"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="quick-salary-max">Salary (Max)</label>
                                            <input
                                                id="quick-salary-max"
                                                type="number"
                                                value={formData.salaryMax}
                                                onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                                                min={0}
                                                step={1}
                                                inputMode="numeric"
                                                placeholder="e.g. 55000"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row two-col">
                                        <div className="form-group">
                                            <label htmlFor="quick-difficulty">Difficulty</label>
                                            <select
                                                id="quick-difficulty"
                                                value={formData.difficulty}
                                                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as 'easy' | 'medium' | 'hard' | '' })}
                                            >
                                                <option value="">Not specified</option>
                                                <option value="easy">Easy</option>
                                                <option value="medium">Medium</option>
                                                <option value="hard">Hard</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="quick-cutoff">Previous Cutoff</label>
                                            <input
                                                id="quick-cutoff"
                                                type="text"
                                                value={formData.cutoffMarks}
                                                onChange={(e) => setFormData({ ...formData, cutoffMarks: e.target.value })}
                                                placeholder="e.g. 132/200 or 65%"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row two-col">
                                        <div className="form-group">
                                            <label htmlFor="quick-application-fee">Application Fee</label>
                                            <input
                                                id="quick-application-fee"
                                                type="text"
                                                value={formData.applicationFee}
                                                onChange={(e) => setFormData({ ...formData, applicationFee: e.target.value })}
                                                placeholder="e.g., ₹500 / NIL"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="quick-external-link">External Link</label>
                                            <input
                                                id="quick-external-link"
                                                type="url"
                                                value={formData.externalLink}
                                                onChange={(e) => setFormData({ ...formData, externalLink: e.target.value })}
                                                onBlur={() => setTouchedFields((prev) => ({ ...prev, externalLink: true }))}
                                                className={showExternalLinkError ? 'field-invalid' : ''}
                                                aria-invalid={showExternalLinkError || undefined}
                                                aria-describedby="quick-external-link-error"
                                            />
                                            {showExternalLinkError && (
                                                <span id="quick-external-link-error" className="field-error" role="alert">Enter a valid URL starting with http or https.</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="form-row two-col">
                                        <div className="form-group">
                                            <label htmlFor="quick-status">Status</label>
                                            <select
                                                id="quick-status"
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value as AnnouncementStatus })}
                                            >
                                                {STATUS_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="quick-publish-at">
                                                Publish at
                                                {formData.status !== 'scheduled' && (
                                                    <span className="field-lock" title="Enabled only when Status is Scheduled">🔒</span>
                                                )}
                                            </label>
                                            <DatePicker
                                                id="quick-publish-at"
                                                selected={parseDateTime(formData.publishAt)}
                                                onChange={(date: Date | null) => {
                                                    setFormData({ ...formData, publishAt: date ? date.toISOString() : '' });
                                                    setTouchedFields((prev) => ({ ...prev, publishAt: true }));
                                                }}
                                                onBlur={() => setTouchedFields((prev) => ({ ...prev, publishAt: true }))}
                                                placeholderText="Select date & time"
                                                className={`admin-datepicker-input ${showPublishAtError ? 'field-invalid' : ''}`}
                                                calendarClassName="admin-datepicker-calendar"
                                                popperClassName="admin-datepicker-popper"
                                                dateFormat="dd MMM yyyy, h:mm aa"
                                                showTimeSelect
                                                timeIntervals={15}
                                                disabled={formData.status !== 'scheduled'}
                                                aria-describedby="quick-publish-hint"
                                            />
                                            {formData.status !== 'scheduled' && (
                                                <p className="field-hint">Enabled only when Status is Scheduled.</p>
                                            )}
                                            {formData.status === 'scheduled' && (
                                                <p className="field-hint">Time zone: {timeZoneLabel}</p>
                                            )}
                                            {showPublishAtError && (
                                                <span id="quick-publish-hint" className="field-error" role="alert">Publish time is required for scheduled posts.</span>
                                            )}
                                        </div>
                                    </div>

                                    {formWarnings.length > 0 && (
                                        <div className="qa-panel">
                                            <h4>QA checks</h4>
                                            <ul>
                                                {formWarnings.map((warning) => {
                                                    const tone = getWarningTone(warning);
                                                    return (
                                                        <li key={warning} className={`qa-item ${tone}`}>
                                                            <span className="qa-badge" aria-hidden="true">
                                                                {tone === 'critical' ? '🔴' : '🟡'}
                                                            </span>
                                                            <span>{warning}</span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="form-actions">
                                        <button type="submit" className="admin-btn primary">Save Announcement</button>
                                        <button type="button" className="admin-btn secondary" onClick={() => setActiveAdminTab('list')}>Cancel</button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {bulkPreview && (
                <div className="admin-modal-overlay" onClick={() => setBulkPreview(null)}>
                    <div
                        className="admin-modal"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="bulk-preview-title"
                    >
                        <div className="admin-modal-header">
                            <div>
                                <h3 id="bulk-preview-title">Bulk impact preview</h3>
                                <p className="admin-subtitle">Review impact before applying this bulk update.</p>
                            </div>
                            <button className="admin-btn secondary small" onClick={() => setBulkPreview(null)}>Close</button>
                        </div>
                        <div className="admin-modal-body">
                            <div className="admin-user-grid">
                                <div className="user-card">
                                    <div className="card-label">Targets</div>
                                    <div className="card-value">{bulkPreview.result.totalTargets}</div>
                                </div>
                                <div className="user-card">
                                    <div className="card-label">Missing IDs</div>
                                    <div className="card-value">{bulkPreview.result.missingIds.length}</div>
                                </div>
                            </div>
                            <div className="bulk-preview-status-grid">
                                {Object.entries(bulkPreview.result.affectedByStatus).map(([status, count]) => (
                                    <span key={status} className="status-pill info">
                                        {status}: {count}
                                    </span>
                                ))}
                            </div>
                            {bulkPreview.result.warnings.length > 0 && (
                                <div className="admin-banner warning" role="status">
                                    <ul className="admin-modal-list">
                                        {bulkPreview.result.warnings.map((warning) => (
                                            <li key={warning}>{warning}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div className="admin-modal-actions">
                                <button className="admin-btn secondary" onClick={() => setBulkPreview(null)}>
                                    Cancel
                                </button>
                                <button className="admin-btn primary" onClick={() => void applyBulkPreview()} disabled={bulkApplying}>
                                    {bulkApplying ? 'Applying...' : 'Apply bulk update'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {reviewPreview && (
                <div className="admin-modal-overlay" onClick={() => setReviewPreview(null)}>
                    <div
                        className="admin-modal"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="review-preview-title"
                    >
                        <div className="admin-modal-header">
                            <div>
                                <h3 id="review-preview-title">Review decision preview</h3>
                                <p className="admin-subtitle">
                                    Action: {reviewPreview.action} · Eligible: {reviewPreview.result.eligibleIds.length}
                                </p>
                            </div>
                            <button className="admin-btn secondary small" onClick={() => setReviewPreview(null)}>Close</button>
                        </div>
                        <div className="admin-modal-body">
                            {reviewPreview.result.warnings.length > 0 && (
                                <div className="admin-banner warning" role="status">
                                    <ul className="admin-modal-list">
                                        {reviewPreview.result.warnings.map((warning) => (
                                            <li key={warning}>{warning}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {reviewPreview.result.blockedIds.length > 0 && (
                                <div className="admin-banner info" role="status">
                                    <strong>Blocked items ({reviewPreview.result.blockedIds.length})</strong>
                                    <ul className="admin-modal-list">
                                        {reviewPreview.result.blockedIds.slice(0, 8).map((entry) => (
                                            <li key={`${entry.id}-${entry.reason}`}>{entry.id}: {entry.reason}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div className="admin-modal-actions">
                                <button className="admin-btn secondary" onClick={() => setReviewPreview(null)}>
                                    Cancel
                                </button>
                                <button className="admin-btn primary" onClick={() => void applyReviewPreview()} disabled={reviewLoading}>
                                    {reviewLoading ? 'Applying...' : `Apply ${reviewPreview.action}`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {
                showPreview && previewData && (
                    <div className="preview-modal-overlay" onClick={() => setShowPreview(false)} style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        zIndex: 1000,
                        overflow: 'auto',
                        padding: '20px'
                    }}>
                        <div
                            className="preview-modal"
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="preview-title"
                            aria-describedby="preview-desc"
                            style={{
                                maxWidth: '1000px',
                                margin: '0 auto',
                                background: 'var(--bg-primary, white)',
                                borderRadius: '16px',
                                overflow: 'hidden'
                            }}>
                            <div className="preview-header" style={{
                                background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-cyan) 100%)',
                                color: 'white',
                                padding: '20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <h2 id="preview-title" style={{ margin: 0 }}>Preview Mode</h2>
                                    <p id="preview-desc" style={{ margin: '5px 0 0', opacity: 0.9 }}>This is how your job posting will appear</p>
                                </div>
                                <button onClick={() => setShowPreview(false)} style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    color: 'white',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}>
                                    Close Preview
                                </button>
                            </div>
                            <div className="preview-content" style={{ padding: '20px' }}>
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.95) 0%, rgba(45, 212, 191, 0.85) 100%)',
                                    color: 'white',
                                    padding: '25px',
                                    borderRadius: '12px',
                                    marginBottom: '20px'
                                }}>
                                    <h1 style={{ margin: '0 0 10px', fontSize: '1.5rem' }}>{previewData.formData.title}</h1>
                                    <p style={{ margin: 0, opacity: 0.9, fontSize: '1.1rem' }}>{previewData.formData.organization}</p>
                                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        <span style={{ background: 'rgba(255,255,255,0.2)', padding: '5px 12px', borderRadius: '20px', fontSize: '0.85rem' }}>
                                            Type: {previewData.formData.type.toUpperCase()}
                                        </span>
                                        <span style={{ background: 'rgba(255,255,255,0.2)', padding: '5px 12px', borderRadius: '20px', fontSize: '0.85rem' }}>
                                            Category: {previewData.formData.category}
                                        </span>
                                        {previewData.formData.totalPosts && (
                                            <span style={{ background: 'rgba(76, 175, 80, 0.3)', padding: '5px 12px', borderRadius: '20px', fontSize: '0.85rem' }}>
                                                Posts: {previewData.formData.totalPosts}
                                            </span>
                                        )}
                                        {(previewData.formData.salaryMin || previewData.formData.salaryMax) && (
                                            <span style={{ background: 'rgba(52, 211, 153, 0.25)', padding: '5px 12px', borderRadius: '20px', fontSize: '0.85rem' }}>
                                                Salary: {previewData.formData.salaryMin || '0'} - {previewData.formData.salaryMax || '∞'}
                                            </span>
                                        )}
                                        {previewData.formData.difficulty && (
                                            <span style={{ background: 'rgba(59, 130, 246, 0.25)', padding: '5px 12px', borderRadius: '20px', fontSize: '0.85rem' }}>
                                                Difficulty: {previewData.formData.difficulty}
                                            </span>
                                        )}
                                        {previewData.formData.cutoffMarks && (
                                            <span style={{ background: 'rgba(245, 158, 11, 0.25)', padding: '5px 12px', borderRadius: '20px', fontSize: '0.85rem' }}>
                                                Prev Cutoff: {previewData.formData.cutoffMarks}
                                            </span>
                                        )}
                                        {previewData.formData.deadline && (
                                            <span style={{ background: 'rgba(244, 67, 54, 0.3)', padding: '5px 12px', borderRadius: '20px', fontSize: '0.85rem' }}>
                                                Deadline: {formatDate(previewData.formData.deadline)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {previewData.jobDetails && (
                                    <JobDetailsRenderer jobDetails={previewData.jobDetails} />
                                )}
                            </div>
                            <div className="preview-footer" style={{
                                padding: '20px',
                                borderTop: '1px solid var(--border-primary)',
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '15px'
                            }}>
                                <button onClick={() => setShowPreview(false)} style={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-primary)',
                                    padding: '12px 30px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}>
                                    Back to Edit
                                </button>
                                <button onClick={async () => {
                                    setShowPreview(false);
                                    if (!isLoggedIn || !previewData) return;
                                    setMessage(editingId ? 'Publishing...' : 'Creating...');
                                    try {
                                        const url = editingId
                                            ? `${apiBase}/api/admin/announcements/${editingId}`
                                            : `${apiBase}/api/admin/announcements`;
                                        const response = await adminFetch(url, {
                                            method: editingId ? 'PUT' : 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                            },
                                            body: JSON.stringify({
                                                ...previewData.formData,
                                                totalPosts: previewData.formData.totalPosts ? parseInt(previewData.formData.totalPosts) : undefined,
                                                salaryMin: previewData.formData.salaryMin ? parseInt(previewData.formData.salaryMin) : undefined,
                                                salaryMax: previewData.formData.salaryMax ? parseInt(previewData.formData.salaryMax) : undefined,
                                                difficulty: previewData.formData.difficulty || undefined,
                                                cutoffMarks: previewData.formData.cutoffMarks || undefined,
                                                publishAt: previewData.formData.status === 'scheduled' && previewData.formData.publishAt ? normalizeDateTime(previewData.formData.publishAt) : undefined,
                                                jobDetails: previewData.jobDetails,
                                            }),
                                        });
                                        if (response.ok) {
                                            setMessage('Published successfully!');

                                            setFormData({ ...DEFAULT_FORM_DATA });

                                            setJobDetails(null);

                                            setEditingId(null);

                                            setPreviewData(null);

                                            refreshData();

                                            refreshDashboard();

                                            setActiveAdminTab('list');
                                        } else {
                                            const error = await response.json();
                                            setMessage(error.message || 'Failed to publish');
                                        }
                                    } catch (error) {
                                        console.error(error);
                                        setMessage('Error publishing');
                                    }
                                }} style={{
                                    background: 'linear-gradient(135deg, var(--accent-green) 0%, #16a34a 100%)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 30px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '1rem'
                                }}>
                                    Save Announcement
                                </button>
                            </div>
                        </div>
                    </div>
                )

            }

            {versionTarget && (
                <div className="admin-modal-overlay" onClick={() => setVersionTarget(null)}>
                    <div
                        className="admin-modal"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="version-history-title"
                        aria-describedby="version-history-desc"
                    >
                        <div className="admin-modal-header">
                            <div>
                                <h3 id="version-history-title">Version history</h3>
                                <p id="version-history-desc" className="admin-subtitle">{versionTarget.title}</p>
                            </div>
                            <button className="admin-btn secondary small" onClick={() => setVersionTarget(null)}>Close</button>
                        </div>
                        <div className="admin-modal-body">
                            {(versionTarget as any).versions && (versionTarget as any).versions.length > 0 ? (
                                <div className="version-list">
                                    {(versionTarget as any).versions.map((version: any) => (
                                        <div key={`${versionTarget.id}-${version.version}`} className="version-card">
                                            <div className="version-meta">
                                                <span>Version {version.version}</span>
                                                <span>{formatDateTime(version.updatedAt)}</span>
                                                <span>{version.updatedBy || 'system'}</span>
                                            </div>
                                            <div className="version-details">
                                                <div><strong>Title:</strong> {version.snapshot.title || '-'}</div>
                                                <div><strong>Status:</strong> {version.snapshot.status || 'published'}</div>
                                                <div><strong>Publish at:</strong> {formatDateTime(version.snapshot.publishAt)}</div>
                                                {version.note && <div><strong>Note:</strong> {version.note}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">No version history yet. Edits create snapshots for review.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {backupCodesModal && (
                <div className="admin-modal-overlay" onClick={() => setBackupCodesModal(null)}>
                    <div
                        className="admin-modal"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="backup-codes-title"
                        aria-describedby="backup-codes-desc"
                    >
                        <div className="admin-modal-header">
                            <div>
                                <h3 id="backup-codes-title">Backup codes</h3>
                                <p id="backup-codes-desc" className="admin-subtitle">
                                    Save these codes securely. Each code can be used once.
                                </p>
                            </div>
                            <button className="admin-btn secondary small" onClick={() => setBackupCodesModal(null)}>Close</button>
                        </div>
                        <div className="admin-modal-body">
                            <div className="backup-codes-meta">
                                Generated: {formatDateTime(backupCodesModal.generatedAt)}
                            </div>
                            <div className="backup-codes-grid">
                                {backupCodesModal.codes.map((code) => (
                                    <div key={code} className="backup-code-chip">{code}</div>
                                ))}
                            </div>
                            <div className="backup-codes-actions">
                                <button className="admin-btn secondary" onClick={() => copyBackupCodes(backupCodesModal.codes)}>
                                    Copy codes
                                </button>
                                <button className="admin-btn primary" onClick={() => downloadBackupCodes(backupCodesModal.codes)}>
                                    Download .txt
                                </button>
                            </div>
                            <p className="security-card-note">
                                Generating a new set invalidates all previous backup codes.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Wrap with ConfirmDialogProvider for async confirmation dialogs
function AdminPageWithProvider() {
    return (
        <ConfirmDialogProvider>
            <AdminPage />
        </ConfirmDialogProvider>
    );
}

export default AdminPageWithProvider;



