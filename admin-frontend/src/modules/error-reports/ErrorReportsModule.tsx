import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAdminPreferences } from '../../app/useAdminPreferences';
import { OpsBadge, OpsCard, OpsEmptyState, OpsErrorState, OpsTable } from '../../components/ops';
import { ActionOverflowMenu, useAdminNotifications } from '../../components/ops/legacy-port';
import { getErrorReports, updateErrorReport } from '../../lib/api/client';
import { trackAdminTelemetry } from '../../lib/adminTelemetry';
import type { AdminErrorReport } from '../../types';

const statusTone = (status: 'new' | 'triaged' | 'resolved'): 'warning' | 'info' | 'success' => {
    if (status === 'resolved') return 'success';
    if (status === 'triaged') return 'info';
    return 'warning';
};

export function ErrorReportsModule() {
    const { formatDateTime } = useAdminPreferences();
    const { notifyError, notifyInfo, notifySuccess } = useAdminNotifications();
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<'all' | 'new' | 'triaged' | 'resolved'>('all');
    const [search, setSearch] = useState('');

    const query = useQuery({
        queryKey: ['error-reports', status, search],
        queryFn: () => getErrorReports({
            status,
            errorId: search || undefined,
            limit: 50,
        }),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, nextStatus }: { id: string; nextStatus: 'new' | 'triaged' | 'resolved' }) => updateErrorReport(id, {
            status: nextStatus,
            adminNote: `Updated via admin vNext at ${new Date().toISOString()}`,
        }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['error-reports'] });
        },
    });

    const rows = useMemo(() => query.data ?? [], [query.data]);
    const statusSummary = useMemo(() => {
        return rows.reduce(
            (acc, row) => {
                if (row.status === 'resolved') acc.resolved += 1;
                else if (row.status === 'triaged') acc.triaged += 1;
                else acc.new += 1;
                return acc;
            },
            { new: 0, triaged: 0, resolved: 0 }
        );
    }, [rows]);

    useEffect(() => {
        void trackAdminTelemetry('admin_module_viewed', { module: 'error_reports', count: rows.length });
    }, [rows.length]);

    const updateStatus = (row: AdminErrorReport, nextStatus: 'new' | 'triaged' | 'resolved') => {
        updateMutation.mutate(
            { id: row.id, nextStatus },
            {
                onSuccess: () => {
                    notifySuccess('Report updated', `Status set to ${nextStatus}.`);
                    void trackAdminTelemetry('admin_triage_action', {
                        module: 'error_reports',
                        action: 'status_update',
                        current: row.status,
                        next: nextStatus,
                    });
                },
                onError: (error) => {
                    notifyError('Update failed', error instanceof Error ? error.message : 'Failed to update report.');
                },
            }
        );
    };

    return (
        <OpsCard title="Error Reports" description="Triage client error reports with fast state transitions and operator notes.">
            <div className="ops-stack">
                <div className="ops-form-grid">
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by error ID"
                    />
                    <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value as 'all' | 'new' | 'triaged' | 'resolved')}
                    >
                        <option value="all">All statuses</option>
                        <option value="new">New</option>
                        <option value="triaged">Triaged</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>

                <div className="ops-kpi-grid">
                    <div className="ops-kpi-card">
                        <div className="ops-kpi-label">New</div>
                        <div className="ops-kpi-value">{statusSummary.new}</div>
                    </div>
                    <div className="ops-kpi-card">
                        <div className="ops-kpi-label">Triaged</div>
                        <div className="ops-kpi-value">{statusSummary.triaged}</div>
                    </div>
                    <div className="ops-kpi-card">
                        <div className="ops-kpi-label">Resolved</div>
                        <div className="ops-kpi-value">{statusSummary.resolved}</div>
                    </div>
                </div>

                {query.isPending ? <div className="admin-alert info">Loading error reports...</div> : null}
                {query.error ? <OpsErrorState message="Failed to load error reports." /> : null}
                {updateMutation.isError ? (
                    <OpsErrorState message={updateMutation.error instanceof Error ? updateMutation.error.message : 'Failed to update report.'} />
                ) : null}

                {rows.length > 0 ? (
                    <OpsTable
                        columns={[
                            { key: 'id', label: 'Error ID' },
                            { key: 'message', label: 'Message' },
                            { key: 'status', label: 'Status' },
                            { key: 'created', label: 'Created' },
                            { key: 'action', label: 'Action' },
                        ]}
                    >
                        {rows.map((row: AdminErrorReport) => (
                            <tr key={row.id}>
                                <td><code>{row.errorId}</code></td>
                                <td>
                                    <strong>{row.message}</strong>
                                    <div className="ops-inline-muted">{row.pageUrl || '-'}</div>
                                </td>
                                <td><OpsBadge tone={statusTone(row.status)}>{row.status}</OpsBadge></td>
                                <td>{formatDateTime(row.createdAt)}</td>
                                <td>
                                    <ActionOverflowMenu
                                        itemLabel={row.errorId}
                                        actions={[
                                            {
                                                id: 'mark-triaged',
                                                label: 'Mark Triaged',
                                                disabled: updateMutation.isPending || row.status === 'triaged',
                                                onClick: () => updateStatus(row, 'triaged'),
                                            },
                                            {
                                                id: 'mark-resolved',
                                                label: 'Mark Resolved',
                                                disabled: updateMutation.isPending || row.status === 'resolved',
                                                onClick: () => updateStatus(row, 'resolved'),
                                            },
                                            {
                                                id: 'mark-new',
                                                label: 'Move Back To New',
                                                disabled: updateMutation.isPending || row.status === 'new',
                                                onClick: () => updateStatus(row, 'new'),
                                            },
                                            {
                                                id: 'copy-error-id',
                                                label: 'Copy Error ID',
                                                onClick: async () => {
                                                    try {
                                                        await navigator.clipboard.writeText(row.errorId);
                                                        notifySuccess('Copied', `Error ID copied: ${row.errorId}`);
                                                    } catch {
                                                        notifyError('Copy failed', 'Could not copy error ID.');
                                                    }
                                                },
                                            },
                                            {
                                                id: 'triage-tip',
                                                label: 'Show Triage Tip',
                                                onClick: () => {
                                                    notifyInfo('Triage Tip', 'Triage first, then resolve after reproducibility check.');
                                                },
                                            },
                                        ]}
                                    />
                                </td>
                            </tr>
                        ))}
                    </OpsTable>
                ) : null}

                {!query.isPending && !query.error && rows.length === 0 ? <OpsEmptyState message="No reports found." /> : null}
            </div>
        </OpsCard>
    );
}
