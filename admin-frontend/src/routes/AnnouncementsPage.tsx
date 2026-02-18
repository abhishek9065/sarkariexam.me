import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAdminPreferences } from '../app/useAdminPreferences';
import { OpsBadge, OpsCard, OpsEmptyState, OpsErrorState, OpsTable } from '../components/ops';
import { ActionOverflowMenu, TableToolbar, useAdminNotifications } from '../components/ops/legacy-port';
import { getAdminAnnouncements, updateAdminAnnouncement } from '../lib/api/client';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { trackAdminTelemetry } from '../lib/adminTelemetry';
import type {
    AdminAnnouncementFilterPreset,
    AdminAnnouncementListItem,
    AnnouncementSortOption,
    AnnouncementStatusFilter,
    AnnouncementTypeFilter,
} from '../types';

const STATUS_KEY = 'admin-vnext-announcements-status';
const TYPE_KEY = 'admin-vnext-announcements-type';
const SEARCH_KEY = 'admin-vnext-announcements-search';
const LIMIT_KEY = 'admin-vnext-announcements-limit';
const SORT_KEY = 'admin-vnext-announcements-sort';
const PRESETS_KEY = 'admin-vnext-announcements-presets';
const PRESET_SELECTED_KEY = 'admin-vnext-announcements-preset-selected';

const statusTone = (status?: string) => {
    if (status === 'published') return 'success';
    if (status === 'pending' || status === 'scheduled') return 'warning';
    if (status === 'archived') return 'danger';
    return 'neutral';
};

const sortAnnouncements = (items: AdminAnnouncementListItem[], sort: AnnouncementSortOption) => {
    const next = [...items];
    next.sort((a, b) => {
        const aUpdated = new Date(a.updatedAt || a.publishedAt || 0).getTime();
        const bUpdated = new Date(b.updatedAt || b.publishedAt || 0).getTime();

        if (sort === 'oldest') return aUpdated - bUpdated;
        if (sort === 'newest' || sort === 'updated') return bUpdated - aUpdated;
        if (sort === 'deadline') {
            const aDeadline = new Date((a as Record<string, string>).deadline || 0).getTime();
            const bDeadline = new Date((b as Record<string, string>).deadline || 0).getTime();
            return aDeadline - bDeadline;
        }
        if (sort === 'views') {
            const aViews = Number((a as Record<string, unknown>).viewCount || 0);
            const bViews = Number((b as Record<string, unknown>).viewCount || 0);
            return bViews - aViews;
        }
        return 0;
    });
    return next;
};

export function AnnouncementsPage() {
    const { formatDateTime } = useAdminPreferences();
    const { notifySuccess, notifyError, notifyInfo } = useAdminNotifications();
    const queryClient = useQueryClient();

    const [status, setStatus] = useLocalStorageState<AnnouncementStatusFilter | 'all'>(STATUS_KEY, 'all');
    const [type, setType] = useLocalStorageState<AnnouncementTypeFilter | 'all'>(TYPE_KEY, 'all');
    const [search, setSearch] = useLocalStorageState<string>(SEARCH_KEY, '');
    const [limit] = useLocalStorageState<number>(LIMIT_KEY, 50, (raw) => {
        const parsed = Number(raw.replace(/"/g, ''));
        if (Number.isFinite(parsed) && parsed > 0 && parsed <= 200) return parsed;
        return 50;
    });
    const [sortOption, setSortOption] = useLocalStorageState<AnnouncementSortOption>(SORT_KEY, 'newest');
    const [presets, setPresets] = useLocalStorageState<AdminAnnouncementFilterPreset[]>(PRESETS_KEY, []);
    const [selectedPresetId, setSelectedPresetId] = useLocalStorageState<string>(PRESET_SELECTED_KEY, '');

    const query = useQuery({
        queryKey: ['admin-announcements', status, type, search, limit, sortOption],
        queryFn: () => getAdminAnnouncements({ limit: Math.max(limit, 120), offset: 0, status, type, search, sort: sortOption }),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => updateAdminAnnouncement(id, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
        },
    });

    const rows = useMemo(() => {
        if (!Array.isArray(query.data)) return [];
        return sortAnnouncements(query.data, sortOption).slice(0, limit);
    }, [query.data, sortOption, limit]);

    useEffect(() => {
        if (!query.isPending && !query.isError) {
            void trackAdminTelemetry('admin_list_loaded', {
                module: 'announcements',
                count: rows.length,
                status,
                type,
                sort: sortOption,
            });
        }
    }, [query.isError, query.isPending, rows.length, sortOption, status, type]);

    useEffect(() => {
        void trackAdminTelemetry('admin_filter_applied', {
            module: 'announcements',
            status,
            type,
            sort: sortOption,
            hasQuery: Boolean(search.trim()),
        });
    }, [search, sortOption, status, type]);

    const applyPreset = (presetId: string) => {
        setSelectedPresetId(presetId);
        if (!presetId) return;
        const preset = presets.find((item) => item.id === presetId);
        if (!preset) return;
        setSearch(preset.query);
        setType(preset.type);
        setStatus(preset.status);
        setSortOption(preset.sort);
        notifyInfo('Preset applied', `Applied preset: ${preset.label}`);
    };

    const savePreset = () => {
        const label = `Preset ${new Date().toLocaleString()}`;
        const preset: AdminAnnouncementFilterPreset = {
            id: crypto.randomUUID(),
            label,
            query: search,
            type,
            status,
            sort: sortOption,
        };
        const next = [preset, ...presets].slice(0, 12);
        setPresets(next);
        setSelectedPresetId(preset.id);
        notifySuccess('Preset saved', `${label} saved for announcements filters.`);
    };

    const clearFilters = () => {
        setSearch('');
        setType('all');
        setStatus('all');
        setSortOption('newest');
        setSelectedPresetId('');
    };

    const filterSummary = `${rows.length} shown | status=${status} | type=${type} | sort=${sortOption}`;

    return (
        <OpsCard title="Announcements" description="Parity list module with persisted filters and row actions for moderation rounds.">
            <TableToolbar
                searchQuery={search}
                onSearchChange={setSearch}
                typeFilter={type}
                onTypeFilterChange={setType}
                statusFilter={status}
                onStatusFilterChange={setStatus}
                sortOption={sortOption}
                onSortChange={setSortOption}
                quickChips={[
                    { id: 'pending', label: 'Pending only', active: status === 'pending', onClick: () => setStatus('pending') },
                    { id: 'scheduled', label: 'Scheduled', active: status === 'scheduled', onClick: () => setStatus('scheduled') },
                    { id: 'published', label: 'Published', active: status === 'published', onClick: () => setStatus('published') },
                ]}
                presets={presets}
                selectedPresetId={selectedPresetId}
                onSelectPreset={applyPreset}
                onSavePreset={savePreset}
                filterSummary={filterSummary}
                onClearFilters={clearFilters}
            />

            {query.isPending ? <div className="admin-alert info">Loading announcements...</div> : null}
            {query.error ? <OpsErrorState message="Failed to load announcements list." /> : null}

            {rows.length > 0 ? (
                <OpsTable
                    columns={[
                        { key: 'title', label: 'Title' },
                        { key: 'status', label: 'Status' },
                        { key: 'type', label: 'Type' },
                        { key: 'updated', label: 'Updated' },
                        { key: 'actions', label: 'Actions' },
                    ]}
                >
                    {rows.map((item: AdminAnnouncementListItem) => {
                        const id = item.id || item._id || '';
                        return (
                            <tr key={id || item.slug || item.title}>
                                <td>
                                    <strong>{item.title || 'Untitled'}</strong>
                                    {id ? <div className="ops-inline-muted">ID: <code>{id}</code></div> : null}
                                </td>
                                <td>
                                    <OpsBadge tone={statusTone(item.status) as 'neutral' | 'success' | 'warning' | 'danger'}>
                                        {item.status || '-'}
                                    </OpsBadge>
                                </td>
                                <td>{item.type || '-'}</td>
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

            {!query.isPending && !query.error && rows.length === 0 ? (
                <OpsEmptyState message="No announcements found for current filters." />
            ) : null}
        </OpsCard>
    );
}
