import type { Dispatch, SetStateAction } from 'react';

import { OpsEmptyState, OpsErrorState, OpsTable } from '../../components/ops';
import { RowActionMenu } from '../../components/workspace';
import { trackAdminTelemetry } from '../../lib/adminTelemetry';
import type { AdminAnnouncementListItem } from '../../types';

type ManagePostsTableProps = {
    rows: AdminAnnouncementListItem[];
    canWrite: boolean;
    focusId: string;
    formatDateTime: (value?: string | null) => string;
    selectedIds: string[];
    setSelectedIds: Dispatch<SetStateAction<string[]>>;
    onNavigateDetailed: (id: string) => void;
    onDuplicate: (item: AdminAnnouncementListItem) => void;
    onUpdateStatus: (id: string, status: 'draft' | 'pending') => void;
    notifySuccess: (title: string, message?: string) => void;
    notifyError: (title: string, message?: string) => void;
    createDraftPending: boolean;
    updatePending: boolean;
    queryPending: boolean;
    queryError: boolean;
    bulkErrorMessage?: string;
    totalColumns: number;
};

const statusChipClass = (status?: string) => {
    if (status === 'published') return 'published';
    if (status === 'pending') return 'review';
    if (status === 'scheduled') return 'scheduled';
    if (status === 'archived') return 'expired';
    return 'draft';
};

export function ManagePostsTable({
    rows,
    canWrite,
    focusId,
    formatDateTime,
    selectedIds,
    setSelectedIds,
    onNavigateDetailed,
    onDuplicate,
    onUpdateStatus,
    notifySuccess,
    notifyError,
    createDraftPending,
    updatePending,
    queryPending,
    queryError,
    bulkErrorMessage,
    totalColumns,
}: ManagePostsTableProps) {
    const allVisibleSelected = canWrite && rows.length > 0 && rows.every((row) => {
        const id = row.id || row._id || '';
        return id ? selectedIds.includes(id) : false;
    });

    if (queryPending) {
        return <div className="admin-alert info">Loading announcements...</div>;
    }
    if (queryError) {
        return <OpsErrorState message="Failed to load announcements list." />;
    }
    if (bulkErrorMessage) {
        return <OpsErrorState message={bulkErrorMessage} />;
    }
    if (rows.length === 0) {
        return <OpsEmptyState message="No announcements found for current filters." />;
    }

    return (
        <OpsTable columns={[
            ...(canWrite ? [{ key: 'select', label: 'Select' }] : []),
            { key: 'title', label: 'Title' },
            { key: 'status', label: 'Status' },
            { key: 'type', label: 'Type' },
            { key: 'owner', label: 'Owner' },
            { key: 'sla', label: 'Review SLA' },
            { key: 'updated', label: 'Updated' },
            { key: 'actions', label: 'Actions' },
        ]}>
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
                    <td colSpan={totalColumns - 1} className="ops-inline-muted">
                        Select all rows on this page
                    </td>
                </tr>
            ) : null}
            {rows.map((item) => {
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
                                onNavigateDetailed(id);
                                void trackAdminTelemetry('admin_row_action_clicked', { action: 'open_detailed', id });
                            },
                        },
                        {
                            id: 'duplicate',
                            label: 'Duplicate',
                            disabled: !id || createDraftPending,
                            onClick: () => {
                                if (!id) return;
                                onDuplicate(item);
                            },
                        },
                        {
                            id: 'mark-draft',
                            label: 'Mark Draft',
                            disabled: !id || updatePending,
                            onClick: () => {
                                if (!id) return;
                                onUpdateStatus(id, 'draft');
                            },
                        },
                        {
                            id: 'mark-pending',
                            label: 'Mark Pending',
                            disabled: !id || updatePending,
                            onClick: () => {
                                if (!id) return;
                                onUpdateStatus(id, 'pending');
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
                            <RowActionMenu
                                itemLabel={item.title || id || 'announcement'}
                                actions={rowActions}
                            />
                        </td>
                    </tr>
                );
            })}
        </OpsTable>
    );
}
