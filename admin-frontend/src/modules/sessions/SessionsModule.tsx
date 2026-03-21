import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { useAdminAuth } from '../../app/useAdminAuth';
import { useAdminPreferences } from '../../app/useAdminPreferences';
import { AdminStepUpCard } from '../../components/AdminStepUpCard';
import { OpsBadge, OpsEmptyState, OpsErrorState, OpsTable } from '../../components/ops';
import { ModuleScaffold } from '../../components/workspace';
import { useAdminNotifications, useConfirmDialog } from '../../components/ops/legacy-port';
import { getAdminOpsWorkspace, terminateAdminSessionById, terminateOtherAdminSessions } from '../../lib/api/client';
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
    const [searchParams] = useSearchParams();
    const [search, setSearch] = useState('');
    const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

    const workspaceQuery = useQuery({
        queryKey: ['admin-ops-workspace'],
        queryFn: () => getAdminOpsWorkspace(),
    });

    const invalidateOpsQueries = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['admin-sessions'] }),
            queryClient.invalidateQueries({ queryKey: ['admin-ops-workspace'] }),
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard-v3'] }),
        ]);
    };

    const terminateMutation = useMutation({
        mutationFn: async (sessionId: string) => {
            if (!hasValidStepUp || !stepUpToken) {
                throw new Error('Step-up verification is required before terminating sessions.');
            }
            return terminateAdminSessionById(sessionId, stepUpToken);
        },
        onSuccess: async () => {
            await invalidateOpsQueries();
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
            await invalidateOpsQueries();
        },
    });

    const rows = useMemo(() => workspaceQuery.data?.sessions ?? [], [workspaceQuery.data]);
    const summary = workspaceQuery.data?.summary;
    const focusSessionId = searchParams.get('sessionId') || searchParams.get('focus');

    useEffect(() => {
        const nextSearch = searchParams.get('search')
            || searchParams.get('ip')
            || searchParams.get('email')
            || '';
        const nextRisk = searchParams.get('risk');
        setSearch(nextSearch);
        if (nextRisk === 'low' || nextRisk === 'medium' || nextRisk === 'high' || nextRisk === 'all') {
            setRiskFilter(nextRisk);
        } else {
            setRiskFilter('all');
        }
    }, [searchParams]);

    const filteredRows = useMemo(() => {
        return rows.filter((row: AdminSession) => {
            if (riskFilter !== 'all' && row.riskScore !== riskFilter) return false;
            if (!search.trim()) return true;
            const target = `${row.id || ''} ${row.email || ''} ${row.device || ''} ${row.browser || ''} ${row.os || ''} ${row.ip || ''} ${(row.actions || []).join(' ')}`.toLowerCase();
            return target.includes(search.trim().toLowerCase());
        });
    }, [riskFilter, rows, search]);

    const riskSummary = useMemo(() => {
        if (summary) {
            return {
                low: Math.max(summary.activeSessions - summary.highRiskSessions - summary.mediumRiskSessions, 0),
                medium: summary.mediumRiskSessions,
                high: summary.highRiskSessions,
            };
        }
        return rows.reduce(
            (acc, row) => {
                if (row.riskScore === 'high') acc.high += 1;
                else if (row.riskScore === 'medium') acc.medium += 1;
                else acc.low += 1;
                return acc;
            },
            { low: 0, medium: 0, high: 0 }
        );
    }, [rows, summary]);

    useEffect(() => {
        void trackAdminTelemetry('admin_module_viewed', { module: 'sessions', count: rows.length });
    }, [rows.length]);

    return (
        <>
            <AdminStepUpCard />
            <ModuleScaffold
                eyebrow="System"
                title="Sessions"
                description="Review active sessions, risk posture, and terminate suspicious logins safely."
                meta={<span>{summary?.activeSessions ?? rows.length} active sessions currently visible in this workspace.</span>}
                metrics={[
                    { key: 'sessions-low', label: 'Low Risk', value: riskSummary.low, tone: riskSummary.low > 0 ? 'success' : 'neutral' },
                    { key: 'sessions-medium', label: 'Medium Risk', value: riskSummary.medium, tone: riskSummary.medium > 0 ? 'warning' : 'neutral' },
                    { key: 'sessions-high', label: 'High Risk', value: riskSummary.high, tone: riskSummary.high > 0 ? 'danger' : 'neutral' },
                    { key: 'session-ips', label: 'Unique IPs', value: summary?.uniqueSessionIps ?? new Set(rows.map((row) => row.ip)).size },
                ]}
                filters={{
                    controls: (
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
                    ),
                    actions: (
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
                                            const removedCount = result.removed ?? result.terminatedCount ?? 0;
                                            notifySuccess('Sessions terminated', `Removed ${removedCount} session(s).`);
                                            void trackAdminTelemetry('admin_session_action', {
                                                action: 'terminate_others',
                                                removed: removedCount,
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
                            <button type="button" className="admin-btn subtle small" onClick={() => void workspaceQuery.refetch()}>
                                Refresh
                            </button>
                        </>
                    ),
                }}
            >
                <div className="ops-stack">
                    {!hasValidStepUp ? (
                        <div className="admin-alert info">Step-up verification is required before terminating sessions.</div>
                    ) : null}

                    {workspaceQuery.isPending ? <div className="admin-alert info">Loading sessions...</div> : null}
                    {workspaceQuery.error ? <OpsErrorState message="Failed to load sessions." /> : null}
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
                                <tr key={row.id} className={focusSessionId && row.id === focusSessionId ? 'ops-row-highlight' : undefined}>
                                    <td>
                                        <strong>{row.device}</strong>
                                        <div className="ops-inline-muted">
                                            {row.browser} | {row.os} {row.email ? `| ${row.email}` : ''}
                                        </div>
                                        <div className="ops-inline-muted">Session: <code>{row.id}</code></div>
                                        {row.actions?.length ? (
                                            <div className="ops-inline-muted">Recent actions: {row.actions.join(', ')}</div>
                                        ) : null}
                                    </td>
                                    <td><code title={row.ip}>{row.ip ? row.ip.replace(/(\d+\.\d+)\.\d+\.\d+/, '$1.xxx.xxx') : '-'}</code></td>
                                    <td>
                                        <div>{formatDateTime(row.lastActivity)}</div>
                                        <div className="ops-inline-muted">Login: {formatDateTime(row.loginTime)}</div>
                                    </td>
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

                    {!workspaceQuery.isPending && !workspaceQuery.error && filteredRows.length === 0 ? (
                        <OpsEmptyState message={rows.length === 0 ? 'No active sessions found.' : 'No sessions match current filters.'} />
                    ) : null}

                    {rows.length > 0 && filteredRows.length !== rows.length ? (
                        <div className="ops-inline-muted">
                            Showing {filteredRows.length} of {rows.length} sessions.
                        </div>
                    ) : null}

                    {terminateOthersMutation.isSuccess ? (
                        <div className="ops-inline-muted">
                            Last bulk action removed {terminateOthersMutation.data?.removed ?? terminateOthersMutation.data?.terminatedCount ?? 0} session(s).
                        </div>
                    ) : null}
                </div>
            </ModuleScaffold>
        </>
    );
}
