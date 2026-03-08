import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { useAdminAuth } from '../../app/useAdminAuth';
import { OpsBadge, OpsCard, OpsEmptyState, OpsErrorState, OpsTable, OpsToolbar } from '../../components/ops';
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
    const { user } = useAdminAuth();
    const queryClient = useQueryClient();
    const { notifyError, notifyInfo, notifySuccess } = useAdminNotifications();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<'all' | 'new' | 'triaged' | 'resolved'>((searchParams.get('status') as 'all' | 'new' | 'triaged' | 'resolved') || 'all');
    const [search, setSearch] = useState(searchParams.get('q') || '');
    const [activeReportId, setActiveReportId] = useState<string | null>(null);
    const [adminNoteDraft, setAdminNoteDraft] = useState('');

    const query = useQuery({
        queryKey: ['error-reports', status, search],
        queryFn: () => getErrorReports({
            status,
            limit: 50,
        }),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, nextStatus, assigneeEmail, adminNote }: { id: string; nextStatus: 'new' | 'triaged' | 'resolved'; assigneeEmail?: string; adminNote?: string }) => updateErrorReport(id, {
            status: nextStatus,
            assigneeEmail,
            adminNote: adminNote ?? `Updated via admin vNext at ${new Date().toISOString()}`,
        }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['error-reports'] });
        },
    });

    const rows = useMemo(() => {
        const loaded = query.data ?? [];
        const needle = search.trim().toLowerCase();
        if (!needle) return loaded;
        return loaded.filter((row) => {
            const haystack = [
                row.errorId,
                row.message,
                row.pageUrl,
                row.requestId,
                row.release,
                row.userEmail,
                row.assigneeEmail,
                row.note,
                row.adminNote,
                row.stack,
                row.componentStack,
            ]
                .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
                .join(' ')
                .toLowerCase();
            return haystack.includes(needle);
        });
    }, [query.data, search]);
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
    const activeReport = useMemo(
        () => rows.find((row) => row.id === activeReportId) ?? null,
        [activeReportId, rows]
    );

    useEffect(() => {
        if (!activeReport) {
            setAdminNoteDraft('');
            return;
        }
        setAdminNoteDraft(activeReport.adminNote || '');
    }, [activeReport]);

    useEffect(() => {
        void trackAdminTelemetry('admin_module_viewed', { module: 'error_reports', count: rows.length });
    }, [rows.length]);

    const updateStatus = (
        row: AdminErrorReport,
        nextStatus: 'new' | 'triaged' | 'resolved',
        assigneeEmail?: string,
        adminNote?: string,
        successMessage?: string,
        telemetryAction: 'status_update' | 'note_update' = 'status_update',
    ) => {
        updateMutation.mutate(
            { id: row.id, nextStatus, assigneeEmail, adminNote },
            {
                onSuccess: () => {
                    notifySuccess('Report updated', successMessage ?? `Status set to ${nextStatus}.`);
                    void trackAdminTelemetry('admin_triage_action', {
                        module: 'error_reports',
                        action: telemetryAction,
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
        <OpsCard title="Error Reports" description="Triage client error reports with incident ownership, release context, and direct escalation links.">
            <div className="ops-stack">
                <OpsToolbar
                    compact
                    controls={
                        <>
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
                        </>
                    }
                    actions={
                        <>
                            <span className="ops-inline-muted">{rows.length} reports loaded</span>
                            <button
                                type="button"
                                className="admin-btn subtle small"
                                onClick={() => {
                                    setSearch('');
                                    setStatus('all');
                                    notifyInfo('Filters cleared', 'Showing all error reports.');
                                }}
                            >
                                Clear
                            </button>
                            <button type="button" className="admin-btn small" onClick={() => void query.refetch()}>
                                Refresh
                            </button>
                        </>
                    }
                />

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
                            { key: 'context', label: 'Context' },
                            { key: 'status', label: 'Status' },
                            { key: 'action', label: 'Action' },
                        ]}
                    >
                        {rows.map((row: AdminErrorReport) => (
                            <tr key={row.id}>
                                <td><code>{row.errorId}</code></td>
                                <td>
                                    <strong>{row.message}</strong>
                                    <div className="ops-inline-muted">{row.pageUrl || '-'}</div>
                                    {row.userEmail ? <div className="ops-inline-muted">User: {row.userEmail}</div> : null}
                                </td>
                                <td>
                                    <div>Release: {row.release || '-'}</div>
                                    <div className="ops-inline-muted">Request: {row.requestId || '-'}</div>
                                    <div className="ops-inline-muted">Assignee: {row.assigneeEmail || 'Unassigned'}</div>
                                    {row.note ? <div className="ops-inline-muted">Client note: {row.note}</div> : null}
                                    {row.adminNote ? <div className="ops-inline-muted">Admin note: {row.adminNote}</div> : null}
                                </td>
                                <td><OpsBadge tone={statusTone(row.status)}>{row.status}</OpsBadge></td>
                                <td>
                                    <ActionOverflowMenu
                                        itemLabel={row.errorId}
                                        actions={[
                                            {
                                                id: 'assign-me',
                                                label: 'Assign to Me',
                                                disabled: updateMutation.isPending,
                                                onClick: () => updateStatus(row, row.status === 'new' ? 'triaged' : row.status, user?.email),
                                            },
                                            {
                                                id: 'mark-triaged',
                                                label: 'Mark Triaged',
                                                disabled: updateMutation.isPending || row.status === 'triaged',
                                                onClick: () => updateStatus(row, 'triaged', row.assigneeEmail || user?.email),
                                            },
                                            {
                                                id: 'mark-resolved',
                                                label: 'Mark Resolved',
                                                disabled: updateMutation.isPending || row.status === 'resolved',
                                                onClick: () => updateStatus(row, 'resolved', row.assigneeEmail || user?.email),
                                            },
                                            {
                                                id: 'mark-new',
                                                label: 'Move Back To New',
                                                disabled: updateMutation.isPending || row.status === 'new',
                                                onClick: () => updateStatus(row, 'new', row.assigneeEmail),
                                            },
                                            {
                                                id: 'investigate',
                                                label: 'Investigate',
                                                disabled: updateMutation.isPending,
                                                onClick: () => setActiveReportId(row.id),
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
                                                id: 'copy-request-id',
                                                label: 'Copy Request ID',
                                                disabled: !row.requestId,
                                                onClick: async () => {
                                                    if (!row.requestId) return;
                                                    try {
                                                        await navigator.clipboard.writeText(row.requestId);
                                                        notifySuccess('Copied', `Request ID copied: ${row.requestId}`);
                                                    } catch {
                                                        notifyError('Copy failed', 'Could not copy request ID.');
                                                    }
                                                },
                                            },
                                            {
                                                id: 'open-affected-page',
                                                label: 'Open Affected Page',
                                                disabled: !row.pageUrl,
                                                onClick: () => {
                                                    if (!row.pageUrl) return;
                                                    window.open(row.pageUrl, '_blank', 'noopener,noreferrer');
                                                },
                                            },
                                            {
                                                id: 'open-sentry',
                                                label: 'Open Sentry Event',
                                                disabled: !row.sentryEventUrl,
                                                onClick: () => {
                                                    if (!row.sentryEventUrl) return;
                                                    window.open(row.sentryEventUrl, '_blank', 'noopener,noreferrer');
                                                },
                                            },
                                        ]}
                                    />
                                </td>
                            </tr>
                        ))}
                    </OpsTable>
                ) : null}

                {activeReport ? (
                    <OpsCard title={`Report Detail: ${activeReport.errorId}`} tone="muted">
                        <div className="ops-stack">
                            <div className="ops-meta-row">
                                <OpsBadge tone={statusTone(activeReport.status)}>{activeReport.status}</OpsBadge>
                                <span>{activeReport.assigneeEmail || 'Unassigned'}</span>
                                {activeReport.release ? <span>{activeReport.release}</span> : null}
                            </div>
                            <div className="ops-inline-muted">{activeReport.pageUrl || '-'}</div>
                            {activeReport.userAgent ? <div className="ops-inline-muted">{activeReport.userAgent}</div> : null}
                            {activeReport.stack ? <pre className="ops-code-block">{activeReport.stack}</pre> : null}
                            {activeReport.componentStack ? <pre className="ops-code-block">{activeReport.componentStack}</pre> : null}
                            <textarea
                                className="ops-textarea"
                                value={adminNoteDraft}
                                onChange={(event) => setAdminNoteDraft(event.target.value)}
                                placeholder="Capture reproduction steps, scope, or fix status"
                            />
                            <div className="ops-actions">
                                <button
                                    type="button"
                                    className="admin-btn primary"
                                    disabled={updateMutation.isPending}
                                    onClick={() => updateStatus(
                                        activeReport,
                                        activeReport.status,
                                        activeReport.assigneeEmail || user?.email,
                                        adminNoteDraft.trim(),
                                        'Admin note saved.',
                                        'note_update',
                                    )}
                                >
                                    Save Admin Note
                                </button>
                                <button
                                    type="button"
                                    className="admin-btn subtle"
                                    disabled={!activeReport.pageUrl}
                                    onClick={() => {
                                        if (!activeReport.pageUrl) return;
                                        window.open(activeReport.pageUrl, '_blank', 'noopener,noreferrer');
                                    }}
                                >
                                    Open Affected Page
                                </button>
                            </div>
                        </div>
                    </OpsCard>
                ) : null}

                {!query.isPending && !query.error && rows.length === 0 ? <OpsEmptyState message="No reports found. Client-side errors will appear here automatically as users hit issues on the public site." /> : null}
            </div>
        </OpsCard>
    );
}
