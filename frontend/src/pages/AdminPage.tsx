import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnalyticsDashboard } from '../components/admin/AnalyticsDashboard';
import { JobPostingForm, type JobDetails } from '../components/admin/JobPostingForm';
import { JobDetailsRenderer } from '../components/details/JobDetailsRenderer';
import { SecurityLogsTable } from '../components/admin/SecurityLogsTable';
import type { Announcement, ContentType, AnnouncementStatus } from '../types';
import { getApiErrorMessage } from '../utils/errors';
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

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
    { value: 'job', label: 'Latest Jobs' },
    { value: 'admit-card', label: 'Admit Cards' },
    { value: 'result', label: 'Latest Results' },
    { value: 'admission', label: 'Admissions' },
    { value: 'syllabus', label: 'Syllabus' },
    { value: 'answer-key', label: 'Answer Keys' },
];

const LIST_SORT_OPTIONS: { value: 'newest' | 'updated' | 'deadline' | 'views'; label: string }[] = [
    { value: 'newest', label: 'Newest first' },
    { value: 'updated', label: 'Recently updated' },
    { value: 'deadline', label: 'Deadline soonest' },
    { value: 'views', label: 'Most viewed' },
];


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
    const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('adminToken'));
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
    const [listQuery, setListQuery] = useState('');
    const [listTypeFilter, setListTypeFilter] = useState<ContentType | 'all'>('all');
    const [listSort, setListSort] = useState<'newest' | 'updated' | 'deadline' | 'views'>('newest');
    const [listPage, setListPage] = useState(1);

    const [listStatusFilter, setListStatusFilter] = useState<AnnouncementStatus | 'all'>('all');
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
    const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditError, setAuditError] = useState<string | null>(null);
    const [auditUpdatedAt, setAuditUpdatedAt] = useState<string | null>(null);
    const [auditLimit, setAuditLimit] = useState(50);
    const [auditFilters, setAuditFilters] = useState({
        userId: '',
        action: '',
        start: '',
        end: '',
    });
    const [loginLoading, setLoginLoading] = useState(false);
    const [mutatingIds, setMutatingIds] = useState<Set<string>>(new Set());

    const pageSize = 15;

    const [formData, setFormData] = useState(() => ({ ...DEFAULT_FORM_DATA }));
    const [message, setMessage] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [bulkJson, setBulkJson] = useState('');

    // Preview mode state
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState<{ formData: typeof formData; jobDetails: JobDetails | null } | null>(null);

    // Fetch data
    const refreshData = async () => {
        if (!adminToken) return;
        setListLoading(true);
        try {
            const params = new URLSearchParams({
                limit: '500',
                offset: '0',
                includeInactive: 'true',
            });
            const res = await fetch(`${apiBase}/api/admin/announcements?${params.toString()}`, {
                headers: { Authorization: `Bearer ${adminToken}` },
            });
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                setMessage(getApiErrorMessage(errorBody, 'Failed to load announcements.'));
                return;
            }
            const data = await res.json();
            setAnnouncements(data.data || []);
            setListUpdatedAt(new Date().toISOString());
        } catch (e) {
            console.error(e);
            setMessage('Failed to load announcements.');
        } finally {
            setListLoading(false);
        }
    };

    const refreshActiveUsers = async () => {
        if (!adminToken) return;
        setActiveUsersLoading(true);
        setActiveUsersError(null);
        try {
            const res = await fetch(`${apiBase}/api/admin/active-users?windowMinutes=${activeUsersWindow}`, {
                headers: { Authorization: `Bearer ${adminToken}` },
            });
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
        if (!adminToken) return;
        setDashboardLoading(true);
        setDashboardError(null);
        try {
            const res = await fetch(`${apiBase}/api/admin/dashboard`, {
                headers: { Authorization: `Bearer ${adminToken}` },
            });
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

    const refreshAuditLogs = async () => {
        if (!adminToken) return;
        setAuditLoading(true);
        setAuditError(null);
        try {
            const params = new URLSearchParams({
                limit: String(auditLimit),
            });
            if (auditFilters.userId) params.set('userId', auditFilters.userId);
            if (auditFilters.action) params.set('action', auditFilters.action);
            if (auditFilters.start) params.set('start', auditFilters.start);
            if (auditFilters.end) params.set('end', auditFilters.end);

            const res = await fetch(`${apiBase}/api/admin/audit-log?${params.toString()}`, {
                headers: { Authorization: `Bearer ${adminToken}` },
            });
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                setAuditError(getApiErrorMessage(errorBody, 'Failed to load audit log.'));
                return;
            }
            const payload = await res.json();
            setAuditLogs(payload.data ?? []);
            setAuditUpdatedAt(new Date().toISOString());
        } catch (error) {
            console.error(error);
            setAuditError('Failed to load audit log.');
        } finally {
            setAuditLoading(false);
        }
    };


    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this announcement?')) return;
        if (!adminToken) return;

        updateMutating(id, true);
        try {
            const response = await fetch(`${apiBase}/api/admin/announcements/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${adminToken}` },
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
        setJobDetails(hasDetails ? item.jobDetails : null);
        setEditingId(null);
        setShowPreview(false);
        setPreviewData(null);
        setActiveAdminTab(hasDetails ? 'detailed' : 'add');
        setMessage(`Duplicating: ${item.title}`);
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
        if (!adminToken) return;
        updateMutating(id, true);
        try {
            const response = await fetch(`${apiBase}/api/admin/announcements/${id}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${adminToken}`,
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

    const handleReject = async (id: string, note?: string) => {
        if (!adminToken) return;
        updateMutating(id, true);
        try {
            const response = await fetch(`${apiBase}/api/admin/announcements/${id}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${adminToken}`,
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
        if (!adminToken) {
            if (!options?.silent) setMessage('Not authenticated.');
            return false;
        }

        updateMutating(id, true);
        try {
            const response = await fetch(`${apiBase}/api/admin/announcements/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${adminToken}`,
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

    const handleBulkUpdate = async () => {
        if (!adminToken) {
            setMessage('Not authenticated.');
            return;
        }
        if (selectedIds.size === 0) {
            setMessage('Select at least one announcement for bulk updates.');
            return;
        }

        const payload: Record<string, any> = {};
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

        if (Object.keys(payload).length === 0) {
            setMessage('Choose at least one bulk change before applying.');
            return;
        }

        setBulkLoading(true);
        try {
            const response = await fetch(`${apiBase}/api/admin/announcements/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`,
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
        if (!adminToken) {
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

            const response = await fetch(`${apiBase}/api/admin/announcements/export/csv?${params.toString()}`, {
                headers: { Authorization: `Bearer ${adminToken}` },
            });

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
        if (!adminToken) {
            setMessage('Not authenticated.');
            return;
        }
        if (selectedIds.size === 0) {
            setMessage('Select at least one announcement to approve.');
            return;
        }

        setReviewLoading(true);
        try {
            const response = await fetch(`${apiBase}/api/admin/announcements/bulk-approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${adminToken}`,
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
        if (!adminToken) {
            setMessage('Not authenticated.');
            return;
        }
        if (selectedIds.size === 0) {
            setMessage('Select at least one announcement to reject.');
            return;
        }

        setReviewLoading(true);
        try {
            const response = await fetch(`${apiBase}/api/admin/announcements/bulk-reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${adminToken}`,
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
        if (!adminToken) {
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
            const response = await fetch(`${apiBase}/api/admin/announcements/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${adminToken}`,
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
        if (!adminToken) {
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
        if (!adminToken) {
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
        if (!adminToken) return;
        updateMutating(id, true);
        try {
            const response = await fetch(`${apiBase}/api/admin/announcements/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${adminToken}`,
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
        if (!adminToken) {
            setMessage('Not authenticated.');
            return;
        }
        try {
            const response = await fetch(`${apiBase}${endpoint}`, {
                headers: { Authorization: `Bearer ${adminToken}` },
            });
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
            const response = await fetch(`${apiBase}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginForm),
            });

            if (response.ok) {
                const result = await response.json();
                const userData = result.data?.user || result.user;
                const authToken = result.data?.token || result.token;

                if (userData?.role === 'admin') {
                    setAdminToken(authToken);
                    localStorage.setItem('adminToken', authToken);
                    setIsLoggedIn(true);
                    setMessage('Login successful!');
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

        if (!adminToken) {
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

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`,
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
        const counts: Record<string, number> = {};
        for (const item of announcements) {
            counts[item.type] = (counts[item.type] ?? 0) + 1;
        }
        return counts;
    }, [announcements]);

    const statusCounts = useMemo(() => {
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
    }, [announcements]);

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
        return pendingAnnouncements.filter((item) => getAnnouncementWarnings(item).length > 0).length;
    }, [pendingAnnouncements]);

    const pendingSlaStats = useMemo(() => {
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
        };
    }, [pendingAnnouncements]);

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

    const filteredAnnouncements = useMemo(() => {
        const query = listQuery.trim().toLowerCase();
        const filtered = announcements.filter((item) => {
            if (listTypeFilter !== 'all' && item.type !== listTypeFilter) {
                return false;
            }
            const statusValue = item.status ?? 'published';
            if (listStatusFilter !== 'all' && statusValue !== listStatusFilter) {
                return false;
            }
            if (!query) return true;
            const haystack = [item.title, item.organization, item.category, item.id, item.slug]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(query);
        });

        const getDateValue = (value?: string | null) => (value ? new Date(value).getTime() : 0);

        return [...filtered].sort((a, b) => {
            switch (listSort) {
                case 'updated':
                    return getDateValue(b.updatedAt) - getDateValue(a.updatedAt);
                case 'deadline': {
                    const aDeadline = getDateValue(a.deadline);
                    const bDeadline = getDateValue(b.deadline);
                    if (!aDeadline && !bDeadline) return 0;
                    if (!aDeadline) return 1;
                    if (!bDeadline) return -1;
                    return aDeadline - bDeadline;
                }
                case 'views':
                    return (b.viewCount ?? 0) - (a.viewCount ?? 0);
                case 'newest':
                default:
                    return getDateValue(b.postedAt) - getDateValue(a.postedAt);
            }
        });
    }, [announcements, listTypeFilter, listStatusFilter, listQuery, listSort]);

    const totalPages = Math.max(1, Math.ceil(filteredAnnouncements.length / pageSize));

    const pagedAnnouncements = useMemo(() => {
        const start = (listPage - 1) * pageSize;
        return filteredAnnouncements.slice(start, start + pageSize);
    }, [filteredAnnouncements, listPage, pageSize]);

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

    const isValidUrl = (value?: string | null) => {
        if (!value) return true;
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    };

    const getAnnouncementWarnings = (item: Announcement) => {
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
    };

    const getFixableWarnings = (item: Announcement) => {
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
    };

    const buildQaFixPatch = (item: Announcement) => {
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
    };

    const getFormWarnings = () => {
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
    };

    const formatDate = (value?: string) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
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

    const getDateKey = (value?: string | Date) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toISOString().slice(0, 10);
    };

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

    const formatLastUpdated = (value?: string | null) => {
        if (!value) return 'Not updated yet';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Not updated yet';
        const diffMs = Date.now() - date.getTime();
        if (diffMs < 60 * 1000) return 'Updated just now';
        if (diffMs < 60 * 60 * 1000) return `Updated ${Math.round(diffMs / 60000)}m ago`;
        if (diffMs < 24 * 60 * 60 * 1000) return `Updated ${Math.round(diffMs / (60 * 60 * 1000))}h ago`;
        return `Updated ${Math.round(diffMs / (24 * 60 * 60 * 1000))}d ago`;
    };

    useEffect(() => {
        if (!adminToken) return;
        setIsLoggedIn(true);
        refreshData();
        refreshDashboard();
        refreshActiveUsers();
    }, [adminToken]);

    useEffect(() => {
        if (!adminToken) return;
        refreshActiveUsers();
    }, [activeUsersWindow, adminToken]);

    useEffect(() => {
        if (!adminToken) return;
        if (activeAdminTab === 'audit') {
            refreshAuditLogs();
        }
    }, [activeAdminTab, adminToken]);

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
        setListPage((page) => Math.min(page, totalPages));
    }, [totalPages]);

    if (!isLoggedIn) {
        return (
            <div className="admin-container">
                <div className="admin-login-box">
                    <h2>Admin Login</h2>
                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                value={loginForm.email}
                                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                                placeholder="admin@sarkari.com"
                                required
                                disabled={loginLoading}
                            />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                placeholder="password"
                                required
                                disabled={loginLoading}
                            />
                        </div>
                        <p className="form-hint">Too many failed attempts will lock login for 15 minutes.</p>
                        {message && <p className="form-message">{message}</p>}
                        <button type="submit" className="admin-btn primary" disabled={loginLoading}>
                            {loginLoading ? 'Logging in...' : 'Login'}
                        </button>
                        <button type="button" className="admin-btn secondary" onClick={() => navigate('/')}>Back to Home</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="admin-container">
                <div className="admin-header">
                    <h2>Admin Dashboard</h2>
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
                    <button className="admin-btn logout" onClick={() => {
                        setIsLoggedIn(false);
                        setAdminToken(null);
                        localStorage.removeItem('adminToken');
                    }}>Logout</button>
                </div>

                {message && <p className="form-message">{message}</p>}

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
                        <button className="admin-btn secondary" onClick={() => setActiveAdminTab('list')}>Open manager</button>
                        <button className="admin-btn secondary" onClick={() => setActiveAdminTab('queue')}>Schedule queue</button>
                        <button className="admin-btn secondary" onClick={() => setActiveAdminTab('audit')}>Audit log</button>
                    </div>
                </div>

                {activeAdminTab === 'analytics' ? (
                    <AnalyticsDashboard adminToken={adminToken} />
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
                    <div className="admin-list">
                        <div className="admin-list-header">
                            <div>
                                <h3>Content manager</h3>
                                <p className="admin-subtitle">Add, update, and organize listings across all categories.</p>
                            </div>
                            <div className="admin-list-actions">
                                <span className="admin-updated">{formatLastUpdated(listUpdatedAt)}</span>
                                <button className="admin-btn secondary" onClick={refreshData} disabled={listLoading}>
                                    {listLoading ? 'Refreshing...' : 'Refresh'}
                                </button>
                                <button className="admin-btn secondary" onClick={handleExportAnnouncements} disabled={listExporting}>
                                    {listExporting ? 'Exporting...' : 'Export CSV'}
                                </button>
                                <button className="admin-btn primary" onClick={() => handleQuickCreate('job', 'add')}>New job</button>
                            </div>
                        </div>

                        <div className="admin-quick-create">
                            {CONTENT_TYPES.map((type) => (
                                <button
                                    key={type.value}
                                    className="quick-create-btn"
                                    onClick={() => handleQuickCreate(type.value, 'add')}
                                >
                                    {type.label}
                                </button>
                            ))}
                            <button className="quick-create-btn outline" onClick={() => handleQuickCreate('job', 'detailed')}>Detailed post</button>
                        </div>

                        <div className="admin-filter-bar">
                            <div className="admin-search">
                                <input
                                    type="search"
                                    placeholder="Search by title, organization, category, or ID"
                                    value={listQuery}
                                    onChange={(e) => setListQuery(e.target.value)}
                                />
                            </div>
                            <div className="admin-filter-controls">
                                <label htmlFor="listStatus">Status</label>
                                <select
                                    id="listStatus"
                                    value={listStatusFilter}
                                    onChange={(e) => setListStatusFilter(e.target.value as AnnouncementStatus | 'all')}
                                >
                                    <option value="all">All statuses</option>
                                    {STATUS_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="admin-filter-controls">
                                <label htmlFor="listSort">Sort</label>
                                <select
                                    id="listSort"
                                    value={listSort}
                                    onChange={(e) => setListSort(e.target.value as 'newest' | 'updated' | 'deadline' | 'views')}
                                >
                                    {LIST_SORT_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="admin-type-filters">
                            <button
                                className={`filter-chip ${listTypeFilter === 'all' ? 'active' : ''}`}
                                onClick={() => setListTypeFilter('all')}
                            >
                                All
                                <span className="chip-count">{announcements.length}</span>
                            </button>
                            {CONTENT_TYPES.map((type) => (
                                <button
                                    key={type.value}
                                    className={`filter-chip ${listTypeFilter === type.value ? 'active' : ''}`}
                                    onClick={() => setListTypeFilter(type.value)}
                                >
                                    {type.label}
                                    <span className="chip-count">{contentCounts[type.value] ?? 0}</span>
                                </button>
                            ))}
                        </div>

                        <div className="admin-status-filters">
                            <button
                                className={`filter-chip ${listStatusFilter === 'all' ? 'active' : ''}`}
                                onClick={() => setListStatusFilter('all')}
                            >
                                All statuses
                                <span className="chip-count">{announcements.length}</span>
                            </button>
                            {STATUS_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    className={`filter-chip ${listStatusFilter === option.value ? 'active' : ''}`}
                                    onClick={() => setListStatusFilter(option.value)}
                                >
                                    {option.label}
                                    <span className="chip-count">{statusCounts[option.value] ?? 0}</span>
                                </button>
                            ))}
                        </div>

                        {selectedIds.size > 0 && (
                            <div className="admin-bulk-panel">
                                <div>
                                    <h4>Bulk update</h4>
                                    <p className="admin-subtitle">Update {selectedIds.size} selected announcements.</p>
                                </div>
                                <div className="admin-bulk-controls">
                                    <div className="bulk-field">
                                        <label>Status</label>
                                        <select
                                            value={bulkStatus}
                                            onChange={(e) => setBulkStatus(e.target.value as AnnouncementStatus | '')}
                                            disabled={bulkLoading}
                                        >
                                            <option value="">No change</option>
                                            {STATUS_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="bulk-field">
                                        <label>Publish at</label>
                                        <input
                                            type="datetime-local"
                                            value={bulkPublishAt}
                                            onChange={(e) => setBulkPublishAt(e.target.value)}
                                            disabled={bulkLoading}
                                        />
                                    </div>
                                    <div className="bulk-field">
                                        <label>Active</label>
                                        <select
                                            value={bulkIsActive}
                                            onChange={(e) => setBulkIsActive(e.target.value as 'keep' | 'active' | 'inactive')}
                                            disabled={bulkLoading}
                                        >
                                            <option value="keep">Keep</option>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                    <div className="admin-bulk-actions">
                                        <button className="admin-btn primary" onClick={handleBulkUpdate} disabled={bulkLoading}>
                                            {bulkLoading ? 'Applying...' : 'Apply'}
                                        </button>
                                        <button className="admin-btn secondary" onClick={clearSelection} disabled={bulkLoading}>Clear</button>
                                        <button
                                            className="admin-btn secondary"
                                            onClick={handleBulkQaFix}
                                            disabled={bulkLoading || qaBulkLoading || selectedQaFixableCount === 0}
                                        >
                                            {qaBulkLoading ? 'Working...' : `QA auto-fix (${selectedQaFixableCount})`}
                                        </button>
                                        <button
                                            className="admin-btn warning"
                                            onClick={handleBulkQaFlag}
                                            disabled={bulkLoading || qaBulkLoading || selectedQaIssueCount === 0}
                                        >
                                            Flag QA ({selectedQaIssueCount})
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="admin-list-meta">
                            <span>Showing {pagedAnnouncements.length} of {filteredAnnouncements.length}</span>
                            <span>Page {listPage} of {totalPages}</span>
                        </div>

                        {listLoading ? (
                            <div className="admin-loading">Loading announcements...</div>
                        ) : (
                            <div className="admin-table-wrapper">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>
                                                <input
                                                    type="checkbox"
                                                    aria-label="Select all"
                                                    checked={pagedAnnouncements.length > 0 && pagedAnnouncements.every((item) => selectedIds.has(item.id))}
                                                    onChange={(e) => toggleSelectAll(e.target.checked, pagedAnnouncements.map((item) => item.id))}
                                                />
                                            </th>
                                            <th>Title</th>
                                            <th>Type</th>
                                            <th>Publish</th>
                                            <th>Deadline</th>
                                            <th>Views</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagedAnnouncements.map((item) => {
                                            const availability = getAvailabilityStatus(item);
                                            const workflow = getWorkflowStatus(item);
                                            const statusValue = item.status ?? 'published';
                                            const canApprove = statusValue === 'pending' || statusValue === 'scheduled';
                                            const canReject = statusValue === 'pending' || statusValue === 'scheduled';
                                            const reviewNote = reviewNotes[item.id] ?? '';
                                            const qaWarnings = getAnnouncementWarnings(item);
                                            const isRowMutating = mutatingIds.has(item.id);
                                            return (
                                                <tr key={item.id}>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(item.id)}
                                                            onChange={() => toggleSelection(item.id)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <div className="title-cell">
                                                            <div className="title-text">{item.title}</div>
                                                            <div className="title-meta">
                                                                <span>{item.organization || 'Unknown'}</span>
                                                                <span className="meta-sep">|</span>
                                                                <span>{item.category}</span>
                                                                <span className="meta-sep">|</span>
                                                                <span>v{item.version ?? 1}</span>
                                                                {qaWarnings.length > 0 && (
                                                                    <>
                                                                        <span className="meta-sep">|</span>
                                                                        <span className="qa-warning" title={qaWarnings.join(' • ')}>
                                                                            QA: {qaWarnings.length} issue{qaWarnings.length > 1 ? 's' : ''}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td><span className={`type-badge ${item.type}`}>{item.type}</span></td>
                                                    <td>
                                                        <div className="publish-cell">
                                                            <span>{formatDateTime(item.publishAt || item.postedAt)}</span>
                                                            {item.status === 'scheduled' && item.publishAt && (
                                                                <span className="status-sub info">Scheduled</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>{formatDate(item.deadline)}</td>
                                                    <td>{(item.viewCount ?? 0).toLocaleString()}</td>
                                                    <td>
                                                        <div className="status-stack">
                                                            <span className={`status-pill ${workflow.tone}`}>{workflow.label}</span>
                                                            <span className={`status-sub ${availability.tone}`}>{availability.label}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="table-actions">
                                                            {(canApprove || canReject) && (
                                                                <input
                                                                    className="review-note-input"
                                                                    type="text"
                                                                    value={reviewNote}
                                                                    onChange={(e) => setReviewNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                                                    placeholder="Review note (optional)"
                                                                    disabled={isRowMutating}
                                                                />
                                                            )}
                                                            <button className="admin-btn secondary small" onClick={() => handleView(item)} disabled={isRowMutating}>View</button>
                                                            <button className="admin-btn primary small" onClick={() => handleEdit(item)} disabled={isRowMutating}>Edit</button>
                                                            <button className="admin-btn secondary small" onClick={() => setVersionTarget(item)} disabled={isRowMutating}>History</button>
                                                            {qaWarnings.length > 0 && (
                                                                <>
                                                                    <button className="admin-btn info small" onClick={() => handleQaFix(item)} disabled={isRowMutating}>
                                                                        Auto-fix
                                                                    </button>
                                                                    <button className="admin-btn warning small" onClick={() => handleQaFlag(item)} disabled={isRowMutating}>
                                                                        Flag
                                                                    </button>
                                                                </>
                                                            )}
                                                            {canApprove && (
                                                                <button className="admin-btn success small" onClick={() => handleApprove(item.id, reviewNote)} disabled={isRowMutating}>Approve</button>
                                                            )}
                                                            {canReject && (
                                                                <button className="admin-btn warning small" onClick={() => handleReject(item.id, reviewNote)} disabled={isRowMutating}>Reject</button>
                                                            )}
                                                            <button className="admin-btn secondary small" onClick={() => handleDuplicate(item)} disabled={isRowMutating}>Duplicate</button>
                                                            <button className="admin-btn danger small" onClick={() => handleDelete(item.id)} disabled={isRowMutating}>Delete</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {pagedAnnouncements.length === 0 && (
                                            <tr>
                                                <td colSpan={8} className="empty-state">No announcements match these filters. Clear filters or add a new one.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="admin-pagination">
                            <button
                                className="admin-btn secondary small"
                                onClick={() => setListPage((page) => Math.max(1, page - 1))}
                                disabled={listPage === 1}
                            >
                                Prev
                            </button>
                            <div className="pagination-info">Page {listPage} of {totalPages}</div>
                            <button
                                className="admin-btn secondary small"
                                onClick={() => setListPage((page) => Math.min(totalPages, page + 1))}
                                disabled={listPage === totalPages}
                            >
                                Next
                            </button>
                        </div>
                    </div>
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
                                <span>{pendingAnnouncements.length} pending</span>
                                <span>{selectedIds.size} selected</span>
                            </div>
                            <div className="admin-review-controls">
                                <input
                                    className="review-note-input"
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
                                                            <div className="title-text">{item.title}</div>
                                                            <div className="title-meta">
                                                                <span>{item.organization || 'Unknown'}</span>
                                                                <span className="meta-sep">|</span>
                                                                <span>{item.category || 'Uncategorized'}</span>
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
                                                                type="text"
                                                                value={reviewNote}
                                                                onChange={(e) => setReviewNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                                                placeholder="Review note (optional)"
                                                                disabled={isRowMutating}
                                                            />
                                                            <button className="admin-btn secondary small" onClick={() => handleView(item)} disabled={isRowMutating}>View</button>
                                                            <button className="admin-btn primary small" onClick={() => handleEdit(item)} disabled={isRowMutating}>Edit</button>
                                                            {qaWarnings.length > 0 && (
                                                                <>
                                                                    <button className="admin-btn info small" onClick={() => handleQaFix(item)} disabled={isRowMutating}>
                                                                        Auto-fix
                                                                    </button>
                                                                    <button className="admin-btn warning small" onClick={() => handleQaFlag(item)} disabled={isRowMutating}>
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
                                                            <div className="title-text">{item.title}</div>
                                                            <div className="title-meta">
                                                                <span>{item.organization || 'Unknown'}</span>
                                                                <span className="meta-sep">|</span>
                                                                <span>{item.category || 'Uncategorized'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td><span className={`type-badge ${item.type}`}>{item.type}</span></td>
                                                    <td>{formatDate(item.deadline)}</td>
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
                ) : activeAdminTab === 'review' ? (
                    <div className="admin-list">
                        <div className="admin-list-header">
                            <div>
                                <h3>Pending review</h3>
                                <p className="admin-subtitle">Approve, reject, or schedule pending announcements with QA checks highlighted.</p>
                            </div>
                            <div className="admin-list-actions">
                                <span className="admin-updated">{formatLastUpdated(listUpdatedAt)}</span>
                                <button className="admin-btn secondary" onClick={refreshData} disabled={listLoading}>
                                    {listLoading ? 'Refreshing...' : 'Refresh'}
                                </button>
                            </div>
                        </div>

                        <div className="admin-user-grid">
                            <div className="user-card">
                                <div className="card-label">Pending total</div>
                                <div className="card-value">{pendingAnnouncements.length}</div>
                            </div>
                            <div className="user-card">
                                <div className="card-label">QA warnings</div>
                                <div className="card-value accent">{pendingWarningCount}</div>
                            </div>
                            <div className="user-card">
                                <div className="card-label">Selected</div>
                                <div className="card-value">{selectedIds.size}</div>
                            </div>
                        </div>

                        <div className="admin-bulk-panel">
                            <div className="admin-bulk-controls">
                                <div className="bulk-field">
                                    <label>Review note</label>
                                    <input
                                        type="text"
                                        value={reviewBulkNote}
                                        onChange={(e) => setReviewBulkNote(e.target.value)}
                                        placeholder="Optional note for audit log"
                                        disabled={reviewLoading}
                                    />
                                </div>
                                <div className="bulk-field">
                                    <label>Schedule at</label>
                                    <input
                                        type="datetime-local"
                                        value={reviewScheduleAt}
                                        onChange={(e) => setReviewScheduleAt(e.target.value)}
                                        disabled={reviewLoading}
                                    />
                                </div>
                            </div>
                            <div className="admin-bulk-actions">
                                <button className="admin-btn success" onClick={handleBulkApprove} disabled={reviewLoading}>
                                    {reviewLoading ? 'Working...' : 'Approve selected'}
                                </button>
                                <button className="admin-btn warning" onClick={handleBulkReject} disabled={reviewLoading}>
                                    Reject selected
                                </button>
                                <button className="admin-btn secondary" onClick={handleBulkSchedule} disabled={reviewLoading}>
                                    Schedule selected
                                </button>
                                <button className="admin-btn secondary" onClick={clearSelection} disabled={reviewLoading}>Clear</button>
                            </div>
                        </div>

                        {pendingAnnouncements.length === 0 ? (
                            <div className="empty-state">No pending announcements right now.</div>
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
                                            const warnings = getAnnouncementWarnings(item);
                                            const reviewNote = reviewNotes[item.id] ?? '';
                                            const isRowMutating = mutatingIds.has(item.id);
                                            return (
                                                <tr key={item.id}>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(item.id)}
                                                            onChange={() => toggleSelection(item.id)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <div className="title-cell">
                                                            <div className="title-text">{item.title}</div>
                                                            <div className="title-meta">
                                                                <span>{item.organization || 'Unknown'}</span>
                                                                <span className="meta-sep">|</span>
                                                                <span>{item.category || 'Uncategorized'}</span>
                                                                <span className="meta-sep">|</span>
                                                                <span>v{item.version ?? 1}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td><span className={`type-badge ${item.type}`}>{item.type}</span></td>
                                                    <td>{formatDate(item.deadline)}</td>
                                                    <td>
                                                        {warnings.length === 0 ? (
                                                            <span className="status-sub success">Clear</span>
                                                        ) : (
                                                            <span className="qa-warning" title={warnings.join(' • ')}>Issues: {warnings.length}</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className="table-actions">
                                                            <input
                                                                className="review-note-input"
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
                                                            {reviewScheduleAt && (
                                                                <button
                                                                    className="admin-btn secondary small"
                                                                    onClick={() => handleScheduleOne(item.id, reviewScheduleAt)}
                                                                    disabled={isRowMutating}
                                                                >
                                                                    Schedule
                                                                </button>
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
                    <div className="admin-list">
                        <div className="admin-list-header">
                            <div>
                                <h3>Scheduled queue</h3>
                                <p className="admin-subtitle">Review upcoming scheduled announcements and publish now if needed.</p>
                            </div>
                            <div className="admin-list-actions">
                                <span className="admin-updated">{formatLastUpdated(listUpdatedAt)}</span>
                                <div className="admin-toggle">
                                    <button
                                        className={`admin-btn secondary ${scheduleView === 'list' ? 'active' : ''}`}
                                        onClick={() => setScheduleView('list')}
                                    >
                                        List
                                    </button>
                                    <button
                                        className={`admin-btn secondary ${scheduleView === 'calendar' ? 'active' : ''}`}
                                        onClick={() => setScheduleView('calendar')}
                                    >
                                        Calendar
                                    </button>
                                </div>
                                <button className="admin-btn secondary" onClick={refreshData} disabled={listLoading}>
                                    {listLoading ? 'Refreshing...' : 'Refresh'}
                                </button>
                                <button
                                    className="admin-btn secondary"
                                    onClick={() => {
                                        const params = new URLSearchParams();
                                        if (listStatusFilter !== 'all') params.set('status', listStatusFilter);
                                        if (listTypeFilter !== 'all') params.set('type', listTypeFilter);
                                        params.set('includeInactive', 'true');
                                        downloadCsv(`/api/admin/announcements/export/csv?${params.toString()}`, `admin-announcements-${new Date().toISOString().split('T')[0]}.csv`);
                                    }}
                                >
                                    Export CSV
                                </button>
                                <button className="admin-btn primary" onClick={() => handleQuickCreate('job', 'add')}>New job</button>
                            </div>
                        </div>

                        <div className="admin-user-grid">
                            <div className="user-card">
                                <div className="card-label">Scheduled total</div>
                                <div className="card-value">{scheduledAnnouncements.length}</div>
                            </div>
                            <div className="user-card">
                                <div className="card-label">Overdue</div>
                                <div className="card-value accent">{scheduledStats.overdue}</div>
                            </div>
                            <div className="user-card">
                                <div className="card-label">Next 24h</div>
                                <div className="card-value accent">{scheduledStats.upcoming24h}</div>
                            </div>
                            <div className="user-card">
                                <div className="card-label">Next publish</div>
                                <div className="card-value">{formatDateTime(scheduledStats.nextPublish)}</div>
                            </div>
                        </div>

                        {scheduleView === 'calendar' && (
                            <div className="schedule-calendar">
                                {scheduleCalendar.map((day) => (
                                    <div key={day.key} className="schedule-day">
                                        <div className="schedule-day-header">
                                            <span>{day.label}</span>
                                            <span className="schedule-count">{day.items.length}</span>
                                        </div>
                                        {day.items.length === 0 ? (
                                            <div className="schedule-empty">No scheduled posts</div>
                                        ) : (
                                            <div className="schedule-list">
                                                {day.items.map((item) => {
                                                    const warnings = getAnnouncementWarnings(item);
                                                    return (
                                                        <div key={item.id} className="schedule-item">
                                                            <div>
                                                                <div className="schedule-title">{item.title}</div>
                                                                <div className="schedule-meta">
                                                                    {item.organization || 'Unknown'}
                                                                    {warnings.length > 0 && (
                                                                        <span className="qa-warning" title={warnings.join(' • ')}>
                                                                            QA {warnings.length}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <span className="schedule-time">{formatDateTime(item.publishAt)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {scheduledAnnouncements.length === 0 ? (
                            <div className="empty-state">No scheduled announcements yet. Set status to Scheduled with a publish time to see items here.</div>
                        ) : scheduleView === 'list' ? (
                            <div className="admin-table-wrapper">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Title</th>
                                            <th>Publish at</th>
                                            <th>Time</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scheduledAnnouncements.map((item) => {
                                            const reviewNote = reviewNotes[item.id] ?? '';
                                            const publishTime = item.publishAt;
                                            const isOverdue = publishTime ? new Date(publishTime).getTime() <= Date.now() : false;
                                            const warnings = getAnnouncementWarnings(item);
                                            const isRowMutating = mutatingIds.has(item.id);
                                            return (
                                                <tr key={item.id}>
                                                    <td>
                                                        <div className="title-cell">
                                                            <div className="title-text">{item.title}</div>
                                                            <div className="title-meta">
                                                                <span>{item.organization || 'Unknown'}</span>
                                                                <span className="meta-sep">|</span>
                                                                <span>v{item.version ?? 1}</span>
                                                                {warnings.length > 0 && (
                                                                    <>
                                                                        <span className="meta-sep">|</span>
                                                                        <span className="qa-warning" title={warnings.join(' • ')}>
                                                                            QA: {warnings.length} issue{warnings.length > 1 ? 's' : ''}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>{formatDateTime(publishTime)}</td>
                                                    <td>{formatRelativeTime(publishTime)}</td>
                                                    <td>
                                                        <span className={`status-pill ${isOverdue ? 'danger' : 'info'}`}>
                                                            {isOverdue ? 'Overdue' : 'Scheduled'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="table-actions">
                                                            <input
                                                                className="review-note-input"
                                                                type="text"
                                                                value={reviewNote}
                                                                onChange={(e) => setReviewNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                                                placeholder="Review note (optional)"
                                                                disabled={isRowMutating}
                                                            />
                                                            <button className="admin-btn secondary small" onClick={() => handleEdit(item)} disabled={isRowMutating}>Edit</button>
                                                            <button className="admin-btn success small" onClick={() => handleApprove(item.id, reviewNote)} disabled={isRowMutating}>Publish now</button>
                                                            <button className="admin-btn warning small" onClick={() => handleReject(item.id, reviewNote)} disabled={isRowMutating}>Return to draft</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}
                    </div>
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
                                    <label>Title *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. UP Police Constable Recruitment 2026"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Organization *</label>
                                    <input
                                        type="text"
                                        value={formData.organization}
                                        onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                        placeholder="e.g. UPPRPB"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label>Type *</label>
                                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as ContentType })}>
                                        <option value="job">Job</option>
                                        <option value="result">Result</option>
                                        <option value="admit-card">Admit Card</option>
                                        <option value="answer-key">Answer Key</option>
                                        <option value="admission">Admission</option>
                                        <option value="syllabus">Syllabus</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Category *</label>
                                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                                        <option value="Central Government">Central Government</option>
                                        <option value="State Government">State Government</option>
                                        <option value="Banking">Banking</option>
                                        <option value="Railways">Railways</option>
                                        <option value="Defence">Defence</option>
                                        <option value="PSU">PSU</option>
                                        <option value="University">University</option>
                                        <option value="Police">Police</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label>Total Posts</label>
                                    <input
                                        type="number"
                                        value={formData.totalPosts}
                                        onChange={(e) => setFormData({ ...formData, totalPosts: e.target.value })}
                                        placeholder="e.g. 32679"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Last Date to Apply</label>
                                    <input
                                        type="date"
                                        value={formData.deadline}
                                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label>Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as AnnouncementStatus })}
                                    >
                                        {STATUS_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Publish at</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.publishAt}
                                        onChange={(e) => setFormData({ ...formData, publishAt: e.target.value })}
                                        disabled={formData.status !== 'scheduled'}
                                    />
                                </div>
                            </div>
                        </div>

                        {formWarnings.length > 0 && (
                            <div className="qa-panel">
                                <h4>QA checks</h4>
                                <ul>
                                    {formWarnings.map((warning) => (
                                        <li key={warning}>{warning}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Job Details Form */}
                        <JobPostingForm
                            initialData={jobDetails || undefined}
                            onSubmit={async (details) => {
                                if (!adminToken) {
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

                                    const response = await fetch(url, {
                                        method,
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${adminToken}`,
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
                                if (!adminToken) {
                                    setMessage('Not authenticated');
                                    return;
                                }
                                try {
                                    const jsonData = JSON.parse(bulkJson);
                                    const response = await fetch(`${apiBase}/api/bulk/import`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${adminToken}`,
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
                                <button className="admin-btn secondary" onClick={refreshAuditLogs} disabled={auditLoading}>
                                    {auditLoading ? 'Refreshing...' : 'Refresh'}
                                </button>
                            </div>
                        </div>

                        <div className="admin-filter-panel">
                            <div className="filter-group">
                                <label>Admin ID</label>
                                <input
                                    type="text"
                                    value={auditFilters.userId}
                                    onChange={(e) => setAuditFilters((prev) => ({ ...prev, userId: e.target.value }))}
                                    placeholder="User ID"
                                />
                            </div>
                            <div className="filter-group">
                                <label>Action</label>
                                <select
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
                                <label>Start date</label>
                                <input
                                    type="date"
                                    value={auditFilters.start}
                                    onChange={(e) => setAuditFilters((prev) => ({ ...prev, start: e.target.value }))}
                                />
                            </div>
                            <div className="filter-group">
                                <label>End date</label>
                                <input
                                    type="date"
                                    value={auditFilters.end}
                                    onChange={(e) => setAuditFilters((prev) => ({ ...prev, end: e.target.value }))}
                                />
                            </div>
                            <div className="filter-group">
                                <label>Limit</label>
                                <input
                                    type="number"
                                    min={10}
                                    max={200}
                                    value={auditLimit}
                                    onChange={(e) => setAuditLimit(Number(e.target.value) || 50)}
                                />
                            </div>
                            <div className="filter-actions">
                                <button className="admin-btn secondary" onClick={refreshAuditLogs} disabled={auditLoading}>
                                    Apply
                                </button>
                                <button
                                    className="admin-btn secondary"
                                    onClick={() => {
                                        setAuditFilters({ userId: '', action: '', start: '', end: '' });
                                        setAuditLimit(50);
                                        refreshAuditLogs();
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
                        )}
                    </div>
                ) : activeAdminTab === 'security' ? (
                    <SecurityLogsTable adminToken={adminToken} />
                ) : (
                    <div className="admin-form-container">
                        <form onSubmit={handleSubmit} className="admin-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Title *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. SSC CGL 2025 Recruitment"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label>Type *</label>
                                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as ContentType })}>
                                        <option value="job">Job</option>
                                        <option value="result">Result</option>
                                        <option value="admit-card">Admit Card</option>
                                        <option value="answer-key">Answer Key</option>
                                        <option value="admission">Admission</option>
                                        <option value="syllabus">Syllabus</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Category *</label>
                                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                                        <option value="Central Government">Central Government</option>
                                        <option value="State Government">State Government</option>
                                        <option value="Banking">Banking</option>
                                        <option value="Railways">Railways</option>
                                        <option value="Defence">Defence</option>
                                        <option value="PSU">PSU</option>
                                        <option value="University">University</option>
                                    </select>
                                </div>
                            </div>

                            {/* Rest of form fields - simplified for brevity, assume similar to original */}
                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label>Organization *</label>
                                    <input
                                        type="text"
                                        value={formData.organization}
                                        onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Location</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label>Total Posts</label>
                                    <input
                                        type="number"
                                        value={formData.totalPosts}
                                        onChange={(e) => setFormData({ ...formData, totalPosts: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Last Date</label>
                                    <input
                                        type="date"
                                        value={formData.deadline}
                                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label>Qualification</label>
                                    <input
                                        type="text"
                                        value={formData.minQualification}
                                        onChange={(e) => setFormData({ ...formData, minQualification: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Age Limit</label>
                                    <input
                                        type="text"
                                        value={formData.ageLimit}
                                        onChange={(e) => setFormData({ ...formData, ageLimit: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label>Application Fee</label>
                                    <input
                                        type="text"
                                        value={formData.applicationFee}
                                        onChange={(e) => setFormData({ ...formData, applicationFee: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>External Link</label>
                                    <input
                                        type="url"
                                        value={formData.externalLink}
                                        onChange={(e) => setFormData({ ...formData, externalLink: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label>Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as AnnouncementStatus })}
                                    >
                                        {STATUS_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Publish at</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.publishAt}
                                        onChange={(e) => setFormData({ ...formData, publishAt: e.target.value })}
                                        disabled={formData.status !== 'scheduled'}
                                    />
                                </div>
                            </div>

                            {formWarnings.length > 0 && (
                                <div className="qa-panel">
                                    <h4>QA checks</h4>
                                    <ul>
                                        {formWarnings.map((warning) => (
                                            <li key={warning}>{warning}</li>
                                        ))}
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
                                    if (!adminToken || !previewData) return;
                                    setMessage(editingId ? 'Publishing...' : 'Creating...');
                                    try {
                                        const url = editingId
                                            ? `${apiBase}/api/admin/announcements/${editingId}`
                                            : `${apiBase}/api/admin/announcements`;
                                        const response = await fetch(url, {
                                            method: editingId ? 'PUT' : 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${adminToken}`,
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

export default AdminPage;


