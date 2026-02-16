import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAdminAuth } from '../../app/useAdminAuth';
import { AdminStepUpCard } from '../../components/AdminStepUpCard';
import { approveAdminApproval, getAdminApprovals, rejectAdminApproval } from '../../lib/api/client';
import type { AdminApprovalItem } from '../../types';

export function ApprovalsModule() {
    const queryClient = useQueryClient();
    const { hasValidStepUp, stepUpToken } = useAdminAuth();
    const [status, setStatus] = useState<'pending' | 'all' | 'approved' | 'rejected' | 'executed' | 'expired'>('pending');

    const query = useQuery({
        queryKey: ['admin-approvals', status],
        queryFn: () => getAdminApprovals(status),
    });

    const approveMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!hasValidStepUp || !stepUpToken) throw new Error('Step-up verification is required.');
            const note = window.prompt('Approval note (optional):') || undefined;
            return approveAdminApproval(id, note, stepUpToken);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-approvals'] });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!hasValidStepUp || !stepUpToken) throw new Error('Step-up verification is required.');
            const reason = window.prompt('Rejection reason (required by policy):') || '';
            return rejectAdminApproval(id, reason || undefined, stepUpToken);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-approvals'] });
        },
    });

    const rows = query.data ?? [];

    return (
        <>
            <AdminStepUpCard />
            <div className="admin-card">
                <h2>Approvals</h2>
                <p className="admin-muted">Pending approval queue with dual-control visibility.</p>
                <div style={{ marginBottom: 10, maxWidth: 280 }}>
                    <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value as 'pending' | 'all' | 'approved' | 'rejected' | 'executed' | 'expired')}
                    >
                        <option value="pending">Pending</option>
                        <option value="all">All</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="executed">Executed</option>
                        <option value="expired">Expired</option>
                    </select>
                </div>
                {query.isPending ? <div>Loading approvals...</div> : null}
                {query.error ? <div style={{ color: '#b91c1c' }}>Failed to load approvals.</div> : null}
                {rows.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Action</th>
                                    <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                                    <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Requested By</th>
                                    <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Requested At</th>
                                    <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Decision</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row: AdminApprovalItem, index: number) => (
                                    <tr key={row.id || `${row.action}-${index}`}>
                                        <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                            {String(row.action ?? '-')}
                                        </td>
                                        <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                            {String(row.status ?? 'pending')}
                                        </td>
                                        <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                            {String(row.requestedBy ?? row.requested_by ?? '-')}
                                        </td>
                                        <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                            {row.requestedAt ? new Date(row.requestedAt).toLocaleString() : '-'}
                                        </td>
                                        <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                            {row.status === 'pending' && row.id ? (
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button
                                                        type="button"
                                                        className="admin-btn"
                                                        disabled={approveMutation.isPending || !hasValidStepUp}
                                                        onClick={() => approveMutation.mutate(row.id as string)}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="admin-btn"
                                                        disabled={rejectMutation.isPending || !hasValidStepUp}
                                                        onClick={() => rejectMutation.mutate(row.id as string)}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="admin-muted">N/A</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : null}
                {!query.isPending && !query.error && rows.length === 0 ? <div className="admin-muted">No approvals found.</div> : null}
                {approveMutation.isError ? (
                    <div style={{ color: '#b91c1c', marginTop: 10 }}>
                        {approveMutation.error instanceof Error ? approveMutation.error.message : 'Failed to approve request.'}
                    </div>
                ) : null}
                {rejectMutation.isError ? (
                    <div style={{ color: '#b91c1c', marginTop: 10 }}>
                        {rejectMutation.error instanceof Error ? rejectMutation.error.message : 'Failed to reject request.'}
                    </div>
                ) : null}
            </div>
        </>
    );
}
