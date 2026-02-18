import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAdminAuth } from '../../app/useAdminAuth';
import { useAdminPreferences } from '../../app/useAdminPreferences';
import { AdminStepUpCard } from '../../components/AdminStepUpCard';
import { OpsBadge, OpsCard, OpsEmptyState, OpsErrorState, OpsTable, OpsToolbar } from '../../components/ops';
import { useAdminNotifications, useConfirmDialog } from '../../components/ops/legacy-port';
import { getAdminSessions, terminateAdminSessionById, terminateOtherAdminSessions } from '../../lib/api/client';
import { trackAdminTelemetry } from '../../lib/adminTelemetry';
import type { AdminSession } from '../../types';

const riskTone = (risk: string): 'success' | 'warning' | 'danger' => {
    if (risk === 'high') return 'danger';
    if (risk === 'medium') return 'warning';
    return 'success';
};

export function SessionsModule() {
    const { hasValidStepUp, stepUpToken } = useAdminAuth();
    const { formatDateTime } = useAdminPreferences();
    const { notifyError, notifySuccess } = useAdminNotifications();
    const { confirm } = useConfirmDialog();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

    const query = useQuery({
        queryKey: ['admin-sessions'],
        queryFn: () => getAdminSessions(),
    });

    const terminateMutation = useMutation({
        mutationFn: async (sessionId: string) => {
            if (!hasValidStepUp || !stepUpToken) {
                throw new Error('Step-up verification is required before terminating sessions.');
            }
            return terminateAdminSessionById(sessionId, stepUpToken);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
        },
    });

    const terminateOthersMutation = useMutation({
        mutationFn: async () => {
            if (!hasValidStepUp || !stepUpToken) {
                throw new Error('Step-up verification is required before terminating sessions.');
            }
            return terminateOtherAdminSessions(stepUpToken);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
        },
    });

    const rows = useMemo(() => query.data ?? [], [query.data]);
    const filteredRows = useMemo(() => {
        return rows.filter((row: AdminSession) => {
            if (riskFilter !== 'all' && row.riskScore !== riskFilter) return false;
            if (!search.trim()) return true;
            const target = `${row.email || ''} ${row.device || ''} ${row.browser || ''} ${row.ip || ''}`.toLowerCase();
            return target.includes(search.trim().toLowerCase());
        });
    }, [riskFilter, rows, search]);

    const riskSummary = useMemo(() => {
        return rows.reduce(
            (acc, row) => {
                if (row.riskScore === 'high') acc.high += 1;
                else if (row.riskScore === 'medium') acc.medium += 1;
                else acc.low += 1;
                return acc;
            },
            { low: 0, medium: 0, high: 0 }
        );
    }, [rows]);

    useEffect(() => {
        void trackAdminTelemetry('admin_module_viewed', { module: 'sessions', count: rows.length });
    }, [rows.length]);

    return (
        <>
            <AdminStepUpCard />
            <OpsCard title="Sessions" description="Review active sessions, risk posture, and terminate suspicious logins safely.">
                <div className="ops-stack">
                    <OpsToolbar
                        controls={
                            <>
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search by email, device, browser, or IP"
                                />
                                <select
                                    value={riskFilter}
                                    onChange={(event) => setRiskFilter(event.target.value as 'all' | 'low' | 'medium' | 'high')}
                                >
                                    <option value="all">All risk levels</option>
                                    <option value="high">High risk</option>
                                    <option value="medium">Medium risk</option>
                                    <option value="low">Low risk</option>
                                </select>
                                <span className="ops-inline-muted">
                                    {filteredRows.length} of {rows.length} sessions
                                </span>
                            </>
                        }
                        actions={
                            <>
                                {!hasValidStepUp ? <span className="ops-inline-muted">Step-up required for session termination</span> : null}
                                <button
                                    type="button"
                                    className="admin-btn danger small"
                                    disabled={terminateOthersMutation.isPending || !hasValidStepUp}
                                    onClick={async () => {
                                        const allowed = await confirm({
                                            title: 'Terminate all other sessions?',
                                            message: 'This will sign out every other active session for your account.',
                                            confirmText: 'Terminate Others',
                                            cancelText: 'Cancel',
                                            variant: 'warning',
                                        });
                                        if (!allowed) return;
                                        terminateOthersMutation.mutate(undefined, {
                                            onSuccess: (result) => {
                                                notifySuccess('Sessions terminated', `Removed ${result.removed ?? 0} session(s).`);
                                                void trackAdminTelemetry('admin_session_action', {
                                                    action: 'terminate_others',
                                                    removed: result.removed ?? 0,
                                                });
                                            },
                                            onError: (error) => {
                                                notifyError('Terminate failed', error instanceof Error ? error.message : 'Failed to terminate sessions.');
                                            },
                                        });
                                    }}
                                >
                                    Terminate Others
                                </button>
                                <button type="button" className="admin-btn subtle small" onClick={() => void query.refetch()}>
                                    Refresh
                                </button>
                            </>
                        }
                    />

                    <div className="ops-kpi-grid">
                        <div className="ops-kpi-card">
                            <div className="ops-kpi-label">Low Risk</div>
                            <div className="ops-kpi-value">{riskSummary.low}</div>
                        </div>
                        <div className="ops-kpi-card">
                            <div className="ops-kpi-label">Medium Risk</div>
                            <div className="ops-kpi-value">{riskSummary.medium}</div>
                        </div>
                        <div className="ops-kpi-card">
                            <div className="ops-kpi-label">High Risk</div>
                            <div className="ops-kpi-value">{riskSummary.high}</div>
                        </div>
                    </div>

                    {query.isPending ? <div className="admin-alert info">Loading sessions...</div> : null}
                    {query.error ? <OpsErrorState message="Failed to load sessions." /> : null}
                    {terminateMutation.isError ? (
                        <OpsErrorState message={terminateMutation.error instanceof Error ? terminateMutation.error.message : 'Failed to terminate session.'} />
                    ) : null}
                    {terminateOthersMutation.isError ? (
                        <OpsErrorState message={terminateOthersMutation.error instanceof Error ? terminateOthersMutation.error.message : 'Failed to terminate sessions.'} />
                    ) : null}

                    {filteredRows.length > 0 ? (
                        <OpsTable
                            columns={[
                                { key: 'device', label: 'Device' },
                                { key: 'ip', label: 'IP' },
                                { key: 'activity', label: 'Last Activity' },
                                { key: 'risk', label: 'Risk' },
                                { key: 'action', label: 'Action' },
                            ]}
                        >
                            {filteredRows.map((row: AdminSession) => (
                                <tr key={row.id}>
                                    <td>
                                        <strong>{row.device}</strong>
                                        <div className="ops-inline-muted">
                                            {row.browser} | {row.os} {row.email ? `| ${row.email}` : ''}
                                        </div>
                                    </td>
                                    <td><code>{row.ip}</code></td>
                                    <td>{formatDateTime(row.lastActivity)}</td>
                                    <td><OpsBadge tone={riskTone(row.riskScore)}>{row.riskScore}</OpsBadge></td>
                                    <td>
                                        {row.isCurrentSession ? (
                                            <span className="ops-inline-muted">Current session</span>
                                        ) : (
                                            <button
                                                type="button"
                                                className="admin-btn"
                                                disabled={terminateMutation.isPending || !hasValidStepUp}
                                                onClick={async () => {
                                                    const allowed = await confirm({
                                                        title: 'Terminate selected session?',
                                                        message: 'This device will be signed out immediately.',
                                                        confirmText: 'Terminate Session',
                                                        cancelText: 'Cancel',
                                                        variant: 'warning',
                                                    });
                                                    if (!allowed) return;
                                                    terminateMutation.mutate(row.id, {
                                                        onSuccess: () => {
                                                            notifySuccess('Session terminated', `Device ${row.device} was signed out.`);
                                                            void trackAdminTelemetry('admin_session_action', {
                                                                action: 'terminate_single',
                                                                sessionId: row.id,
                                                                risk: row.riskScore,
                                                            });
                                                        },
                                                        onError: (error) => {
                                                            notifyError('Terminate failed', error instanceof Error ? error.message : 'Failed to terminate session.');
                                                        },
                                                    });
                                                }}
                                            >
                                                Terminate
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </OpsTable>
                    ) : null}

                    {!query.isPending && !query.error && filteredRows.length === 0 ? (
                        <OpsEmptyState message={rows.length === 0 ? 'No active sessions found.' : 'No sessions match current filters.'} />
                    ) : null}

                    {!hasValidStepUp ? (
                        <div className="admin-alert info">Step-up verification is required before terminating sessions.</div>
                    ) : null}

                    {rows.length > 0 && filteredRows.length !== rows.length ? (
                        <div className="ops-inline-muted">
                            Showing {filteredRows.length} of {rows.length} sessions.
                        </div>
                    ) : null}

                    {terminateOthersMutation.isSuccess ? (
                        <div className="ops-inline-muted">
                            Last bulk action removed {terminateOthersMutation.data?.removed ?? 0} session(s).
                        </div>
                    ) : null}
                </div>
            </OpsCard>
        </>
    );
}
