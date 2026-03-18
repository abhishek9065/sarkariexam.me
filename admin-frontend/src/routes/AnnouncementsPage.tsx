import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAdminAuth } from '../app/useAdminAuth';
import { useAdminPreferences } from '../app/useAdminPreferences';
import { OpsCard, OpsEmptyState, OpsErrorState, OpsTable } from '../components/ops';
import {
    ActionOverflowMenu,
    TableToolbar,
    useAdminNotifications,
    useConfirmDialog,
} from '../components/ops/legacy-port';
import {
    createAdminSavedView,
    createAnnouncementDraft,
    deleteAdminSavedView,
    getAdminAnnouncementsPaged,
    getAdminSavedViews,
    getBulkUpdatePreview,
    getManagePostsWorkspace,
    runBulkUpdate,
    updateAdminAnnouncement,
} from '../lib/api/client';
import { hasAdminPermission } from '../lib/adminRbac';
import { trackAdminTelemetry } from '../lib/adminTelemetry';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import type {
    AdminAnnouncementAssigneeFilter,
    AdminAnnouncementFilterPreset,
    AdminAnnouncementListItem,
    AdminManagePostsLane,
    AdminSavedView,
    AnnouncementSortOption,
    AnnouncementStatusFilter,
    AnnouncementTypeFilter,
} from '../types';

const STATUS_KEY = 'admin-vnext-announcements-status';
const TYPE_KEY = 'admin-vnext-announcements-type';
const SEARCH_KEY = 'admin-vnext-announcements-search';
const LIMIT_KEY = 'admin-vnext-announcements-limit';
const OFFSET_KEY = 'admin-vnext-announcements-offset';
const SORT_KEY = 'admin-vnext-announcements-sort';
const VIEW_SELECTED_KEY = 'admin-vnext-announcements-view-selected';
const ASSIGNEE_KEY = 'admin-vnext-announcements-assignee';

const LIMIT_OPTIONS = [20, 40, 60, 100];

type BulkAction = 'submit-review' | 'publish' | 'mark-expired' | 'pin-home';

const parseBoundedInt = (raw: string, fallback: number, min: number, max: number) => {
    const parsed = Number(raw.replace(/"/g, ''));
    if (Number.isFinite(parsed) && parsed >= min && parsed <= max) return parsed;
    return fallback;
};

const statusChipClass = (status?: string) => {
    if (status === 'published') return 'published';
    if (status === 'pending') return 'review';
    if (status === 'scheduled') return 'scheduled';
    if (status === 'archived') return 'expired';
    return 'draft';
};

const applySafeString = (value: unknown, fallback = '') => {
    if (typeof value !== 'string') return fallback;
    return value;
};

const applySafeStatus = (value: unknown): AnnouncementStatusFilter | 'all' => {
    const allowed: Array<AnnouncementStatusFilter | 'all'> = ['all', 'draft', 'pending', 'scheduled', 'published', 'archived'];
    if (typeof value === 'string' && allowed.includes(value as AnnouncementStatusFilter | 'all')) {
        return value as AnnouncementStatusFilter | 'all';
    }
    return 'all';
};

const applySafeType = (value: unknown): AnnouncementTypeFilter | 'all' => {
    const allowed: Array<AnnouncementTypeFilter | 'all'> = ['all', 'job', 'result', 'admit-card', 'answer-key', 'syllabus', 'admission'];
    if (typeof value === 'string' && allowed.includes(value as AnnouncementTypeFilter | 'all')) {
        return value as AnnouncementTypeFilter | 'all';
    }
    return 'all';
};

const applySafeSort = (value: unknown): AnnouncementSortOption => {
    const allowed: AnnouncementSortOption[] = ['newest', 'oldest', 'updated', 'deadline', 'views'];
    if (typeof value === 'string' && allowed.includes(value as AnnouncementSortOption)) {
        return value as AnnouncementSortOption;
    }
    return 'newest';
};

const applySafeAssignee = (value: unknown): AdminAnnouncementAssigneeFilter | '' => {
    const allowed: AdminAnnouncementAssigneeFilter[] = ['me', 'unassigned', 'assigned'];
    if (typeof value === 'string' && allowed.includes(value as AdminAnnouncementAssigneeFilter)) {
        return value as AdminAnnouncementAssigneeFilter;
    }
    return '';
};

const mapViewsToPresets = (views: AdminSavedView[]): AdminAnnouncementFilterPreset[] => views.map((view) => {
    const filters = (view.filters ?? {}) as Record<string, unknown>;
    return {
        id: view.id,
        label: view.name,
        query: applySafeString(filters.search),
        type: applySafeType(filters.type),
        status: applySafeStatus(filters.status),
        sort: applySafeSort((view.sort as Record<string, unknown> | undefined)?.option),
    };
});

const buildBulkPreviewMessage = (action: BulkAction, totalTargets: number, warnings: string[]) => {
    const actionLabel = action === 'submit-review'
        ? 'submit for review'
        : action === 'mark-expired'
            ? 'mark expired'
            : action === 'pin-home'
                ? 'pin to homepage'
                : 'publish';

    if (warnings.length === 0) {
        return `This will ${actionLabel} ${totalTargets} selected post(s).`;
    }

    return `This will ${actionLabel} ${totalTargets} selected post(s). Warnings: ${warnings.join(' ')}`;
};

export function AnnouncementsPage() {
    const { formatDateTime } = useAdminPreferences();
    const { user, permissions, stepUpToken, hasValidStepUp } = useAdminAuth();
    const { notifySuccess, notifyError, notifyInfo } = useAdminNotifications();
    const { confirm } = useConfirmDialog();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();

    const [status, setStatus] = useLocalStorageState<AnnouncementStatusFilter | 'all'>(STATUS_KEY, 'all');
    const [type, setType] = useLocalStorageState<AnnouncementTypeFilter | 'all'>(TYPE_KEY, 'all');
    const [search, setSearch] = useLocalStorageState<string>(SEARCH_KEY, '');
    const [limit, setLimit] = useLocalStorageState<number>(LIMIT_KEY, 40, (raw) => parseBoundedInt(raw, 40, 20, 100));
    const [offset, setOffset] = useLocalStorageState<number>(OFFSET_KEY, 0, (raw) => parseBoundedInt(raw, 0, 0, 100000));
    const [sortOption, setSortOption] = useLocalStorageState<AnnouncementSortOption>(SORT_KEY, 'newest');
    const [dateStart, setDateStart] = useLocalStorageState<string>('admin-vnext-announcements-date-start', '');
    const [dateEnd, setDateEnd] = useLocalStorageState<string>('admin-vnext-announcements-date-end', '');
    const [author, setAuthor] = useLocalStorageState<string>('admin-vnext-announcements-author', '');
    const [selectedViewId, setSelectedViewId] = useLocalStorageState<string>(VIEW_SELECTED_KEY, '');
    const [assignee, setAssignee] = useLocalStorageState<AdminAnnouncementAssigneeFilter | ''>(ASSIGNEE_KEY, '');

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [saveViewOpen, setSaveViewOpen] = useState(false);
    const [saveViewName, setSaveViewName] = useState('');
    const [saveViewScope, setSaveViewScope] = useState<'private' | 'shared'>('private');
    const [previewingAction, setPreviewingAction] = useState<BulkAction | null>(null);

    const actorRole = user?.role;
    const canWrite = hasAdminPermission(permissions, actorRole, 'announcements:write');
    const canApprove = hasAdminPermission(permissions, actorRole, 'announcements:approve');
    const canManageViews = canWrite;
    const canManageSharedViews = actorRole === 'admin';

    const focusId = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const value = params.get('focus');
        return value?.trim() || '';
    }, [location.search]);

    useEffect(() => {
        if (!canManageSharedViews && saveViewScope !== 'private') {
            setSaveViewScope('private');
        }
    }, [canManageSharedViews, saveViewScope]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const org = params.get('organization');
        const tag = params.get('tag');
        const nextSearch = (org && org.trim()) || (tag && tag.trim()) || '';
        if (nextSearch) {
            setSearch(nextSearch);
            const newParams = new URLSearchParams(location.search);
            newParams.delete('organization');
            newParams.delete('tag');
            const newSearch = newParams.toString();
            navigate(location.pathname + (newSearch ? `?${newSearch}` : ''), { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const invalidateManagePostsQueries = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['admin-announcements'] }),
            queryClient.invalidateQueries({ queryKey: ['admin-manage-posts-workspace'] }),
        ]);
    };

    const workspaceQuery = useQuery({
        queryKey: ['admin-manage-posts-workspace'],
        queryFn: () => getManagePostsWorkspace(),
        staleTime: 30_000,
    });

    const query = useQuery({
        queryKey: ['admin-announcements', status, type, search, limit, offset, sortOption, dateStart, dateEnd, author, assignee],
        queryFn: () => getAdminAnnouncementsPaged({
            limit,
            offset,
            status,
            type,
            search,
            sort: sortOption,
            dateStart,
            dateEnd,
            author,
            assignee: assignee || undefined,
            includeInactive: true,
        }),
    });

    const viewsQuery = useQuery({
        queryKey: ['admin-saved-views', 'manage-posts'],
        queryFn: () => getAdminSavedViews({ module: 'manage-posts', scope: 'all', limit: 100, offset: 0 }),
        staleTime: 30_000,
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => updateAdminAnnouncement(id, payload),
        onSuccess: async () => {
            await invalidateManagePostsQueries();
        },
    });

    const createDraftMutation = useMutation({
        mutationFn: (input: { type?: AnnouncementTypeFilter; title?: string; category?: string; organization?: string }) => createAnnouncementDraft(input),
        onSuccess: async (draft) => {
            await invalidateManagePostsQueries();
            notifySuccess('Draft created', `Duplicated as draft ${draft.id}`);
            navigate(`/detailed-post?focus=${encodeURIComponent(draft.id)}`);
        },
        onError: (error) => {
            notifyError('Duplicate failed', error instanceof Error ? error.message : 'Unable to duplicate post.');
        },
    });

    const bulkMutation = useMutation({
        mutationFn: ({ ids, payload, token }: { ids: string[]; payload: Record<string, unknown>; token: string }) => runBulkUpdate(ids, payload, token),
        onSuccess: async () => {
            await invalidateManagePostsQueries();
            setSelectedIds([]);
        },
    });

    const saveViewMutation = useMutation({
        mutationFn: () => createAdminSavedView({
            name: saveViewName.trim(),
            module: 'manage-posts',
            scope: canManageSharedViews ? saveViewScope : 'private',
            filters: {
                search,
                status,
                type,
                limit,
                dateStart,
                dateEnd,
                author,
                assignee,
            },
            sort: { option: sortOption },
            columns: ['title', 'status', 'type', 'updatedAt'],
            isDefault: false,
        }),
        onSuccess: async (view) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['admin-saved-views'] }),
                queryClient.invalidateQueries({ queryKey: ['admin-manage-posts-workspace'] }),
            ]);
            setSelectedViewId(view.id);
            setSaveViewOpen(false);
            setSaveViewName('');
            setSaveViewScope('private');
            notifySuccess('Saved view created', view.name);
        },
        onError: (error) => {
            notifyError('Failed to save view', error instanceof Error ? error.message : 'Unable to save current filters.');
        },
    });

    const deleteViewMutation = useMutation({
        mutationFn: (id: string) => deleteAdminSavedView(id),
        onSuccess: async (result) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['admin-saved-views'] }),
                queryClient.invalidateQueries({ queryKey: ['admin-manage-posts-workspace'] }),
            ]);
            if (selectedViewId === result.id) {
                setSelectedViewId('');
            }
            notifySuccess('Saved view deleted', 'Preset removed from this workspace.');
        },
        onError: (error) => {
            notifyError('Delete failed', error instanceof Error ? error.message : 'Unable to delete saved view.');
        },
    });

    const rows = useMemo(() => query.data?.data ?? [], [query.data?.data]);
    const total = query.data?.meta.total ?? 0;
    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const presets = useMemo(() => mapViewsToPresets(viewsQuery.data?.data ?? []), [viewsQuery.data?.data]);
    const selectedView = useMemo(
        () => (viewsQuery.data?.data ?? []).find((view) => view.id === selectedViewId),
        [selectedViewId, viewsQuery.data?.data]
    );

    const canDeleteSelectedView = Boolean(
        selectedView
        && canManageViews
        && (selectedView.scope !== 'shared' || canManageSharedViews)
        && (
            selectedView.scope !== 'private'
            || !selectedView.createdBy
            || selectedView.createdBy === user?.id
            || canManageSharedViews
        )
    );

    useEffect(() => {
        setSelectedIds((current) => current.filter((id) => rows.some((row) => (row.id || row._id) === id)));
    }, [rows]);

    useEffect(() => {
        if (!query.isPending && !query.isError) {
            void trackAdminTelemetry('admin_list_loaded', {
                module: 'announcements',
                count: rows.length,
                total,
                status,
                type,
                sort: sortOption,
                offset,
                limit,
                assignee: assignee || 'all',
            });
        }
    }, [assignee, limit, offset, query.isError, query.isPending, rows.length, sortOption, status, total, type]);

    useEffect(() => {
        void trackAdminTelemetry('admin_filter_applied', {
            module: 'announcements',
            status,
            type,
            sort: sortOption,
            hasQuery: Boolean(search.trim()),
            hasDateRange: Boolean(dateStart || dateEnd),
            assignee: assignee || 'all',
        });
    }, [assignee, dateEnd, dateStart, search, sortOption, status, type]);

    const applyPreset = (presetId: string) => {
        setSelectedViewId(presetId);
        if (!presetId) return;

        const view = (viewsQuery.data?.data ?? []).find((item) => item.id === presetId);
        if (!view) return;

        const filters = (view.filters ?? {}) as Record<string, unknown>;
        setSearch(applySafeString(filters.search));
        setType(applySafeType(filters.type));
        setStatus(applySafeStatus(filters.status));
        const nextLimit = Number(filters.limit);
        if (Number.isFinite(nextLimit) && LIMIT_OPTIONS.includes(nextLimit)) {
            setLimit(nextLimit);
        }
        setDateStart(applySafeString(filters.dateStart));
        setDateEnd(applySafeString(filters.dateEnd));
        setAuthor(applySafeString(filters.author));
        setAssignee(applySafeAssignee(filters.assignee));
        setSortOption(applySafeSort((view.sort as Record<string, unknown> | undefined)?.option));
        setOffset(0);

        notifyInfo('Saved view applied', view.name);
    };

    const clearFilters = () => {
        setSearch('');
        setType('all');
        setStatus('all');
        setSortOption('newest');
        setDateStart('');
        setDateEnd('');
        setAuthor('');
        setAssignee('');
        setOffset(0);
        setSelectedViewId('');
    };

    const applyLane = (lane: AdminManagePostsLane) => {
        setStatus(lane.status ?? 'all');
        setAssignee(lane.assignee ?? '');
        setOffset(0);
    };

    const runBulkAction = useCallback(async (action: BulkAction) => {
        if (!canWrite) {
            notifyError('Read-only access', 'This role cannot update posts from Manage Posts.');
            return;
        }

        if (action === 'publish' && !canApprove) {
            notifyError('Approval required', 'Publishing is only available to roles with announcement approval access.');
            return;
        }

        if (selectedIds.length === 0) {
            notifyInfo('No rows selected', 'Select rows before running bulk actions.');
            return;
        }

        const payloadByAction: Record<BulkAction, Record<string, unknown>> = {
            'submit-review': { status: 'pending' },
            publish: { status: 'published' },
            'mark-expired': { status: 'archived' },
            'pin-home': { home: { section: 'important', highlight: true, stickyRank: 1 } },
        };

        try {
            setPreviewingAction(action);
            const preview = await getBulkUpdatePreview({
                ids: selectedIds,
                data: payloadByAction[action],
            });
            const ok = await confirm({
                title: 'Preview bulk action',
                message: buildBulkPreviewMessage(action, preview.totalTargets, preview.warnings),
                confirmText: 'Apply action',
                cancelText: 'Cancel',
                variant: preview.warnings.length > 0 ? 'warning' : 'info',
            });
            if (!ok) return;
        } catch (error) {
            notifyError('Bulk preview failed', error instanceof Error ? error.message : 'Unable to preview this bulk action.');
            return;
        } finally {
            setPreviewingAction(null);
        }

        if (!hasValidStepUp || !stepUpToken) {
            notifyError('Step-up required', 'All bulk actions require active step-up verification.');
            return;
        }

        bulkMutation.mutate({ ids: selectedIds, payload: payloadByAction[action], token: stepUpToken }, {
            onSuccess: () => {
                notifySuccess('Bulk action complete', `${action.replace('-', ' ')} applied to ${selectedIds.length} item(s).`);
                void trackAdminTelemetry('admin_bulk_action', { action, count: selectedIds.length });
            },
            onError: (error) => notifyError('Bulk action failed', error instanceof Error ? error.message : 'Bulk operation failed.'),
        });
    }, [bulkMutation, canApprove, canWrite, confirm, hasValidStepUp, notifyError, notifyInfo, notifySuccess, selectedIds, stepUpToken]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const inTypingContext =
                event.target instanceof HTMLInputElement
                || event.target instanceof HTMLTextAreaElement
                || event.target instanceof HTMLSelectElement
                || (event.target instanceof HTMLElement && event.target.isContentEditable);

            if (!canWrite) return;

            if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'n' && !inTypingContext) {
                event.preventDefault();
                navigate('/create-post');
                return;
            }

            if (canManageViews && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                setSaveViewOpen(true);
                if (!saveViewName.trim()) {
                    setSaveViewName(`View ${new Date().toLocaleString()}`);
                }
                if (!canManageSharedViews) {
                    setSaveViewScope('private');
                }
                return;
            }

            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                void runBulkAction('submit-review');
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [canManageSharedViews, canManageViews, canWrite, navigate, runBulkAction, saveViewName]);

    const summaryCards = workspaceQuery.data ? [
        {
            key: 'total',
            label: 'Total Posts',
            value: workspaceQuery.data.summary.total,
            hint: `${workspaceQuery.data.summary.published} live · ${workspaceQuery.data.summary.draft} draft`,
        },
        {
            key: 'pending',
            label: 'Pending Review',
            value: workspaceQuery.data.summary.pending,
            hint: `${workspaceQuery.data.summary.unassignedPending} unassigned`,
        },
        {
            key: 'assigned',
            label: 'Assigned To You',
            value: workspaceQuery.data.summary.assignedToMe,
            hint: `${workspaceQuery.data.summary.overdueReview} overdue review item(s)`,
        },
        {
            key: 'sla',
            label: 'Stale Pending',
            value: workspaceQuery.data.summary.stalePending,
            hint: `${workspaceQuery.data.pendingSla.averageDays.toFixed(1)} day avg review age`,
        },
        {
            key: 'views',
            label: 'Saved Views',
            value: workspaceQuery.data.summary.accessibleSavedViews,
            hint: canManageViews ? 'View presets available in this workspace' : 'Read-only roles can reuse existing presets',
        },
    ] : [];

    const activeLaneId = useMemo(() => {
        if (assignee === 'me' && status === 'all') return 'my-queue';
        if (status === 'pending' && !assignee) return 'pending-review';
        if (status === 'scheduled' && !assignee) return 'scheduled';
        if (status === 'published' && !assignee) return 'published';
        if (status === 'all' && !assignee) return 'all-posts';
        return '';
    }, [assignee, status]);

    const filterSummaryParts = [
        `${rows.length} shown on page ${page}/${totalPages}`,
        `total=${total}`,
        `selected=${selectedIds.length}`,
        `status=${status}`,
        `type=${type}`,
        `sort=${sortOption}`,
    ];
    if (assignee) filterSummaryParts.push(`assignee=${assignee}`);
    if (dateStart || dateEnd) filterSummaryParts.push(`updated=${dateStart || '...'} to ${dateEnd || '...'}`);
    if (author.trim()) filterSummaryParts.push(`author=${author.trim()}`);
    const filterSummary = filterSummaryParts.join(' | ');

    const allVisibleSelected = canWrite && rows.length > 0 && rows.every((row) => {
        const id = row.id || row._id || '';
        return id ? selectedIds.includes(id) : false;
    });

    const columns = [
        ...(canWrite ? [{ key: 'select', label: 'Select' }] : []),
        { key: 'title', label: 'Title' },
        { key: 'status', label: 'Status' },
        { key: 'type', label: 'Type' },
        { key: 'owner', label: 'Owner' },
        { key: 'sla', label: 'Review SLA' },
        { key: 'updated', label: 'Updated' },
        { key: 'actions', label: 'Actions' },
    ];

    return (
        <OpsCard title="Manage Posts" description="Capability-aware workflow workspace for list filters, saved views, queue lanes, and preview-first bulk actions.">
            {workspaceQuery.isSuccess ? (
                <>
                    <div className="ops-kpi-grid">
                        {summaryCards.map((card) => (
                            <div key={card.key} className="ops-kpi-card">
                                <div className="ops-kpi-label">{card.label}</div>
                                <div className="ops-kpi-value">{card.value}</div>
                                <div className="ops-kpi-trend neutral">{card.hint}</div>
                            </div>
                        ))}
                    </div>
                    <div className="ops-actions" aria-label="Manage post lanes">
                        {workspaceQuery.data.lanes.map((lane) => (
                            <button
                                key={lane.id}
                                type="button"
                                className={`admin-btn small ${activeLaneId === lane.id ? 'primary' : 'subtle'}`}
                                onClick={() => applyLane(lane)}
                            >
                                {lane.label} ({lane.count})
                            </button>
                        ))}
                        <span className="ops-inline-muted">Workspace refreshed {formatDateTime(workspaceQuery.data.generatedAt)}</span>
                    </div>
                </>
            ) : null}

            {workspaceQuery.error ? <OpsErrorState message="Failed to load manage-posts workspace summary." /> : null}
            {!canWrite ? (
                <div className="admin-alert info">
                    Read-only access. Filters and saved presets are available, but create, edit, publish, and bulk actions are hidden for this role.
                </div>
            ) : null}

            <TableToolbar
                searchQuery={search}
                onSearchChange={(value) => {
                    setSearch(value);
                    setOffset(0);
                }}
                typeFilter={type}
                onTypeFilterChange={(value) => {
                    setType(value);
                    setOffset(0);
                }}
                statusFilter={status}
                onStatusFilterChange={(value) => {
                    setStatus(value);
                    setOffset(0);
                }}
                sortOption={sortOption}
                onSortChange={(value) => {
                    setSortOption(value);
                    setOffset(0);
                }}
                quickChips={[
                    {
                        id: 'view-my-queue',
                        label: 'My Queue',
                        active: activeLaneId === 'my-queue',
                        onClick: () => applyLane({ id: 'my-queue', label: 'My Queue', description: '', count: 0, status: 'all', assignee: 'me' }),
                    },
                    {
                        id: 'view-pending',
                        label: 'Pending',
                        active: status === 'pending' && !assignee,
                        onClick: () => applyLane({ id: 'pending-review', label: 'Pending Review', description: '', count: 0, status: 'pending' }),
                    },
                    {
                        id: 'view-scheduled',
                        label: 'Scheduled',
                        active: status === 'scheduled' && !assignee,
                        onClick: () => applyLane({ id: 'scheduled', label: 'Scheduled', description: '', count: 0, status: 'scheduled' }),
                    },
                    {
                        id: 'view-published',
                        label: 'Published',
                        active: status === 'published' && !assignee,
                        onClick: () => applyLane({ id: 'published', label: 'Published', description: '', count: 0, status: 'published' }),
                    },
                ]}
                presets={presets}
                selectedPresetId={selectedViewId}
                dateStart={dateStart}
                onDateStartChange={(value) => {
                    setDateStart(value);
                    setOffset(0);
                }}
                dateEnd={dateEnd}
                onDateEndChange={(value) => {
                    setDateEnd(value);
                    setOffset(0);
                }}
                authorFilter={author}
                onAuthorFilterChange={(value) => {
                    setAuthor(value);
                    setOffset(0);
                }}
                onSelectPreset={applyPreset}
                onSavePreset={canManageViews ? () => {
                    if (!saveViewName.trim()) {
                        setSaveViewName(`View ${new Date().toLocaleString()}`);
                    }
                    if (!canManageSharedViews) {
                        setSaveViewScope('private');
                    }
                    setSaveViewOpen(true);
                } : undefined}
                filterSummary={filterSummary}
                onClearFilters={clearFilters}
            />

            <div className="ops-actions">
                <label className="ops-inline-muted" htmlFor="admin-list-limit">Rows per page</label>
                <select
                    id="admin-list-limit"
                    value={limit}
                    onChange={(event) => {
                        const nextLimit = Number(event.target.value);
                        if (!LIMIT_OPTIONS.includes(nextLimit)) return;
                        setLimit(nextLimit);
                        setOffset(0);
                    }}
                >
                    {LIMIT_OPTIONS.map((value) => (
                        <option key={value} value={value}>{value}</option>
                    ))}
                </select>
                {canWrite ? (
                    <>
                        <button
                            type="button"
                            className="admin-btn small"
                            onClick={() => { void runBulkAction('submit-review'); }}
                            disabled={selectedIds.length === 0 || bulkMutation.isPending || previewingAction !== null || !hasValidStepUp}
                        >
                            Submit for review
                        </button>
                        {canApprove ? (
                            <button
                                type="button"
                                className="admin-btn small"
                                onClick={() => { void runBulkAction('publish'); }}
                                disabled={selectedIds.length === 0 || bulkMutation.isPending || previewingAction !== null || !hasValidStepUp}
                            >
                                Publish (step-up)
                            </button>
                        ) : null}
                        <button
                            type="button"
                            className="admin-btn small subtle"
                            onClick={() => { void runBulkAction('mark-expired'); }}
                            disabled={selectedIds.length === 0 || bulkMutation.isPending || previewingAction !== null || !hasValidStepUp}
                        >
                            Mark expired
                        </button>
                        <button
                            type="button"
                            className="admin-btn small subtle"
                            onClick={() => { void runBulkAction('pin-home'); }}
                            disabled={selectedIds.length === 0 || bulkMutation.isPending || previewingAction !== null || !hasValidStepUp}
                        >
                            Pin to homepage
                        </button>
                    </>
                ) : null}
                {selectedView && canDeleteSelectedView ? (
                    <button
                        type="button"
                        className="admin-btn small danger"
                        onClick={async () => {
                            const ok = await confirm({
                                title: 'Delete saved view?',
                                message: `Delete preset "${selectedView.name}" from this workspace?`,
                                confirmText: 'Delete',
                                cancelText: 'Cancel',
                                variant: 'danger',
                            });
                            if (!ok) return;
                            deleteViewMutation.mutate(selectedView.id);
                        }}
                        disabled={deleteViewMutation.isPending}
                    >
                        Delete selected view
                    </button>
                ) : null}
            </div>

            {query.isPending ? <div className="admin-alert info">Loading announcements...</div> : null}
            {query.error ? <OpsErrorState message="Failed to load announcements list." /> : null}
            {bulkMutation.isError ? (
                <OpsErrorState message={bulkMutation.error instanceof Error ? bulkMutation.error.message : 'Bulk action failed.'} />
            ) : null}

            {rows.length > 0 ? (
                <OpsTable columns={columns}>
                    {canWrite ? (
                        <tr>
                            <td>
                                <input
                                    type="checkbox"
                                    checked={allVisibleSelected}
                                    onChange={(event) => {
                                        if (event.target.checked) {
                                            const ids = rows.map((item) => item.id || item._id || '').filter(Boolean);
                                            setSelectedIds((current) => Array.from(new Set([...current, ...ids])));
                                        } else {
                                            const ids = new Set(rows.map((item) => item.id || item._id || '').filter(Boolean));
                                            setSelectedIds((current) => current.filter((id) => !ids.has(id)));
                                        }
                                    }}
                                    aria-label="Select all visible announcements"
                                />
                            </td>
                            <td colSpan={columns.length - 1} className="ops-inline-muted">
                                Select all rows on this page
                            </td>
                        </tr>
                    ) : null}
                    {rows.map((item: AdminAnnouncementListItem) => {
                        const id = item.id || item._id || '';
                        const isSelected = selectedIds.includes(id);
                        const isFocused = Boolean(focusId) && focusId === id;
                        const rowActions = [
                            {
                                id: 'copy-id',
                                label: 'Copy ID',
                                disabled: !id,
                                onClick: async () => {
                                    if (!id) return;
                                    try {
                                        await navigator.clipboard.writeText(id);
                                        notifySuccess('Copied', `Announcement ID copied: ${id}`);
                                        void trackAdminTelemetry('admin_row_action_clicked', { action: 'copy_id', id });
                                    } catch {
                                        notifyError('Clipboard failed', 'Unable to copy announcement ID.');
                                    }
                                },
                            },
                            ...(canWrite ? [
                                {
                                    id: 'open-detailed',
                                    label: 'Open detailed editor',
                                    disabled: !id,
                                    onClick: () => {
                                        if (!id) return;
                                        navigate(`/detailed-post?focus=${encodeURIComponent(id)}`);
                                        void trackAdminTelemetry('admin_row_action_clicked', { action: 'open_detailed', id });
                                    },
                                },
                                {
                                    id: 'duplicate',
                                    label: 'Duplicate',
                                    disabled: !id || createDraftMutation.isPending,
                                    onClick: () => {
                                        if (!id) return;
                                        createDraftMutation.mutate({
                                            type: item.type as AnnouncementTypeFilter,
                                            title: `${item.title || 'Untitled'} (Copy)`,
                                            category: item.category,
                                            organization: item.organization,
                                        });
                                    },
                                },
                                {
                                    id: 'mark-draft',
                                    label: 'Mark Draft',
                                    disabled: !id || updateMutation.isPending,
                                    onClick: () => {
                                        if (!id) return;
                                        updateMutation.mutate({ id, payload: { status: 'draft' } }, {
                                            onSuccess: () => {
                                                notifySuccess('Updated', 'Announcement moved to draft.');
                                                void trackAdminTelemetry('admin_row_action_clicked', { action: 'mark_draft', id });
                                            },
                                            onError: (error) => notifyError('Update failed', error instanceof Error ? error.message : 'Failed to update announcement.'),
                                        });
                                    },
                                },
                                {
                                    id: 'mark-pending',
                                    label: 'Mark Pending',
                                    disabled: !id || updateMutation.isPending,
                                    onClick: () => {
                                        if (!id) return;
                                        updateMutation.mutate({ id, payload: { status: 'pending' } }, {
                                            onSuccess: () => {
                                                notifySuccess('Updated', 'Announcement moved to pending.');
                                                void trackAdminTelemetry('admin_row_action_clicked', { action: 'mark_pending', id });
                                            },
                                            onError: (error) => notifyError('Update failed', error instanceof Error ? error.message : 'Failed to update announcement.'),
                                        });
                                    },
                                },
                            ] : []),
                        ];

                        return (
                            <tr key={id || item.slug || item.title} className={isFocused ? 'ops-row-highlight' : ''}>
                                {canWrite ? (
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(event) => {
                                                if (!id) return;
                                                setSelectedIds((current) => {
                                                    if (event.target.checked) {
                                                        return Array.from(new Set([...current, id]));
                                                    }
                                                    return current.filter((selected) => selected !== id);
                                                });
                                            }}
                                            aria-label={`Select ${item.title || id}`}
                                        />
                                    </td>
                                ) : null}
                                <td>
                                    <strong>{item.title || 'Untitled'}</strong>
                                    {id ? <div className="ops-inline-muted">ID: <code>{id}</code></div> : null}
                                </td>
                                <td>
                                    <span className={`ops-status-chip ${statusChipClass(item.status)}`}>
                                        {item.status || 'draft'}
                                    </span>
                                </td>
                                <td><span className="ops-status-chip scheduled">{item.type || '-'}</span></td>
                                <td>
                                    <div>{item.assigneeEmail || item.postedBy || 'Unassigned'}</div>
                                    {item.claimedByCurrentUser ? <div className="ops-inline-muted">Assigned to you</div> : null}
                                </td>
                                <td>
                                    {item.reviewDueAt ? (
                                        <span className={`ops-status-chip ${new Date(item.reviewDueAt).getTime() < Date.now() ? 'expired' : 'review'}`}>
                                            {formatDateTime(item.reviewDueAt)}
                                        </span>
                                    ) : (
                                        <span className="ops-inline-muted">No SLA</span>
                                    )}
                                </td>
                                <td>{formatDateTime(item.updatedAt || item.publishedAt || item.postedAt)}</td>
                                <td>
                                    <ActionOverflowMenu
                                        itemLabel={item.title || id || 'announcement'}
                                        actions={rowActions}
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </OpsTable>
            ) : null}

            <div className="ops-actions">
                <button
                    type="button"
                    className="admin-btn small"
                    onClick={() => setOffset((current) => Math.max(0, current - limit))}
                    disabled={offset <= 0 || query.isPending}
                >
                    Previous
                </button>
                <span className="ops-inline-muted">Page {page} of {totalPages}</span>
                <button
                    type="button"
                    className="admin-btn small"
                    onClick={() => setOffset((current) => (current + limit >= total ? current : current + limit))}
                    disabled={offset + limit >= total || query.isPending}
                >
                    Next
                </button>
            </div>

            {!query.isPending && !query.error && rows.length === 0 ? (
                <OpsEmptyState message="No announcements found for current filters." />
            ) : null}

            {saveViewOpen && canManageViews ? (
                <div className="ops-modal-overlay" role="presentation" onClick={() => setSaveViewOpen(false)}>
                    <div className="ops-modal" role="dialog" aria-modal="true" aria-label="Save list view" onClick={(event) => event.stopPropagation()}>
                        <h3>Save Current View</h3>
                        <p className="ops-inline-muted">Store current filters, sorting, assignee state, and page size as a reusable view.</p>
                        <div className="ops-form-grid two">
                            <input
                                value={saveViewName}
                                onChange={(event) => setSaveViewName(event.target.value)}
                                placeholder="View name"
                                minLength={2}
                                maxLength={120}
                            />
                            {canManageSharedViews ? (
                                <select
                                    value={saveViewScope}
                                    onChange={(event) => setSaveViewScope(event.target.value as 'private' | 'shared')}
                                >
                                    <option value="private">Private (only me)</option>
                                    <option value="shared">Shared (admins)</option>
                                </select>
                            ) : (
                                <input value="Private (only me)" disabled readOnly />
                            )}
                        </div>
                        <div className="ops-actions">
                            <button type="button" className="admin-btn" onClick={() => setSaveViewOpen(false)}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="admin-btn primary"
                                onClick={() => {
                                    if (saveViewName.trim().length < 2) {
                                        notifyError('Name required', 'Enter at least 2 characters for view name.');
                                        return;
                                    }
                                    saveViewMutation.mutate();
                                }}
                                disabled={saveViewMutation.isPending}
                            >
                                {saveViewMutation.isPending ? 'Saving...' : 'Save View'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </OpsCard>
    );
}
