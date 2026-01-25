import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnalyticsDashboard } from '../components/admin/AnalyticsDashboard';
import { JobPostingForm, type JobDetails } from '../components/admin/JobPostingForm';
import { JobDetailsRenderer } from '../components/details/JobDetailsRenderer';
import { SecurityLogsTable } from '../components/admin/SecurityLogsTable';
import { ConfirmDialogProvider, useConfirmDialog } from '../components/admin/ConfirmDialog';
import { CopyButton } from '../components/admin/CopyButton';
import { AdminSkeleton } from '../components/admin/AdminSkeleton';
import { AdminLogin } from '../components/admin/AdminLogin';
import { AdminContentList } from '../components/admin/AdminContentList';
import { AdminQueue } from '../components/admin/AdminQueue';
import { ScheduleCalendar } from '../components/admin/ScheduleCalendar';
import { useKeyboardShortcuts, type KeyboardShortcut } from '../hooks/useKeyboardShortcuts';
import type { Announcement, ContentType, AnnouncementStatus } from '../types';
import { getApiErrorMessage } from '../utils/errors';
import { adminRequest } from '../utils/adminRequest';
import './AdminPage.css';

const apiBase = import.meta.env.VITE_API_BASE ?? '';

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

type ToastTone = 'success' | 'error' | 'info';
type Toast = {
    id: string;
    message: string;
    tone: ToastTone;
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

const LIST_SORT_OPTIONS: { value: 'newest' | 'updated' | 'deadline' | 'views'; label: string }[] = [
    { value: 'newest', label: 'Newest first' },
    { value: 'updated', label: 'Recently updated' },
    { value: 'deadline', label: 'Deadline soonest' },
    { value: 'views', label: 'Most viewed' },
];

const LIST_FILTER_STORAGE_KEY = 'adminListFilters';
const ADMIN_USER_STORAGE_KEY = 'adminUserProfile';

type ListFilterState = {
    query?: string;
    type?: ContentType | 'all';
    status?: AnnouncementStatus | 'all';
    sort?: 'newest' | 'updated' | 'deadline' | 'views';
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

type AdminUserProfile = {
    name?: string;
    email?: string;
    role?: string;
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
    status: 'published' as AnnouncementStatus,
    publishAt: '',
};


export function AdminPage() {
    const navigate = useNavigate();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginForm, setLoginForm] = useState({ email: '', password: '' });
    const [activeAdminTab, setActiveAdminTab] = useState<'analytics' | 'list' | 'review' | 'add' | 'detailed' | 'bulk' | 'queue' | 'security' | 'users' | 'audit'>('analytics');
    const [adminUser, setAdminUser] = useState<AdminUserProfile | null>(() => loadAdminUser());
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [listAnnouncements, setListAnnouncements] = useState<Announcement[]>([]);
    const [listTotal, setListTotal] = useState(0);
    const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
    const storedFilters = useMemo(() => loadListFilters(), []);
    const [listQuery, setListQuery] = useState(storedFilters?.query ?? '');
    const [debouncedListQuery, setDebouncedListQuery] = useState(listQuery);
    const [listTypeFilter, setListTypeFilter] = useState<ContentType | 'all'>(storedFilters?.type ?? 'all');
    const [listSort, setListSort] = useState<'newest' | 'updated' | 'deadline' | 'views'>(storedFilters?.sort ?? 'newest');
    const [listPage, setListPage] = useState(1);
    const [categorySearch, setCategorySearch] = useState('');

    const [listStatusFilter, setListStatusFilter] = useState<AnnouncementStatus | 'all'>(storedFilters?.status ?? 'all');
    const [listLoading, setListLoading] = useState(false);
    const [listUpdatedAt, setListUpdatedAt] = useState<string | null>(null);
    const [listExporting, setListExporting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkStatus, setBulkStatus] = useState<AnnouncementStatus | ''>('');
    const [bulkPublishAt, setBulkPublishAt] = useState('');
    const [bulkIsActive, setBulkIsActive] = useState<'keep' | 'active' | 'inactive'>('keep');
    const [bulkLoading, setBulkLoading] = useState(false);
    const [qaBulkLoading, setQaBulkLoading] = useState(false);
    const [reviewBulkNote, setReviewBulkNote] = useState('');
    const [reviewScheduleAt, setReviewScheduleAt] = useState('');
    const [reviewLoading, setReviewLoading] = useState(false);
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
    const [scheduleView, setScheduleView] = useState<'list' | 'calendar'>('list');
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
    const [loginLoading, setLoginLoading] = useState(false);
    const [mutatingIds, setMutatingIds] = useState<Set<string>>(new Set());
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [pendingEditId, setPendingEditId] = useState<string | null>(null);
    const listRequestInFlight = useRef(false);
    const listLastFetchAt = useRef(0);
    const listRateLimitUntil = useRef(0);
    const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
    const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);

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
    const pushToast = (message: string, tone: ToastTone = 'info') => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts((prev) => [...prev, { id, message, tone }]);
        window.setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 3000);
    };

    const clearAdminSession = useCallback(() => {
        setIsLoggedIn(false);
        setAdminUser(null);
        localStorage.removeItem('adminToken');
        localStorage.removeItem(ADMIN_USER_STORAGE_KEY);
        setActiveAdminTab('analytics');
    }, []);

    // Keyboard shortcuts for admin panel
    const keyboardShortcuts: KeyboardShortcut[] = useMemo(() => [
        {
            key: 'n',
            ctrl: true,
            handler: () => {
                if (isLoggedIn) {
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
                if (isLoggedIn) setActiveAdminTab('list');
            },
            description: 'Go to list view',
        },
    ], [isLoggedIn, activeAdminTab]);

    useKeyboardShortcuts(keyboardShortcuts, isLoggedIn);

    const handleUnauthorized = useCallback((reason = 'Session expired. Please log in again.') => {
        clearAdminSession();
        setMessage(reason);
        pushToast(reason, 'error');
    }, [clearAdminSession, pushToast]);

    const adminFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
        const method = (init?.method ?? 'GET').toUpperCase();
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
        if (response.status === 401 || response.status === 403) {
            handleUnauthorized();
        }
        return response;
    }, [handleUnauthorized]);

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
        try {
            await adminRequest(`${apiBase}/api/auth/logout`, {
                method: 'POST',
                maxRetries: 0,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: '{}',
            });
        } catch (error) {
            console.error('Logout API call failed:', error);
        }
        clearAdminSession();
        pushToast('Logged out successfully.', 'info');
    }, [clearAdminSession, pushToast]);

    const checkSession = useCallback(async () => {
        try {
            const response = await adminRequest(`${apiBase}/api/auth/me`, {
                maxRetries: 1,
            });
            if (!response.ok) {
                clearAdminSession();
                return;
            }
            const payload = await response.json();
            const userData = payload.data?.user;
            if (userData?.role !== 'admin') {
                clearAdminSession();
                return;
            }
            const profile: AdminUserProfile = {
                name: userData?.name || 'Admin',
                email: userData?.email,
                role: userData?.role,
            };
            setAdminUser(profile);
            localStorage.setItem(ADMIN_USER_STORAGE_KEY, JSON.stringify(profile));
            setIsLoggedIn(true);
        } catch (error) {
            console.error('Session check failed:', error);
            clearAdminSession();
        }
    }, [clearAdminSession]);

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
            setAnnouncements(data.data || []);
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
            setListAnnouncements(data.data || []);
            setListTotal(data.meta?.total ?? data.data?.length ?? 0);
            setListUpdatedAt(new Date().toISOString());
        } catch (error) {
            console.error(error);
            setMessage('Failed to load announcements.');
        } finally {
            listRequestInFlight.current = false;
            setListLoading(false);
        }
    }, [adminFetch, debouncedListQuery, isLoggedIn, listPage, listSort, listStatusFilter, listTypeFilter, pageSize]);

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
            setActiveUsers(data.data ?? null);
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
                return;
            }
            const payload = await res.json();
            setDashboard(payload.data ?? null);
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
                return;
            }
            const payload = await res.json();
            setAdminSummary(payload.data ?? null);
            setAdminSummaryUpdatedAt(new Date().toISOString());
        } catch (error) {
            console.error(error);
            setAdminSummaryError('Failed to load admin summary.');
        } finally {
            setAdminSummaryLoading(false);
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
            setAuditLogs(payload.data ?? []);
            setAuditTotal(payload.meta?.total ?? payload.data?.length ?? 0);
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


    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this announcement?')) return;
        if (!isLoggedIn) {
            setMessage('Not authenticated.');
            return;
        }

        updateMutating(id, true);
        try {
            const response = await adminFetch(`${apiBase}/api/admin/announcements/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setMessage('Deleted successfully');
                refreshData();
                refreshDashboard();
            } else {
                const errorBody = await response.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Failed to delete announcement.'));
            }
        } catch (error) {
            console.error(error);
            setMessage('Error deleting announcement');
        } finally {
            updateMutating(id, false);
        }
    };

    const handleEdit = (item: Announcement) => {
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
            status: item.status ?? 'published',
            publishAt: formatDateTimeInput(item.publishAt),
        });
        setEditingId(item.id);

        // Load jobDetails if available for detailed editing
        if (item.jobDetails && Object.keys(item.jobDetails).length > 0) {
            setJobDetails(item.jobDetails);
            setActiveAdminTab('detailed');
            setMessage(`Editing (Detailed): ${item.title}`);
        } else {
            setActiveAdminTab('add');
            setMessage(`Editing: ${item.title}`);
        }
    };
    const handleDuplicate = (item: Announcement) => {
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
            status: 'draft',
            publishAt: '',
        });
        const hasDetails = item.jobDetails && Object.keys(item.jobDetails).length > 0;
        setJobDetails(hasDetails ? item.jobDetails ?? null : null);
        setEditingId(null);
        setShowPreview(false);
        setPreviewData(null);
        setActiveAdminTab(hasDetails ? 'detailed' : 'add');
        setMessage(`Duplicating: ${item.title}`);
    };

    const handleReschedule = async (itemId: string, newDate: Date) => {
        const item = scheduledAnnouncements.find(i => i.id === itemId);
        if (!item) return;

        if (!window.confirm(`Reschedule "${item.title}" to ${newDate.toLocaleDateString()}?`)) {
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
                setMessage(`Rescheduled to ${newDate.toLocaleDateString()}`);
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
        setFormData({ ...DEFAULT_FORM_DATA, type });
        setJobDetails(null);
        setEditingId(null);
        setShowPreview(false);
        setPreviewData(null);
        setActiveAdminTab(mode);
        setMessage('');
    };

    const handleView = (item: Announcement) => {
        if (!item.slug) return;
        const url = `/${item.type}/${item.slug}`;
        window.open(url, '_blank', 'noopener,noreferrer');
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

    const handleApprove = async (id: string, note?: string) => {
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

    const handleBulkUpdate = async (options?: { status?: AnnouncementStatus, isActive?: boolean, publishAt?: string }) => {
        if (!isLoggedIn) {
            setMessage('Not authenticated.');
            return;
        }
        if (selectedIds.size === 0) {
            setMessage('Select at least one announcement for bulk updates.');
            return;
        }

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

        setBulkLoading(true);
        try {
            const response = await adminFetch(`${apiBase}/api/admin/announcements/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ids: Array.from(selectedIds),
                    data: payload,
                }),
            });

            if (response.ok) {
                setMessage('Bulk update complete.');
                setBulkStatus('');
                setBulkPublishAt('');
                setBulkIsActive('keep');
                clearSelection();
                refreshData();
                refreshDashboard();
            } else {
                const errorBody = await response.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Bulk update failed.'));
            }
        } catch (error) {
            console.error(error);
            setMessage('Error applying bulk update.');
        } finally {
            setBulkLoading(false);
        }
    };

    const handleExportAnnouncements = async () => {
        if (!isLoggedIn) {
            setMessage('Not authenticated.');
            return;
        }

        setListExporting(true);
        try {
            const params = new URLSearchParams();
            params.set('includeInactive', 'true');
            if (listStatusFilter !== 'all') {
                params.set('status', listStatusFilter);
            }
            if (listTypeFilter !== 'all') {
                params.set('type', listTypeFilter);
            }

            const response = await adminFetch(`${apiBase}/api/admin/announcements/export/csv?${params.toString()}`);

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Failed to export announcements.'));
                return;
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `announcements-${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            setMessage('Failed to export announcements.');
        } finally {
            setListExporting(false);
        }
    };

    const handleBulkApprove = async () => {
        if (!isLoggedIn) {
            setMessage('Not authenticated.');
            return;
        }
        if (selectedIds.size === 0) {
            setMessage('Select at least one announcement to approve.');
            return;
        }

        setReviewLoading(true);
        try {
            const response = await adminFetch(`${apiBase}/api/admin/announcements/bulk-approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ids: Array.from(selectedIds),
                    note: reviewBulkNote.trim() || undefined,
                }),
            });

            if (response.ok) {
                setMessage('Bulk approve complete.');
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

    const handleBulkReject = async () => {
        if (!isLoggedIn) {
            setMessage('Not authenticated.');
            return;
        }
        if (selectedIds.size === 0) {
            setMessage('Select at least one announcement to reject.');
            return;
        }

        setReviewLoading(true);
        try {
            const response = await adminFetch(`${apiBase}/api/admin/announcements/bulk-reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ids: Array.from(selectedIds),
                    note: reviewBulkNote.trim() || undefined,
                }),
            });

            if (response.ok) {
                setMessage('Bulk reject complete.');
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

    const handleBulkSchedule = async () => {
        if (!isLoggedIn) {
            setMessage('Not authenticated.');
            return;
        }
        if (selectedIds.size === 0) {
            setMessage('Select at least one announcement to schedule.');
            return;
        }
        if (!reviewScheduleAt) {
            setMessage('Publish time is required for scheduling.');
            return;
        }

        setReviewLoading(true);
        try {
            const response = await adminFetch(`${apiBase}/api/admin/announcements/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ids: Array.from(selectedIds),
                    data: {
                        status: 'scheduled',
                        publishAt: normalizeDateTime(reviewScheduleAt),
                        note: reviewBulkNote.trim() || undefined,
                    },
                }),
            });

            if (response.ok) {
                setMessage('Bulk schedule complete.');
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

    const handleBulkQaFix = async () => {
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

    const handleScheduleOne = async (id: string, publishAt: string) => {
        if (!isLoggedIn) return;
        updateMutating(id, true);
        try {
            const response = await adminFetch(`${apiBase}/api/admin/announcements/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'scheduled',
                    publishAt: normalizeDateTime(publishAt),
                    note: reviewBulkNote.trim() || undefined,
                }),
            });

            if (response.ok) {
                setMessage('Announcement scheduled.');
                refreshData();
                refreshDashboard();
                refreshAuditLogs();
            } else {
                const errorBody = await response.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Failed to schedule announcement.'));
            }
        } catch (error) {
            console.error(error);
            setMessage('Error scheduling announcement.');
        } finally {
            updateMutating(id, false);
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


    // Handle login - call real auth API
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('Logging in...');
        setLoginLoading(true);
        try {
            const response = await adminRequest(`${apiBase}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                maxRetries: 0,
                body: JSON.stringify(loginForm),
            });

            if (response.ok) {
                const result = await response.json();
                const userData = result.data?.user || result.user;
                if (userData?.role === 'admin') {
                    const profile: AdminUserProfile = {
                        name: userData?.name || userData?.username || 'Admin',
                        email: userData?.email || loginForm.email,
                        role: userData?.role,
                    };
                    setAdminUser(profile);
                    localStorage.setItem(ADMIN_USER_STORAGE_KEY, JSON.stringify(profile));
                    setIsLoggedIn(true);
                    setMessage('');
                    pushToast('Login successful!', 'success');
                    refreshData();
                    refreshDashboard();
                } else {
                    setMessage('Access denied. Admin role required.');
                }
            } else {
                const errorResult = await response.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorResult, 'Invalid credentials.'));
            }
        } catch (error) {
            console.error(error);
            setMessage('Login failed. Check your connection.');
        } finally {
            setLoginLoading(false);
        }
    };

    // Handle form submit (create or update announcement)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('Processing...');

        if (!isLoggedIn) {
            setMessage('Not authenticated. Please log in again.');
            setIsLoggedIn(false);
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
                setMessage(editingId ? 'Announcement updated successfully!' : 'Announcement created successfully!');

                setFormData({ ...DEFAULT_FORM_DATA });

                setEditingId(null);

                refreshData();

                refreshDashboard();

                setActiveAdminTab('list');

            } else {
                const errorBody = await response.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Failed to save announcement.'));
            }
        } catch (error) {
            console.error(error);
            setMessage('Error saving announcement.');
        }
    };

    const contentCounts = useMemo(() => {
        if (adminSummary?.counts?.byType) {
            return adminSummary.counts.byType;
        }
        const counts: Record<string, number> = {};
        for (const item of announcements) {
            counts[item.type] = (counts[item.type] ?? 0) + 1;
        }
        return counts;
    }, [adminSummary, announcements]);

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
        return announcements.filter((item) => (item.status ?? 'published') === 'pending');
    }, [announcements]);

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
    }, [scheduledAnnouncements]);

    const formWarnings = useMemo(() => getFormWarnings(), [formData]);
    const titleMissing = !formData.title.trim();
    const titleTooShort = formData.title.trim().length > 0 && formData.title.trim().length < 10;
    const titleInvalid = titleMissing || titleTooShort;
    const organizationMissing = !formData.organization.trim();
    const titleLength = formData.title.trim().length;
    const titleProgress = Math.min(100, Math.round((titleLength / 50) * 100));
    const titleValid = titleLength >= 10;
    const organizationValid = !organizationMissing;

    const scheduleCalendar = useMemo(() => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        return Array.from({ length: 7 }, (_, index) => {
            const day = new Date(start);
            day.setDate(start.getDate() + index);
            const key = getDateKey(day);
            const items = scheduledAnnouncements.filter((item) => getDateKey(item.publishAt) === key);
            return {
                key,
                label: day.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }),
                items,
            };
        });
    }, [scheduledAnnouncements]);

    const filteredAnnouncements = useMemo(() => listAnnouncements, [listAnnouncements]);

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

    const getAvailabilityStatus = (item: Announcement) => {
        if (item.deadline) {
            const deadlineTime = new Date(item.deadline).getTime();
            if (!Number.isNaN(deadlineTime) && deadlineTime < Date.now()) {
                return { label: 'Expired', tone: 'danger' };
            }
        }
        if (item.isActive === false) {
            return { label: 'Inactive', tone: 'muted' };
        }
        return { label: 'Active', tone: 'success' };
    };

    const getWorkflowStatus = (item: Announcement) => {
        const status = item.status ?? 'published';
        switch (status) {
            case 'draft':
                return { label: 'Draft', tone: 'muted' };
            case 'pending':
                return { label: 'Pending', tone: 'warning' };
            case 'scheduled':
                return { label: 'Scheduled', tone: 'info' };
            case 'archived':
                return { label: 'Archived', tone: 'muted' };
            case 'published':
            default:
                return { label: 'Published', tone: 'success' };
        }
    };

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
            const deadlineTime = new Date(formData.deadline).getTime();
            if (!Number.isNaN(deadlineTime) && deadlineTime < Date.now()) {
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

    const formatDate = (value?: string) => {
        if (!value) return 'N/A';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatDateTime = (value?: string) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderDateCell = (value?: string) => {
        const label = formatDate(value);
        return label === 'N/A' ? <span className="cell-muted" title="No deadline set">No deadline</span> : label;
    };

    function getDateKey(value?: string | Date) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toISOString().slice(0, 10);
    }

    const formatDateTimeInput = (value?: string) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const pad = (num: number) => String(num).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const normalizeDateTime = (value?: string) => {
        if (!value) return undefined;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toISOString();
    };

    const formatRelativeTime = (value?: string | Date) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        const diffMs = date.getTime() - Date.now();
        const absMs = Math.abs(diffMs);
        const hours = Math.round(absMs / (1000 * 60 * 60));
        const days = Math.round(absMs / (1000 * 60 * 60 * 24));
        const label = absMs < 1000 * 60 * 60 * 24
            ? `${hours}h`
            : `${days}d`;
        return diffMs >= 0 ? `In ${label}` : `Overdue by ${label}`;
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
        refreshData();
        refreshDashboard();
        refreshActiveUsers();
        refreshAdminSummary();
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
    }, [activeAdminTab, isLoggedIn]);

    useEffect(() => {
        setSelectedIds(new Set());
        setReviewBulkNote('');
        setReviewScheduleAt('');
    }, [activeAdminTab]);

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

    if (!isLoggedIn) {
        return (
            <div className="admin-container">
                <div className="toast-stack">
                    {toasts.map((toast) => (
                        <div key={toast.id} className={`toast ${toast.tone}`}>
                            <span className="toast-icon">{toast.tone === 'success' ? '✓' : toast.tone === 'error' ? '!' : 'ℹ️'}</span>
                            <span>{toast.message}</span>
                        </div>
                    ))}
                </div>
                <div className="admin-login-box-wrapper" style={{ display: 'flex', justifyContent: 'center', minHeight: '100vh', alignItems: 'center' }}>
                    <AdminLogin
                        onLogin={async (email, password) => {
                            // Temporary: mapping to existing handleLogin relying on state or refactoring handleLogin to take args
                            // But handleLogin uses loginForm state.
                            // I should update handleLogin to take args or update state before calling.
                            // Actually, simplest is to update state and call existing logic or extract logic.
                            // Let's assume for now I should refrain from complex logic change in multi-replace properties.
                            // I'll define a wrapper here.
                            setLoginForm({ email, password });
                            // Wait for state... react state update is async. 
                            // So I better pass args to handleLogin or call API directly here reusing logic.

                            // Let's refactor handleLogin slightly to take data? No, I can't easily change handleLogin signature in this chunk without ensuring it's not called elsewhere.
                            // It is called in form onSubmit.

                            // Duplicate logic for safety in this refactor step:
                            setMessage('Logging in...');
                            setLoginLoading(true);
                            try {
                                const response = await adminRequest(`${apiBase}/api/auth/login`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    maxRetries: 0,
                                    body: JSON.stringify({ email, password }),
                                });

                                if (response.ok) {
                                    const result = await response.json();
                                    const userData = result.data?.user || result.user;
                                    if (userData?.role === 'admin') {
                                        const profile: AdminUserProfile = {
                                            name: userData?.name || userData?.username || 'Admin',
                                            email: userData?.email || email,
                                            role: userData?.role,
                                        };
                                        setAdminUser(profile);
                                        localStorage.setItem(ADMIN_USER_STORAGE_KEY, JSON.stringify(profile));
                                        setIsLoggedIn(true);
                                        setMessage('');
                                        pushToast('Login successful!', 'success');
                                        refreshData();
                                        refreshDashboard();
                                    } else {
                                        setMessage('Access denied. Admin role required.');
                                    }
                                } else {
                                    const errorResult = await response.json().catch(() => ({}));
                                    setMessage(getApiErrorMessage(errorResult, 'Invalid credentials.'));
                                }
                            } catch (error) {
                                console.error(error);
                                setMessage('Login failed. Check your connection.');
                            } finally {
                                setLoginLoading(false);
                            }
                        }}
                        loading={loginLoading}
                        error={message}
                    />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="toast-stack">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`toast ${toast.tone}`}>
                        <span className="toast-icon">{toast.tone === 'success' ? '✓' : toast.tone === 'error' ? '!' : 'ℹ️'}</span>
                        <span>{toast.message}</span>
                    </div>
                ))}
            </div>
            <div className="admin-container">
                {rateLimitRemaining && (
                    <div className="admin-banner" role="status">
                        Rate limited. Retry in {rateLimitRemaining}s.
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
                            <div className="admin-quick-actions">
                                <button className="admin-btn primary" onClick={() => handleQuickCreate('job', 'add')}>
                                    New job post
                                </button>
                                <button className="admin-btn secondary" onClick={() => setActiveAdminTab('review')}>
                                    Review queue
                                </button>
                                <button className="admin-btn secondary" onClick={() => setActiveAdminTab('analytics')}>
                                    Analytics
                                </button>
                            </div>
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
                            <span className="metric-value">{heroTotalPosts.toLocaleString()}</span>
                            <span className="metric-sub">All time listings</span>
                        </div>
                        <div className="admin-metric">
                            <span className="metric-label">Total views</span>
                            <span className="metric-value">{heroTotalViews.toLocaleString()}</span>
                            <span className="metric-sub">All time views</span>
                        </div>
                        <div className="admin-metric">
                            <span className="metric-label">Active jobs</span>
                            <span className="metric-value">{heroActiveJobs.toLocaleString()}</span>
                            <span className="metric-sub">Currently published</span>
                        </div>
                        <div className="admin-metric">
                            <span className="metric-label">New this week</span>
                            <span className="metric-value">{heroNewThisWeek.toLocaleString()}</span>
                            <span className="metric-sub">
                                {heroExpiringSoon ? `${heroExpiringSoon} expiring` : 'No expiring alerts'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="admin-nav">
                    <div className="admin-tabs">
                        <button className={activeAdminTab === 'analytics' ? 'active' : ''} onClick={() => setActiveAdminTab('analytics')}>
                            Analytics
                        </button>
                        <button className={activeAdminTab === 'list' ? 'active' : ''} onClick={() => setActiveAdminTab('list')}>
                            All Announcements
                        </button>
                        <button className={activeAdminTab === 'review' ? 'active' : ''} onClick={() => setActiveAdminTab('review')}>
                            Review Queue
                        </button>
                        <button className={activeAdminTab === 'add' ? 'active' : ''} onClick={() => setActiveAdminTab('add')}>
                            Quick Add
                        </button>
                        <button className={activeAdminTab === 'detailed' ? 'active' : ''} onClick={() => setActiveAdminTab('detailed')}>
                            Detailed Post
                        </button>
                        <button className={activeAdminTab === 'bulk' ? 'active' : ''} onClick={() => setActiveAdminTab('bulk')}>
                            Bulk Import
                        </button>
                        <button className={activeAdminTab === 'queue' ? 'active' : ''} onClick={() => setActiveAdminTab('queue')}>
                            Schedule Queue
                        </button>
                        <button className={activeAdminTab === 'users' ? 'active' : ''} onClick={() => setActiveAdminTab('users')}>
                            Users
                        </button>

                        <button className={activeAdminTab === 'audit' ? 'active' : ''} onClick={() => setActiveAdminTab('audit')}>
                            Audit Log
                        </button>
                        <button className={activeAdminTab === 'security' ? 'active' : ''} onClick={() => setActiveAdminTab('security')}>
                            Security
                        </button>
                    </div>
                    <div className="admin-nav-meta">
                        <span className="admin-nav-pill">{adminUser?.role ?? 'admin'}</span>
                        {listUpdatedAt && (
                            <span className="admin-nav-note">{formatLastUpdated(listUpdatedAt, 'Listings synced')}</span>
                        )}
                    </div>
                </div>

                {message && <div className="admin-banner" role="status">{message}</div>}

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
                        <button className="admin-btn secondary" onClick={() => setActiveAdminTab('list')}>Manage listings</button>
                        <button className="admin-btn secondary" onClick={() => setActiveAdminTab('queue')}>Schedule queue</button>
                        <button className="admin-btn secondary" onClick={() => setActiveAdminTab('audit')}>Audit log</button>
                    </div>
                </div>

                {activeAdminTab === 'analytics' ? (
                    <AnalyticsDashboard
                        onEditById={handleEditById}
                        onOpenList={() => setActiveAdminTab('list')}
                        onUnauthorized={handleUnauthorized}
                    />
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
                                    <div className="card-value">{dashboard?.users.totalUsers ?? 0}</div>
                                </div>
                                <div className="user-card">
                                    <div className="card-label">New today</div>
                                    <div className="card-value accent">{dashboard?.users.newToday ?? 0}</div>
                                </div>
                                <div className="user-card">
                                    <div className="card-label">New this week</div>
                                    <div className="card-value accent">{dashboard?.users.newThisWeek ?? 0}</div>
                                </div>
                                <div className="user-card">
                                    <div className="card-label">Active subscribers</div>
                                    <div className="card-value">{dashboard?.users.activeSubscribers ?? 0}</div>
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
                ) : activeAdminTab === 'list' ? (
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
                        onExport={() => {
                            const params = new URLSearchParams();
                            if (listStatusFilter !== 'all') params.set('status', listStatusFilter);
                            if (listTypeFilter !== 'all') params.set('type', listTypeFilter);
                            params.set('includeInactive', 'true');
                            downloadCsv(`/api/admin/announcements/export/csv?${params.toString()}`, `admin-announcements-${new Date().toISOString().split('T')[0]}.csv`);
                        }}
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
                    />
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

                        <div className="admin-review-panel">
                            <div className="admin-review-meta">
                                <span>{pendingSlaStats.pendingTotal} pending</span>
                                <span>Showing {pendingAnnouncements.length} of {pendingSlaStats.pendingTotal}</span>
                                <span>{selectedIds.size} selected</span>
                            </div>
                            <div className="admin-review-controls">
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
                                <button className="admin-btn success" onClick={handleBulkApprove} disabled={reviewLoading}>
                                    {reviewLoading ? 'Working...' : 'Approve selected'}
                                </button>
                                <button className="admin-btn warning" onClick={handleBulkReject} disabled={reviewLoading}>
                                    Reject selected
                                </button>
                                <button className="admin-btn primary" onClick={handleBulkSchedule} disabled={reviewLoading}>
                                    Schedule selected
                                </button>
                                <button
                                    className="admin-btn info"
                                    onClick={handleBulkQaFix}
                                    disabled={reviewLoading || qaBulkLoading || selectedQaFixableCount === 0}
                                >
                                    {qaBulkLoading ? 'Working...' : `QA auto-fix (${selectedQaFixableCount})`}
                                </button>
                                <button
                                    className="admin-btn warning"
                                    onClick={handleBulkQaFlag}
                                    disabled={reviewLoading || qaBulkLoading || selectedQaIssueCount === 0}
                                >
                                    Flag QA ({selectedQaIssueCount})
                                </button>
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
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingSlaStats.stale.map(({ item, ageDays }) => {
                                            const warnings = getAnnouncementWarnings(item);
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
                                                                <span>v{item.version ?? 1}</span>
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
                                                            <button className="admin-btn primary small" onClick={() => handleEdit(item)} disabled={isRowMutating}>Edit</button>
                                                            {warnings.length > 0 && (
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
                                                            <button className="admin-btn success small" onClick={() => handleApprove(item.id, reviewNote)} disabled={isRowMutating}>Approve</button>
                                                            <button className="admin-btn warning small" onClick={() => handleReject(item.id, reviewNote)} disabled={isRowMutating}>Reject</button>
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
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingAnnouncements.map((item) => {
                                            const qaWarnings = getAnnouncementWarnings(item);
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
                                                                <span>v{item.version ?? 1}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td><span className={`type-badge ${item.type}`}>{item.type}</span></td>
                                                    <td>{renderDateCell(item.deadline)}</td>
                                                    <td>
                                                        {qaWarnings.length > 0 ? (
                                                            <span className="qa-warning" title={qaWarnings.join(' • ')}>
                                                                {qaWarnings.length} issue{qaWarnings.length > 1 ? 's' : ''}
                                                            </span>
                                                        ) : (
                                                            <span className="status-sub success">Looks good</span>
                                                        )}
                                                    </td>
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
                                                            <button className="admin-btn primary small" onClick={() => handleEdit(item)} disabled={isRowMutating}>Edit</button>
                                                            <button className="admin-btn success small" onClick={() => handleApprove(item.id, reviewNote)} disabled={isRowMutating}>Approve</button>
                                                            <button className="admin-btn warning small" onClick={() => handleReject(item.id, reviewNote)} disabled={isRowMutating}>Reject</button>
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
                    <AdminQueue
                        items={scheduledAnnouncements}
                        stats={scheduledStats}
                        onEdit={handleEdit}
                        onReschedule={handleReschedule}
                        onPublishNow={(id) => handleApprove(id, '')}
                        onReject={(id) => handleReject(id, '')}
                        onRefresh={refreshData}
                        onExport={() => { }}
                        onNewJob={() => handleQuickCreate('job', 'add')}
                        lastUpdated={listUpdatedAt}
                        loading={listLoading}
                    />
                ) : activeAdminTab === 'detailed' ? (

                    <div className="admin-form-container">
                        <h3>Detailed Job Posting</h3>
                        <p style={{ color: '#666', marginBottom: '15px' }}>
                            Create a comprehensive job posting with all details like UP Police example.
                        </p>

                        {/* Basic Info Section */}
                        <div className="basic-info-section" style={{ marginBottom: '20px', padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                            <h4 style={{ marginBottom: '15px' }}>Basic Information</h4>
                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label htmlFor="detailed-title">Title *</label>
                                    <input
                                        id="detailed-title"
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. UP Police Constable Recruitment 2026"
                                        required
                                        className={titleInvalid ? 'field-invalid' : titleValid ? 'field-valid' : ''}
                                        aria-invalid={titleInvalid || undefined}
                                    />
                                    {titleInvalid && (
                                        <span className="field-error">Title must be at least 10 characters.</span>
                                    )}
                                    <div className="field-meta">
                                        <span className={`field-status ${titleValid ? 'ok' : 'warn'}`}>
                                            {titleValid ? '✓ Looks good' : 'Needs 10+ characters'}
                                        </span>
                                        <span className="field-count">{titleLength}/50</span>
                                    </div>
                                    <div className="field-progress">
                                        <span style={{ width: `${titleProgress}%` }} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="detailed-organization">Organization *</label>
                                    <input
                                        id="detailed-organization"
                                        type="text"
                                        value={formData.organization}
                                        onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                        placeholder="e.g. UPPRPB"
                                        required
                                        className={organizationMissing ? 'field-invalid' : organizationValid ? 'field-valid' : ''}
                                        aria-invalid={organizationMissing || undefined}
                                    />
                                    {organizationMissing && (
                                        <span className="field-error">Organization is required.</span>
                                    )}
                                    {organizationValid && (
                                        <span className="field-status ok">✓ Looks good</span>
                                    )}
                                </div>
                            </div>
                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label htmlFor="detailed-type">Type *</label>
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
                                    <label htmlFor="detailed-category">Category *</label>
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
                                        placeholder="e.g. 32679 (numbers only)"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="detailed-deadline">Last Date to Apply</label>
                                    <input
                                        id="detailed-deadline"
                                        type="date"
                                        value={formData.deadline}
                                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
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
                                    <input
                                        id="detailed-publish-at"
                                        type="datetime-local"
                                        value={formData.publishAt}
                                        onChange={(e) => setFormData({ ...formData, publishAt: e.target.value })}
                                        disabled={formData.status !== 'scheduled'}
                                    />
                                    {formData.status !== 'scheduled' && (
                                        <p className="field-hint">Enabled only when Status is Scheduled.</p>
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
                    </div>
                ) : activeAdminTab === 'bulk' ? (
                    <div className="admin-form-container">
                        <h3>Bulk Import Announcements</h3>
                        <p style={{ color: '#666', marginBottom: '15px' }}>Paste JSON array of announcements below. Required fields: title, type, category, organization.</p>
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
                                border: '1px solid #ddd',
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
                    <SecurityLogsTable onUnauthorized={handleUnauthorized} />
                ) : (
                    <div className="admin-form-container">
                        <form onSubmit={handleSubmit} className="admin-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="quick-title">Title *</label>
                                    <input
                                        id="quick-title"
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. SSC CGL 2025 Recruitment"
                                        required
                                        className={titleInvalid ? 'field-invalid' : titleValid ? 'field-valid' : ''}
                                        aria-invalid={titleInvalid || undefined}
                                    />
                                    {titleInvalid && (
                                        <span className="field-error">Title must be at least 10 characters.</span>
                                    )}
                                    <div className="field-meta">
                                        <span className={`field-status ${titleValid ? 'ok' : 'warn'}`}>
                                            {titleValid ? '✓ Looks good' : 'Needs 10+ characters'}
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
                                    <label htmlFor="quick-type">Type *</label>
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
                                    <label htmlFor="quick-category">Category *</label>
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
                                    <label htmlFor="quick-organization">Organization *</label>
                                    <input
                                        id="quick-organization"
                                        type="text"
                                        value={formData.organization}
                                        onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                        required
                                        className={organizationMissing ? 'field-invalid' : organizationValid ? 'field-valid' : ''}
                                        aria-invalid={organizationMissing || undefined}
                                    />
                                    {organizationMissing && (
                                        <span className="field-error">Organization is required.</span>
                                    )}
                                    {organizationValid && (
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
                                        placeholder="e.g. 32679 (numbers only)"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="quick-deadline">Last Date</label>
                                    <input
                                        id="quick-deadline"
                                        type="date"
                                        value={formData.deadline}
                                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                    />
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
                                    />
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
                                    <input
                                        id="quick-publish-at"
                                        type="datetime-local"
                                        value={formData.publishAt}
                                        onChange={(e) => setFormData({ ...formData, publishAt: e.target.value })}
                                        disabled={formData.status !== 'scheduled'}
                                    />
                                    {formData.status !== 'scheduled' && (
                                        <p className="field-hint">Enabled only when Status is Scheduled.</p>
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
            </div>

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
                        <div className="preview-modal" onClick={(e) => e.stopPropagation()} style={{
                            maxWidth: '1000px',
                            margin: '0 auto',
                            background: 'var(--bg-primary, white)',
                            borderRadius: '16px',
                            overflow: 'hidden'
                        }}>
                            <div className="preview-header" style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                padding: '20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <h2 style={{ margin: 0 }}>Preview Mode</h2>
                                    <p style={{ margin: '5px 0 0', opacity: 0.9 }}>This is how your job posting will appear</p>
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
                                    background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)',
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
                                        {previewData.formData.deadline && (
                                            <span style={{ background: 'rgba(244, 67, 54, 0.3)', padding: '5px 12px', borderRadius: '20px', fontSize: '0.85rem' }}>
                                                Deadline: {new Date(previewData.formData.deadline).toLocaleDateString()}
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
                                borderTop: '1px solid #eee',
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '15px'
                            }}>
                                <button onClick={() => setShowPreview(false)} style={{
                                    background: '#f5f5f5',
                                    border: '1px solid #ddd',
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
                                    background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
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
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <div>
                                <h3>Version history</h3>
                                <p className="admin-subtitle">{versionTarget.title}</p>
                            </div>
                            <button className="admin-btn secondary small" onClick={() => setVersionTarget(null)}>Close</button>
                        </div>
                        <div className="admin-modal-body">
                            {versionTarget.versions && versionTarget.versions.length > 0 ? (
                                <div className="version-list">
                                    {versionTarget.versions.map((version) => (
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
        </>
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



