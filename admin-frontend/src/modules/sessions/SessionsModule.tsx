import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getAdminSessions, terminateAdminSessionById } from '../../lib/api/client';
import { useAdminAuth } from '../../app/useAdminAuth';
import { AdminStepUpCard } from '../../components/AdminStepUpCard';
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
            <div className="admin-card">
                <h2>Sessions</h2>
                <p className="admin-muted">View active sessions and terminate suspicious devices.</p>
                {query.isPending ? <div>Loading sessions...</div> : null}
                {query.error ? <div style={{ color: '#b91c1c' }}>Failed to load sessions.</div> : null}
                {terminateMutation.isError ? (
                    <div style={{ color: '#b91c1c' }}>
                        {terminateMutation.error instanceof Error ? terminateMutation.error.message : 'Failed to terminate session.'}
                    </div>
                ) : null}
                {rows.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Device</th>
                                    <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>IP</th>
                                    <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Last Activity</th>
                                    <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Risk</th>
                                    <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row: AdminSession) => (
                                    <tr key={row.id}>
                                        <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                            <strong>{row.device}</strong> <span className="admin-muted">({row.browser})</span>
                                        </td>
                                        <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>{row.ip}</td>
                                        <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                            {new Date(row.lastActivity).toLocaleString()}
                                        </td>
                                        <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>{row.riskScore}</td>
                                        <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                            {row.isCurrentSession ? (
                                                <span className="admin-muted">Current session</span>
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
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </div>
        </>
    );
}
