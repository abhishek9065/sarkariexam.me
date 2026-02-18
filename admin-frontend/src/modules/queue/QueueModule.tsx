import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAdminPreferences } from '../../app/useAdminPreferences';
import { OpsBadge, OpsCard, OpsEmptyState, OpsErrorState, OpsTable, OpsToolbar } from '../../components/ops';
import { ActionOverflowMenu, useAdminNotifications } from '../../components/ops/legacy-port';
import { getAdminAnnouncements } from '../../lib/api/client';
import type { AdminAnnouncementListItem } from '../../types';

const queueStatusTone = (status?: string) => {
    if (status === 'scheduled') return 'info';
    if (status === 'pending') return 'warning';
    if (status === 'published') return 'success';
    return 'neutral';
};

export function QueueModule() {
    const { formatDateTime } = useAdminPreferences();
    const { notifyError, notifyInfo, notifySuccess } = useAdminNotifications();
    const [view, setView] = useState<'pending' | 'scheduled' | 'combined'>('combined');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<'updated' | 'title'>('updated');

    const pendingQuery = useQuery({
        queryKey: ['admin-queue', 'pending'],
        queryFn: () => getAdminAnnouncements({ status: 'pending', limit: 40, sort: 'newest' }),
    });

    const scheduledQuery = useQuery({
        queryKey: ['admin-queue', 'scheduled'],
        queryFn: () => getAdminAnnouncements({ status: 'scheduled', limit: 40, sort: 'newest' }),
    });

    const rows = useMemo(() => {
        const pendingRows = pendingQuery.data ?? [];
        const scheduledRows = scheduledQuery.data ?? [];
        const merged = view === 'pending'
            ? pendingRows
            : view === 'scheduled'
                ? scheduledRows
                : [...pendingRows, ...scheduledRows];

        const normalizedSearch = search.trim().toLowerCase();
        const filtered = normalizedSearch
            ? merged.filter((row) => {
                const haystack = `${row.title ?? ''} ${row.type ?? ''} ${row.updatedBy ?? ''} ${row.id ?? row._id ?? ''}`.toLowerCase();
                return haystack.includes(normalizedSearch);
            })
            : merged;

        const sorted = [...filtered];
        if (sort === 'title') {
            sorted.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
        } else {
            sorted.sort((a, b) => {
                const aTs = new Date(a.updatedAt || a.publishedAt || 0).getTime();
                const bTs = new Date(b.updatedAt || b.publishedAt || 0).getTime();
                return bTs - aTs;
            });
        }

        return sorted;
    }, [pendingQuery.data, scheduledQuery.data, search, sort, view]);

    const loading = pendingQuery.isPending || scheduledQuery.isPending;
    const hasError = pendingQuery.error || scheduledQuery.error;
    const filterSummary = `${rows.length} rows | view=${view} | sort=${sort}`;

    return (
        <OpsCard title="Queue" description="Pending and scheduled content queue with ownership/state visibility.">
            <div className="ops-stack">
                <OpsToolbar
                    controls={
                        <>
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search queue by title, owner, type, or ID"
                            />
                            <select
                                value={view}
                                onChange={(event) => setView(event.target.value as 'pending' | 'scheduled' | 'combined')}
                            >
                                <option value="combined">Combined Queue</option>
                                <option value="pending">Pending Queue</option>
                                <option value="scheduled">Scheduled Queue</option>
                            </select>
                            <select value={sort} onChange={(event) => setSort(event.target.value as 'updated' | 'title')}>
                                <option value="updated">Sort: Recently Updated</option>
                                <option value="title">Sort: Title A-Z</option>
                            </select>
                        </>
                    }
                    actions={
                        <>
                            <span className="ops-inline-muted">{filterSummary}</span>
                            <button
                                type="button"
                                className="admin-btn small subtle"
                                onClick={() => {
                                    setSearch('');
                                    setSort('updated');
                                    setView('combined');
                                    notifyInfo('Queue filters reset', 'Showing combined queue with default sorting.');
                                }}
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                className="admin-btn small"
                                onClick={() => {
                                    void pendingQuery.refetch();
                                    void scheduledQuery.refetch();
                                }}
                            >
                                Refresh
                            </button>
                        </>
                    }
                />

                <div className="ops-count-grid">
                    <div className="ops-kpi-card">
                        <div className="ops-kpi-label">Pending queue</div>
                        <div className="ops-kpi-value">{pendingQuery.data?.length ?? 0}</div>
                    </div>
                    <div className="ops-kpi-card">
                        <div className="ops-kpi-label">Scheduled queue</div>
                        <div className="ops-kpi-value">{scheduledQuery.data?.length ?? 0}</div>
                    </div>
                    <div className="ops-kpi-card">
                        <div className="ops-kpi-label">Combined view</div>
                        <div className="ops-kpi-value">{rows.length}</div>
                    </div>
                </div>

                {loading ? <div className="admin-alert info">Loading queue...</div> : null}
                {hasError ? <OpsErrorState message="Failed to load queue." /> : null}
                {rows.length > 0 ? (
                    <OpsTable
                        columns={[
                            { key: 'title', label: 'Title' },
                            { key: 'status', label: 'Status' },
                            { key: 'type', label: 'Type' },
                            { key: 'owner', label: 'Owner' },
                            { key: 'updated', label: 'Updated' },
                            { key: 'actions', label: 'Actions' },
                        ]}
                    >
                        {rows.map((row: AdminAnnouncementListItem) => (
                            <tr key={row.id || row._id || row.slug || row.title || `${row.updatedAt}-${row.type}`}>
                                <td>{row.title || 'Untitled'}</td>
                                <td>
                                    <OpsBadge tone={queueStatusTone(row.status) as 'neutral' | 'info' | 'warning' | 'success'}>
                                        {row.status || '-'}
                                    </OpsBadge>
                                </td>
                                <td>{row.type || '-'}</td>
                                <td>{row.updatedBy || '-'}</td>
                                <td>{formatDateTime(row.updatedAt || row.publishedAt)}</td>
                                <td>
                                    <ActionOverflowMenu
                                        itemLabel={row.title || row.id || row._id || 'queue item'}
                                        actions={[
                                            {
                                                id: 'copy-id',
                                                label: 'Copy ID',
                                                disabled: !row.id && !row._id,
                                                onClick: async () => {
                                                    const id = row.id || row._id || '';
                                                    if (!id) return;
                                                    try {
                                                        await navigator.clipboard.writeText(id);
                                                        notifySuccess('ID copied', `Copied ${id}`);
                                                    } catch {
                                                        notifyError('Copy failed', 'Could not copy queue item ID.');
                                                    }
                                                },
                                            },
                                            {
                                                id: 'copy-title',
                                                label: 'Copy Title',
                                                disabled: !row.title,
                                                onClick: async () => {
                                                    const title = row.title || '';
                                                    if (!title) return;
                                                    try {
                                                        await navigator.clipboard.writeText(title);
                                                        notifySuccess('Title copied', 'Queue title copied to clipboard.');
                                                    } catch {
                                                        notifyError('Copy failed', 'Could not copy queue title.');
                                                    }
                                                },
                                            },
                                        ]}
                                    />
                                </td>
                            </tr>
                        ))}
                    </OpsTable>
                ) : null}
                {!loading && !hasError && rows.length === 0 ? <OpsEmptyState message="Queue is empty for selected view." /> : null}
            </div>
        </OpsCard>
    );
}
