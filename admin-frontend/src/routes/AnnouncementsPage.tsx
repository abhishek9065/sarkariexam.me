import { useEffect, useMemo, useState } from 'react';
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
    runBulkUpdate,
    updateAdminAnnouncement,
} from '../lib/api/client';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { trackAdminTelemetry } from '../lib/adminTelemetry';
import type {
    AdminAnnouncementFilterPreset,
    AdminAnnouncementListItem,
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

const LIMIT_OPTIONS = [20, 40, 60, 100];

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

export function AnnouncementsPage() {
    const { formatDateTime } = useAdminPreferences();
    const { stepUpToken, hasValidStepUp } = useAdminAuth();
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

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [saveViewOpen, setSaveViewOpen] = useState(false);
    const [saveViewName, setSaveViewName] = useState('');
    const [saveViewScope, setSaveViewScope] = useState<'private' | 'shared'>('private');

    const focusId = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const value = params.get('focus');
        return value?.trim() || '';
    }, [location.search]);

    const query = useQuery({
        queryKey: ['admin-announcements', status, type, search, limit, offset, sortOption, dateStart, dateEnd, author],
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
            await queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
        },
    });

    const createDraftMutation = useMutation({
        mutationFn: (input: { type?: AnnouncementTypeFilter; title?: string; category?: string; organization?: string }) => createAnnouncementDraft(input),
        onSuccess: async (draft) => {
            await queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
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
            await queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
            setSelectedIds([]);
        },
    });

    const saveViewMutation = useMutation({
        mutationFn: () => createAdminSavedView({
            name: saveViewName.trim(),
            module: 'manage-posts',
            scope: saveViewScope,
            filters: {
                search,
                status,
                type,
                limit,
                dateStart,
                dateEnd,
                author,
            },
            sort: { option: sortOption },
            columns: ['title', 'status', 'type', 'updatedAt'],
            isDefault: false,
        }),
        onSuccess: async (view) => {
            await queryClient.invalidateQueries({ queryKey: ['admin-saved-views'] });
            setSelectedViewId(view.id);
            setSaveViewOpen(false);
            setSaveViewName('');
            notifySuccess('Saved view created', view.name);
        },
        onError: (error) => {
            notifyError('Failed to save view', error instanceof Error ? error.message : 'Unable to save current filters.');
        },
    });

    const deleteViewMutation = useMutation({
        mutationFn: (id: string) => deleteAdminSavedView(id),
        onSuccess: async (result) => {
            await queryClient.invalidateQueries({ queryKey: ['admin-saved-views'] });
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
            });
        }
    }, [limit, offset, query.isError, query.isPending, rows.length, sortOption, status, total, type]);

    useEffect(() => {
        void trackAdminTelemetry('admin_filter_applied', {
            module: 'announcements',
            status,
            type,
            sort: sortOption,
            hasQuery: Boolean(search.trim()),
        });
    }, [search, sortOption, status, type]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const inTypingContext =
                event.target instanceof HTMLInputElement
                || event.target instanceof HTMLTextAreaElement
                || event.target instanceof HTMLSelectElement
                || (event.target instanceof HTMLElement && event.target.isContentEditable);

            if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'n' && !inTypingContext) {
                event.preventDefault();
                navigate('/create-post');
                return;
            }

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                setSaveViewOpen(true);
                if (!saveViewName.trim()) {
                    const viewLabel = `View ${new Date().toLocaleString()}`;
                    setSaveViewName(viewLabel);
                }
                return;
            }

            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                if (selectedIds.length === 0) {
                    notifyInfo('No selection', 'Select at least one row for bulk submit.');
                    return;
                }
                if (!hasValidStepUp || !stepUpToken) {
                    notifyError('Step-up required', 'All bulk actions require active step-up verification.');
                    return;
                }
                const token = stepUpToken ?? '';
                bulkMutation.mutate({ ids: selectedIds, payload: { status: 'pending' }, token }, {
                    onSuccess: () => notifySuccess('Submitted', `${selectedIds.length} item(s) moved to pending review.`),
                    onError: (error) => notifyError('Bulk submit failed', error instanceof Error ? error.message : 'Bulk submit failed.'),
                });
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [bulkMutation, hasValidStepUp, navigate, notifyError, notifyInfo, notifySuccess, saveViewName, selectedIds, stepUpToken]);

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
        setOffset(0);
        setSelectedViewId('');
    };

    const runBulkAction = async (action: 'submit-review' | 'publish' | 'mark-expired' | 'pin-home') => {
        if (selectedIds.length === 0) {
            notifyInfo('No rows selected', 'Select rows before running bulk actions.');
            return;
        }

        const payloadByAction: Record<typeof action, Record<string, unknown>> = {
            'submit-review': { status: 'pending' },
            publish: { status: 'published' },
            'mark-expired': { status: 'archived' },
            'pin-home': { home: { section: 'important', highlight: true, stickyRank: 1 } },
        };

        if (!hasValidStepUp || !stepUpToken) {
            notifyError('Step-up required', 'All bulk actions require active step-up verification.');
            return;
        }

        const token = stepUpToken ?? '';
        bulkMutation.mutate({ ids: selectedIds, payload: payloadByAction[action], token }, {
            onSuccess: () => {
                notifySuccess('Bulk action complete', `${action.replace('-', ' ')} applied to ${selectedIds.length} item(s).`);
                void trackAdminTelemetry('admin_bulk_action', { action, count: selectedIds.length });
            },
            onError: (error) => notifyError('Bulk action failed', error instanceof Error ? error.message : 'Bulk operation failed.'),
        });
    };

    const filterSummary = `${rows.length} shown on page ${page}/${totalPages} | total=${total} | selected=${selectedIds.length} | status=${status} | type=${type} | sort=${sortOption}`;

    const allVisibleSelected = rows.length > 0 && rows.every((row) => {
        const id = row.id || row._id || '';
        return id ? selectedIds.includes(id) : false;
    });

    return (
        <OpsCard title="All Posts" description="High-volume data table with server pagination, saved views, shortcuts, and policy-aware bulk operations.">
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
                        id: 'view-pending',
                        label: 'Pending',
                        active: status === 'pending',
                        onClick: () => {
                            setStatus('pending');
                            setOffset(0);
                        },
                    },
                    {
                        id: 'view-scheduled',
                        label: 'Scheduled',
                        active: status === 'scheduled',
                        onClick: () => {
                            setStatus('scheduled');
                            setOffset(0);
                        },
                    },
                    {
                        id: 'view-published',
                        label: 'Published',
                        active: status === 'published',
                        onClick: () => {
                            setStatus('published');
                            setOffset(0);
                        },
                    },
                ]}
                presets={presets}
                selectedPresetId={selectedViewId}
                dateStart={dateStart}
                onDateStartChange={(v) => { setDateStart(v); setOffset(0); }}
                dateEnd={dateEnd}
                onDateEndChange={(v) => { setDateEnd(v); setOffset(0); }}
                authorFilter={author}
                onAuthorFilterChange={(v) => { setAuthor(v); setOffset(0); }}
                onSelectPreset={applyPreset}
                onSavePreset={() => {
                    if (!saveViewName.trim()) {
                        setSaveViewName(`View ${new Date().toLocaleString()}`);
                    }
                    setSaveViewOpen(true);
                }}
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
                <button type="button" className="admin-btn small" onClick={() => runBulkAction('submit-review')} disabled={selectedIds.length === 0 || bulkMutation.isPending || !hasValidStepUp}>
                    Submit for review
                </button>
                <button type="button" className="admin-btn small" onClick={() => runBulkAction('publish')} disabled={selectedIds.length === 0 || bulkMutation.isPending || !hasValidStepUp}>
                    Publish (step-up)
                </button>
                <button type="button" className="admin-btn small subtle" onClick={() => runBulkAction('mark-expired')} disabled={selectedIds.length === 0 || bulkMutation.isPending || !hasValidStepUp}>
                    Mark expired
                </button>
                <button type="button" className="admin-btn small subtle" onClick={() => runBulkAction('pin-home')} disabled={selectedIds.length === 0 || bulkMutation.isPending || !hasValidStepUp}>
                    Pin to homepage
                </button>
                {selectedView ? (
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
                <OpsTable
                    columns={[
                        { key: 'select', label: 'Select' },
                        { key: 'title', label: 'Title' },
                        { key: 'status', label: 'Status' },
                        { key: 'type', label: 'Type' },
                        { key: 'updated', label: 'Updated' },
                        { key: 'actions', label: 'Actions' },
                    ]}
                >
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
                        <td colSpan={5} className="ops-inline-muted">
                            Select all rows on this page
                        </td>
                    </tr>
                    {rows.map((item: AdminAnnouncementListItem) => {
                        const id = item.id || item._id || '';
                        const isSelected = selectedIds.includes(id);
                        const isFocused = Boolean(focusId) && focusId === id;
                        return (
                            <tr key={id || item.slug || item.title} className={isFocused ? 'ops-row-highlight' : ''}>
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
                                <td>{formatDateTime(item.updatedAt || item.publishedAt)}</td>
                                <td>
                                    <ActionOverflowMenu
                                        itemLabel={item.title || id || 'announcement'}
                                        actions={[
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
                                        ]}
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

            {saveViewOpen ? (
                <div className="ops-modal-overlay" role="presentation" onClick={() => setSaveViewOpen(false)}>
                    <div className="ops-modal" role="dialog" aria-modal="true" aria-label="Save list view" onClick={(event) => event.stopPropagation()}>
                        <h3>Save Current View</h3>
                        <p className="ops-inline-muted">Store current filters, sorting and page size as a reusable view.</p>
                        <div className="ops-form-grid two">
                            <input
                                value={saveViewName}
                                onChange={(event) => setSaveViewName(event.target.value)}
                                placeholder="View name"
                                minLength={2}
                                maxLength={120}
                            />
                            <select
                                value={saveViewScope}
                                onChange={(event) => setSaveViewScope(event.target.value as 'private' | 'shared')}
                            >
                                <option value="private">Private (only me)</option>
                                <option value="shared">Shared (admins)</option>
                            </select>
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
