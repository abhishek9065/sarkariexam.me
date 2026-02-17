import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAdminAuth } from '../../app/useAdminAuth';
import { AdminStepUpCard } from '../../components/AdminStepUpCard';
import { OpsCard, OpsEmptyState, OpsErrorState, OpsTable } from '../../components/ops';
import { getAdminSessions, terminateAdminSessionById } from '../../lib/api/client';
import type { AdminSession } from '../../types';

export function SessionsModule() {
    const { hasValidStepUp, stepUpToken } = useAdminAuth();
    const queryClient = useQueryClient();
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
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
        },
    });

    const rows = query.data ?? [];

    return (
        <>
            <AdminStepUpCard />
            <OpsCard title="Sessions" description="View active sessions and terminate suspicious devices.">
                {query.isPending ? <div className="admin-alert info">Loading sessions...</div> : null}
                {query.error ? <OpsErrorState message="Failed to load sessions." /> : null}
                {terminateMutation.isError ? (
                    <OpsErrorState message={terminateMutation.error instanceof Error ? terminateMutation.error.message : 'Failed to terminate session.'} />
                ) : null}

                {rows.length > 0 ? (
                    <OpsTable
                        columns={[
                            { key: 'device', label: 'Device' },
                            { key: 'ip', label: 'IP' },
                            { key: 'activity', label: 'Last Activity' },
                            { key: 'risk', label: 'Risk' },
                            { key: 'action', label: 'Action' },
                        ]}
                    >
                        {rows.map((row: AdminSession) => (
                            <tr key={row.id}>
                                <td><strong>{row.device}</strong> <span className="ops-inline-muted">({row.browser})</span></td>
                                <td>{row.ip}</td>
                                <td>{new Date(row.lastActivity).toLocaleString()}</td>
                                <td>{row.riskScore}</td>
                                <td>
                                    {row.isCurrentSession ? (
                                        <span className="ops-inline-muted">Current session</span>
                                    ) : (
                                        <button
                                            type="button"
                                            className="admin-btn"
                                            disabled={terminateMutation.isPending || !hasValidStepUp}
                                            onClick={() => terminateMutation.mutate(row.id)}
                                        >
                                            Terminate
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </OpsTable>
                ) : null}

                {!query.isPending && !query.error && rows.length === 0 ? <OpsEmptyState message="No active sessions found." /> : null}
            </OpsCard>
        </>
    );
}
