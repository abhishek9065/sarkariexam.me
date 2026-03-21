import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { useAdminAuth } from '../../app/useAdminAuth';
import { useAdminPreferences } from '../../app/useAdminPreferences';
import { OpsBadge, OpsEmptyState, OpsErrorState, OpsTable, OpsToolbar } from '../../components/ops';
import { useAdminNotifications } from '../../components/ops/legacy-port';
import { ModuleScaffold, RowActionMenu } from '../../components/workspace';
import { getAdminAnnouncements, updateAnnouncementAssignment, updateAnnouncementReviewSla } from '../../lib/api/client';
import type { AdminAnnouncementListItem } from '../../types';

const queueStatusTone = (status?: string) => {
    if (status === 'scheduled') return 'info';
    if (status === 'pending') return 'warning';
    if (status === 'published') return 'success';
    return 'neutral';
};

const dueTone = (reviewDueAt?: string) => {
    if (!reviewDueAt) return 'neutral';
    return new Date(reviewDueAt).getTime() < Date.now() ? 'danger' : 'warning';
};

export function QueueModule() {
    const queryClient = useQueryClient();
    const { formatDateTime } = useAdminPreferences();
    const { user } = useAdminAuth();
    const { notifyError, notifyInfo, notifySuccess } = useAdminNotifications();
    const [searchParams] = useSearchParams();
    const [view, setView] = useState<'pending' | 'scheduled' | 'combined'>((searchParams.get('status') as 'pending' | 'scheduled') || 'combined');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<'updated' | 'title'>('updated');
    const assigneeFilter = searchParams.get('assignee');

    const pendingQuery = useQuery({
        queryKey: ['admin-queue', 'pending'],
        queryFn: () => getAdminAnnouncements({ status: 'pending', limit: 60, sort: 'newest' }),
    });

    const scheduledQuery = useQuery({
        queryKey: ['admin-queue', 'scheduled'],
        queryFn: () => getAdminAnnouncements({ status: 'scheduled', limit: 60, sort: 'newest' }),
    });

    const assignmentMutation = useMutation({
        mutationFn: ({ id, assigneeUserId, assigneeEmail }: { id: string; assigneeUserId?: string; assigneeEmail?: string }) => (
            updateAnnouncementAssignment(id, { assigneeUserId, assigneeEmail })
        ),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-queue'] });
            notifySuccess('Assignment updated', 'Queue ownership was updated.');
        },
        onError: (error) => {
            notifyError('Assignment failed', error instanceof Error ? error.message : 'Failed to update queue assignment.');
        },
    });

    const slaMutation = useMutation({
        mutationFn: ({ id, reviewDueAt }: { id: string; reviewDueAt?: string }) => updateAnnouncementReviewSla(id, reviewDueAt),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-queue'] });
            notifySuccess('SLA updated', 'Review due date was updated.');
        },
        onError: (error) => {
            notifyError('SLA update failed', error instanceof Error ? error.message : 'Failed to update review SLA.');
        },
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
        const filtered = merged.filter((row) => {
            const haystack = `${row.title ?? ''} ${row.type ?? ''} ${row.updatedBy ?? ''} ${row.assigneeEmail ?? ''} ${row.id ?? row._id ?? ''}`.toLowerCase();
            if (normalizedSearch && !haystack.includes(normalizedSearch)) return false;
            if (assigneeFilter === 'me') {
                return Boolean((user?.id && row.assigneeUserId === user.id) || (user?.email && row.assigneeEmail === user.email));
            }
            if (assigneeFilter === 'unassigned') {
                return !row.assigneeUserId && !row.assigneeEmail;
            }
            return true;
        });

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
    }, [assigneeFilter, pendingQuery.data, scheduledQuery.data, search, sort, user?.email, user?.id, view]);

    const loading = pendingQuery.isPending || scheduledQuery.isPending;
    const hasError = pendingQuery.error || scheduledQuery.error;
    const filterSummary = `${rows.length} rows | view=${view} | sort=${sort}${assigneeFilter ? ` | assignee=${assigneeFilter}` : ''}`;

    const pendingCount = pendingQuery.data?.length ?? 0;
    const scheduledCount = scheduledQuery.data?.length ?? 0;
    const mineCount = rows.filter((row) => row.claimedByCurrentUser).length;

    return (
        <ModuleScaffold
            eyebrow="Review Pipeline"
            title="Queue"
            description="Track pending and scheduled execution with clear ownership, SLA pressure, and fast assignment controls."
            metrics={[
                { key: 'pending', label: 'Pending queue', value: pendingCount, hint: 'Items waiting for review or publish.' },
                { key: 'scheduled', label: 'Scheduled queue', value: scheduledCount, hint: 'Items already time-bound for release.' },
                { key: 'mine', label: 'Assigned to me', value: mineCount, hint: 'Queue work already claimed by this operator.' },
            ]}
            headerActions={(
                <>
                    <button type="button" className="admin-btn subtle" onClick={() => setView('combined')}>
                        Combined queue
                    </button>
                    <button type="button" className="admin-btn primary" onClick={() => void pendingQuery.refetch()}>
                        Refresh queue
                    </button>
                </>
            )}
        >
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

                {loading ? <div className="admin-alert info">Loading queue...</div> : null}
                {hasError ? <OpsErrorState message="Failed to load queue." /> : null}
                {rows.length > 0 ? (
                    <OpsTable
                        columns={[
                            { key: 'title', label: 'Title' },
                            { key: 'status', label: 'Status' },
                            { key: 'type', label: 'Type' },
                            { key: 'owner', label: 'Owner' },
                            { key: 'sla', label: 'Review SLA' },
                            { key: 'updated', label: 'Updated' },
                            { key: 'actions', label: 'Actions' },
                        ]}
                    >
                        {rows.map((row: AdminAnnouncementListItem) => {
                            const id = row.id || row._id || '';
                            const isMine = Boolean((user?.id && row.assigneeUserId === user.id) || (user?.email && row.assigneeEmail === user.email));
                            return (
                                <tr key={row.id || row._id || row.slug || row.title || `${row.updatedAt}-${row.type}`}>
                                    <td>{row.title || 'Untitled'}</td>
                                    <td>
                                        <OpsBadge tone={queueStatusTone(row.status) as 'neutral' | 'info' | 'warning' | 'success'}>
                                            {row.status || '-'}
                                        </OpsBadge>
                                    </td>
                                    <td>{row.type || '-'}</td>
                                    <td>
                                        <div>{row.assigneeEmail || 'Unassigned'}</div>
                                        {row.assignedAt ? <div className="ops-inline-muted">Assigned {formatDateTime(row.assignedAt)}</div> : null}
                                    </td>
                                    <td>
                                        {row.reviewDueAt ? (
                                            <>
                                                <OpsBadge tone={dueTone(row.reviewDueAt) as 'neutral' | 'warning' | 'danger'}>
                                                    {new Date(row.reviewDueAt).getTime() < Date.now() ? 'Overdue' : 'Due'}
                                                </OpsBadge>
                                                <div className="ops-inline-muted">{formatDateTime(row.reviewDueAt)}</div>
                                            </>
                                        ) : (
                                            <span className="ops-inline-muted">No SLA</span>
                                        )}
                                    </td>
                                    <td>{formatDateTime(row.updatedAt || row.publishedAt)}</td>
                                    <td>
                                        <RowActionMenu
                                            itemLabel={row.title || row.id || row._id || 'queue item'}
                                            actions={[
                                                {
                                                    id: 'claim',
                                                    label: isMine ? 'Refresh My Claim' : 'Claim',
                                                    disabled: !id || assignmentMutation.isPending,
                                                    onClick: () => {
                                                        if (!id) return;
                                                        assignmentMutation.mutate({ id, assigneeUserId: user?.id, assigneeEmail: user?.email });
                                                    },
                                                },
                                                {
                                                    id: 'unclaim',
                                                    label: 'Unassign',
                                                    disabled: !id || assignmentMutation.isPending || (!row.assigneeUserId && !row.assigneeEmail),
                                                    onClick: () => {
                                                        if (!id) return;
                                                        assignmentMutation.mutate({ id, assigneeUserId: '', assigneeEmail: '' });
                                                    },
                                                },
                                                {
                                                    id: 'due-tomorrow',
                                                    label: 'Set Due +24h',
                                                    disabled: !id || slaMutation.isPending,
                                                    onClick: () => {
                                                        if (!id) return;
                                                        const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                                                        slaMutation.mutate({ id, reviewDueAt: dueAt });
                                                    },
                                                },
                                                {
                                                    id: 'clear-due',
                                                    label: 'Clear SLA',
                                                    disabled: !id || slaMutation.isPending || !row.reviewDueAt,
                                                    onClick: () => {
                                                        if (!id) return;
                                                        slaMutation.mutate({ id, reviewDueAt: '' });
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
                {!loading && !hasError && rows.length === 0 ? <OpsEmptyState message="Queue is empty for selected view." /> : null}
            </div>
        </ModuleScaffold>
    );
}
