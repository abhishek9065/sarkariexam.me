import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAdminAuth } from '../../app/useAdminAuth';
import { useAdminPreferences } from '../../app/useAdminPreferences';
import { AdminStepUpCard } from '../../components/AdminStepUpCard';
import { OpsCard, OpsErrorState } from '../../components/ops';
import { TableToolbar, useAdminNotifications, useConfirmDialog } from '../../components/ops/legacy-port';
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
    updateAdminSavedView,
} from '../../lib/api/client';
import { hasAdminPermission } from '../../lib/adminRbac';
import { trackAdminTelemetry } from '../../lib/adminTelemetry';
import { MANAGE_POSTS_LANE_REGISTRY } from '../../lib/managePostsContract';
import type { AnnouncementTypeFilter } from '../../types';
import { ManagePostsBulkActionBar } from './ManagePostsBulkActionBar';
import { ManagePostsSavedViewDialog } from './ManagePostsSavedViewDialog';
import { ManagePostsTable } from './ManagePostsTable';
import { useManagePostsState } from './useManagePostsState';
import { ManagePostsWorkspaceHeader } from './ManagePostsWorkspaceHeader';

type BulkAction = 'submit-review' | 'publish' | 'mark-expired' | 'pin-home';

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

export function ManagePostsModule() {
    const { formatDateTime } = useAdminPreferences();
    const { user, permissions, stepUpToken, hasValidStepUp } = useAdminAuth();
    const { notifySuccess, notifyError, notifyInfo } = useAdminNotifications();
    const { confirm } = useConfirmDialog();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [saveViewOpen, setSaveViewOpen] = useState(false);
    const [saveViewName, setSaveViewName] = useState('');
    const [saveViewScope, setSaveViewScope] = useState<'private' | 'shared'>('private');
    const [saveViewMode, setSaveViewMode] = useState<'create' | 'update'>('create');
    const [previewingAction, setPreviewingAction] = useState<BulkAction | null>(null);

    const actorRole = user?.role;
    const fallbackCanWrite = hasAdminPermission(permissions, actorRole, 'announcements:write');
    const fallbackCanApprove = hasAdminPermission(permissions, actorRole, 'announcements:approve');
    const fallbackCanRead = hasAdminPermission(permissions, actorRole, 'announcements:read');
    const fallbackCanManageSharedViews = actorRole === 'admin';

    const workspaceQuery = useQuery({
        queryKey: ['admin-manage-posts-workspace'],
        queryFn: () => getManagePostsWorkspace(),
        staleTime: 30_000,
    });

    const viewsQuery = useQuery({
        queryKey: ['admin-saved-views', 'manage-posts'],
        queryFn: () => getAdminSavedViews({ module: 'manage-posts', scope: 'all', limit: 100, offset: 0 }),
        staleTime: 30_000,
    });

    const {
        status,
        setStatus,
        type,
        setType,
        search,
        setSearch,
        limit,
        setLimit,
        offset,
        setOffset,
        sortOption,
        setSortOption,
        dateStart,
        setDateStart,
        dateEnd,
        setDateEnd,
        author,
        setAuthor,
        assignee,
        selectedViewId,
        setSelectedViewId,
        selectedView,
        presets,
        applyPreset,
        clearFilters,
        applyLane,
        activeLaneId,
    } = useManagePostsState({
        views: viewsQuery.data?.data ?? [],
        onPresetApplied: (view) => notifyInfo('Saved view applied', view.name),
    });

    const canWrite = workspaceQuery.data?.capabilities.announcementsWrite ?? fallbackCanWrite;
    const canApprove = workspaceQuery.data?.capabilities.announcementsApprove ?? fallbackCanApprove;
    const canManagePrivateViews = workspaceQuery.data?.capabilities.canManagePrivateViews ?? fallbackCanRead;
    const canManageSharedViews = workspaceQuery.data?.capabilities.canManageSharedViews ?? fallbackCanManageSharedViews;

    useEffect(() => {
        if (!canManageSharedViews && saveViewScope !== 'private') {
            setSaveViewScope('private');
        }
    }, [canManageSharedViews, saveViewScope]);

    const focusId = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const value = params.get('focus');
        return value?.trim() || '';
    }, [location.search]);

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
    }, [location.pathname, location.search, navigate, setSearch]);

    const invalidateManagePostsQueries = useCallback(async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['admin-announcements'] }),
            queryClient.invalidateQueries({ queryKey: ['admin-manage-posts-workspace'] }),
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard-v3'] }),
        ]);
    }, [queryClient]);

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

    const createViewMutation = useMutation({
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

    const updateViewMutation = useMutation({
        mutationFn: async () => {
            if (!selectedView) {
                throw new Error('Select a saved view before updating it.');
            }
            return updateAdminSavedView(selectedView.id, {
                name: saveViewName.trim(),
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
            });
        },
        onSuccess: async (view) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['admin-saved-views'] }),
                queryClient.invalidateQueries({ queryKey: ['admin-manage-posts-workspace'] }),
            ]);
            setSelectedViewId(view.id);
            setSaveViewOpen(false);
            notifySuccess('Saved view updated', view.name);
        },
        onError: (error) => {
            notifyError('Failed to update view', error instanceof Error ? error.message : 'Unable to update the selected view.');
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

    const ownsSelectedView = Boolean(
        !selectedView
        || selectedView.scope !== 'private'
        || !selectedView.createdBy
        || selectedView.createdBy === user?.id
        || canManageSharedViews,
    );
    const canEditSelectedView = Boolean(
        selectedView
        && (
            selectedView.scope === 'shared'
                ? canManageSharedViews
                : canManagePrivateViews && ownsSelectedView
        ),
    );
    const canDeleteSelectedView = canEditSelectedView;

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

    const openCreateViewDialog = useCallback(() => {
        if (!canManagePrivateViews) return;
        setSaveViewMode('create');
        setSaveViewName(`View ${new Date().toLocaleString()}`);
        setSaveViewScope(canManageSharedViews ? 'private' : 'private');
        setSaveViewOpen(true);
    }, [canManagePrivateViews, canManageSharedViews]);

    const openUpdateViewDialog = useCallback(() => {
        if (!selectedView) return;
        setSaveViewMode('update');
        setSaveViewName(selectedView.name);
        setSaveViewScope(canManageSharedViews ? selectedView.scope : 'private');
        setSaveViewOpen(true);
    }, [canManageSharedViews, selectedView]);

    const onSelectLaneById = useCallback((laneId: string) => {
        const lane = workspaceQuery.data?.lanes.find((item) => item.id === laneId)
            ?? MANAGE_POSTS_LANE_REGISTRY.find((item) => item.id === laneId);
        if (!lane) return;
        applyLane(lane);
    }, [applyLane, workspaceQuery.data?.lanes]);

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

            if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'n' && !inTypingContext && canWrite) {
                event.preventDefault();
                navigate('/create-post');
                return;
            }

            if (canManagePrivateViews && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                if (canEditSelectedView) {
                    openUpdateViewDialog();
                } else {
                    openCreateViewDialog();
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
    }, [canEditSelectedView, canManagePrivateViews, canWrite, navigate, openCreateViewDialog, openUpdateViewDialog, runBulkAction]);

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
            hint: canManagePrivateViews ? 'Private views stay personal unless you explicitly share them' : 'Saved presets available in this workspace',
        },
    ] : [];

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

    return (
        <OpsCard title="Manage Posts" description="Capability-aware workflow workspace for queue lanes, saved views, and preview-first list operations.">
            {workspaceQuery.isSuccess ? (
                <ManagePostsWorkspaceHeader
                    workspace={workspaceQuery.data}
                    summaryCards={summaryCards}
                    activeLaneId={activeLaneId}
                    onSelectLane={onSelectLaneById}
                    formatDateTime={formatDateTime}
                />
            ) : null}

            {workspaceQuery.error ? <OpsErrorState message="Failed to load manage-posts workspace summary." /> : null}

            {!canWrite ? (
                <div className="admin-alert info">
                    Read-only access. Filters, private saved views, and reusable presets are available, but create, edit, publish, and bulk content actions are hidden for this role.
                </div>
            ) : null}

            {canWrite ? (
                <AdminStepUpCard
                    title="Manage Posts Step-Up"
                    description="Unlock bulk publish, expire, and homepage pin actions without leaving this workspace."
                />
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
                quickChips={MANAGE_POSTS_LANE_REGISTRY.filter((lane) => lane.id !== 'all-posts').map((lane) => ({
                    id: `view-${lane.id}`,
                    label: lane.label,
                    active: activeLaneId === lane.id,
                    onClick: () => onSelectLaneById(lane.id),
                }))}
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
                onSavePreset={canManagePrivateViews ? openCreateViewDialog : undefined}
                filterSummary={filterSummary}
                onClearFilters={clearFilters}
            />

            <ManagePostsBulkActionBar
                limit={limit}
                onLimitChange={(value) => {
                    setLimit(value);
                    setOffset(0);
                }}
                canWrite={canWrite}
                canApprove={canApprove}
                hasValidStepUp={hasValidStepUp}
                selectedIdsCount={selectedIds.length}
                bulkPending={bulkMutation.isPending}
                previewingAction={previewingAction}
                onRunBulkAction={(action) => { void runBulkAction(action); }}
                selectedView={selectedView}
                canEditSelectedView={canEditSelectedView}
                canDeleteSelectedView={canDeleteSelectedView}
                onEditSelectedView={openUpdateViewDialog}
                onDeleteSelectedView={async () => {
                    if (!selectedView) return;
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
                deletePending={deleteViewMutation.isPending}
            />

            <ManagePostsTable
                rows={rows}
                canWrite={canWrite}
                focusId={focusId}
                formatDateTime={formatDateTime}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                onNavigateDetailed={(id) => navigate(`/detailed-post?focus=${encodeURIComponent(id)}`)}
                onDuplicate={(item) => {
                    createDraftMutation.mutate({
                        type: item.type as AnnouncementTypeFilter,
                        title: `${item.title || 'Untitled'} (Copy)`,
                        category: item.category,
                        organization: item.organization,
                    });
                }}
                onUpdateStatus={(id, nextStatus) => {
                    updateMutation.mutate({ id, payload: { status: nextStatus } }, {
                        onSuccess: () => {
                            notifySuccess('Updated', `Announcement moved to ${nextStatus}.`);
                            void trackAdminTelemetry('admin_row_action_clicked', { action: `mark_${nextStatus}`, id });
                        },
                        onError: (error) => notifyError('Update failed', error instanceof Error ? error.message : 'Failed to update announcement.'),
                    });
                }}
                notifySuccess={notifySuccess}
                notifyError={notifyError}
                createDraftPending={createDraftMutation.isPending}
                updatePending={updateMutation.isPending}
                queryPending={query.isPending}
                queryError={Boolean(query.error)}
                bulkErrorMessage={bulkMutation.isError ? (bulkMutation.error instanceof Error ? bulkMutation.error.message : 'Bulk action failed.') : undefined}
                totalColumns={canWrite ? 8 : 7}
            />

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

            <ManagePostsSavedViewDialog
                open={saveViewOpen && canManagePrivateViews}
                mode={saveViewMode}
                name={saveViewName}
                scope={saveViewScope}
                canManageSharedViews={canManageSharedViews}
                pending={createViewMutation.isPending || updateViewMutation.isPending}
                onClose={() => setSaveViewOpen(false)}
                onNameChange={setSaveViewName}
                onScopeChange={setSaveViewScope}
                onSubmit={() => {
                    if (saveViewName.trim().length < 2) {
                        notifyError('Name required', 'Enter at least 2 characters for view name.');
                        return;
                    }
                    if (saveViewMode === 'update') {
                        updateViewMutation.mutate();
                        return;
                    }
                    createViewMutation.mutate();
                }}
            />
        </OpsCard>
    );
}
