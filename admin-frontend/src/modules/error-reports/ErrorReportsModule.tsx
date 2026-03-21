import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { useAdminAuth } from '../../app/useAdminAuth';
import { OpsBadge, OpsCard, OpsEmptyState, OpsErrorState, OpsTable, OpsToolbar } from '../../components/ops';
import { useAdminNotifications } from '../../components/ops/legacy-port';
import { ModuleScaffold, RowActionMenu } from '../../components/workspace';
import { getErrorReports, getAdminOpsWorkspace, updateErrorReport } from '../../lib/api/client';
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

    const usesWorkspaceFeed = status === 'all' && !search.trim();

    const workspaceQuery = useQuery({
        queryKey: ['admin-ops-workspace'],
        queryFn: () => getAdminOpsWorkspace(),
    });

    const query = useQuery({
        queryKey: ['error-reports', status, search],
        queryFn: () => getErrorReports({
            status,
            limit: 50,
        }),
        enabled: !usesWorkspaceFeed,
    });

    const invalidateOpsQueries = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['error-reports'] }),
            queryClient.invalidateQueries({ queryKey: ['admin-ops-workspace'] }),
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard-v3'] }),
        ]);
    };

    const updateMutation = useMutation({
        mutationFn: ({ id, nextStatus, assigneeEmail, adminNote }: { id: string; nextStatus: 'new' | 'triaged' | 'resolved'; assigneeEmail?: string; adminNote?: string }) => updateErrorReport(id, {
            status: nextStatus,
            assigneeEmail,
            adminNote: adminNote ?? `Updated via admin vNext at ${new Date().toISOString()}`,
        }),
        onSuccess: async () => {
            await invalidateOpsQueries();
        },
    });

    const baseRows = useMemo(
        () => (usesWorkspaceFeed ? workspaceQuery.data?.errorReports ?? [] : query.data ?? []),
        [query.data, usesWorkspaceFeed, workspaceQuery.data]
    );
    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();
        if (!needle) return baseRows;
        return baseRows.filter((row) => {
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
    }, [baseRows, search]);
    const summary = workspaceQuery.data?.summary;
    const statusSummary = useMemo(() => {
        if (summary && usesWorkspaceFeed) {
            return {
                new: Math.max(summary.unresolvedErrors - summary.triagedErrors, 0),
                triaged: summary.triagedErrors,
                resolved: 0,
            };
        }
        return rows.reduce(
            (acc, row) => {
                if (row.status === 'resolved') acc.resolved += 1;
                else if (row.status === 'triaged') acc.triaged += 1;
                else acc.new += 1;
                return acc;
            },
            { new: 0, triaged: 0, resolved: 0 }
        );
    }, [rows, summary, usesWorkspaceFeed]);
    const activeReport = useMemo(
        () => rows.find((row) => row.id === activeReportId) ?? null,
        [activeReportId, rows]
    );
    const showPrimaryLoading = usesWorkspaceFeed ? workspaceQuery.isPending : query.isPending;
    const showPrimaryError = usesWorkspaceFeed ? workspaceQuery.error : query.error;

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
        <ModuleScaffold
            eyebrow="Monitoring"
            title="Error Reports"
            description="Triage client error reports with incident ownership, release context, and direct escalation links."
            metrics={[
                { key: 'errors-new', label: 'New', value: statusSummary.new, tone: statusSummary.new > 0 ? 'warning' : 'neutral' },
                { key: 'errors-triaged', label: 'Triaged', value: statusSummary.triaged, tone: statusSummary.triaged > 0 ? 'info' : 'neutral' },
                { key: 'errors-resolved', label: 'Resolved', value: statusSummary.resolved, tone: statusSummary.resolved > 0 ? 'success' : 'neutral' },
                { key: 'errors-unresolved', label: 'Unresolved', value: summary?.unresolvedErrors ?? (statusSummary.new + statusSummary.triaged), tone: (summary?.unresolvedErrors ?? (statusSummary.new + statusSummary.triaged)) > 0 ? 'warning' : 'neutral' },
            ]}
        >
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
                            <button type="button" className="admin-btn small" onClick={() => void Promise.all([workspaceQuery.refetch(), usesWorkspaceFeed ? Promise.resolve() : query.refetch()])}>
                                Refresh
                            </button>
                        </>
                    }
                />

                {showPrimaryLoading ? <div className="admin-alert info">Loading error reports...</div> : null}
                {showPrimaryError ? <OpsErrorState message="Failed to load error reports." /> : null}
                {!showPrimaryError && query.error && usesWorkspaceFeed ? (
                    <div className="admin-alert warning">Direct report filters are temporarily unavailable. The shared site-ops snapshot is still loaded.</div>
                ) : null}
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
                                    <RowActionMenu
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
                                                id: 'investigate',
                                                label: activeReportId === row.id ? 'Hide Detail' : 'Investigate',
                                                onClick: () => setActiveReportId((current) => current === row.id ? null : row.id),
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
                                {activeReport.release ? <span>Release: {activeReport.release}</span> : null}
                            </div>
                            <div className="ops-inline-muted">{activeReport.message}</div>
                            {activeReport.stack ? <pre className="ops-code-block">{activeReport.stack}</pre> : null}
                            {activeReport.componentStack ? <pre className="ops-code-block">{activeReport.componentStack}</pre> : null}
                            <textarea
                                className="ops-textarea"
                                value={adminNoteDraft}
                                onChange={(event) => setAdminNoteDraft(event.target.value)}
                                placeholder="Capture reproduction steps, rollback notes, or ownership context"
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
                            </div>
                        </div>
                    </OpsCard>
                ) : null}

                {!showPrimaryLoading && !showPrimaryError && rows.length === 0 ? (
                    <OpsEmptyState message="No error reports found for the current view." />
                ) : null}
            </div>
        </ModuleScaffold>
    );
}
