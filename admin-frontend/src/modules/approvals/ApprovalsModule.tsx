import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAdminAuth } from '../../app/useAdminAuth';
import { AdminStepUpCard } from '../../components/AdminStepUpCard';
import { OpsBadge, OpsCard, OpsEmptyState, OpsErrorState, OpsTable } from '../../components/ops';
import { approveAdminApproval, getAdminApprovals, rejectAdminApproval } from '../../lib/api/client';
import type { AdminApprovalItem } from '../../types';

const statusTone = (status?: string) => {
    if (status === 'approved' || status === 'executed') return 'success';
    if (status === 'rejected' || status === 'expired') return 'danger';
    if (status === 'pending') return 'warning';
    return 'neutral';
};

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
            <OpsCard title="Approvals" description="Pending approval queue with dual-control visibility.">
                <div className="ops-form-grid two">
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
                {query.isPending ? <div className="admin-alert info">Loading approvals...</div> : null}
                {query.error ? <OpsErrorState message="Failed to load approvals." /> : null}

                {rows.length > 0 ? (
                    <OpsTable
                        columns={[
                            { key: 'action', label: 'Action' },
                            { key: 'status', label: 'Status' },
                            { key: 'requester', label: 'Requested By' },
                            { key: 'requestedAt', label: 'Requested At' },
                            { key: 'decision', label: 'Decision' },
                        ]}
                    >
                        {rows.map((row: AdminApprovalItem, index: number) => (
                            <tr key={row.id || `${row.action}-${index}`}>
                                <td>{String(row.action ?? '-')}</td>
                                <td>
                                    <OpsBadge tone={statusTone(String(row.status ?? 'pending')) as 'neutral' | 'success' | 'warning' | 'danger'}>
                                        {String(row.status ?? 'pending')}
                                    </OpsBadge>
                                </td>
                                <td>{String(row.requestedBy ?? row.requested_by ?? '-')}</td>
                                <td>{row.requestedAt ? new Date(row.requestedAt).toLocaleString() : '-'}</td>
                                <td>
                                    {row.status === 'pending' && row.id ? (
                                        <div className="ops-actions">
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
                                                className="admin-btn danger"
                                                disabled={rejectMutation.isPending || !hasValidStepUp}
                                                onClick={() => rejectMutation.mutate(row.id as string)}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="ops-inline-muted">N/A</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </OpsTable>
                ) : null}
                {!query.isPending && !query.error && rows.length === 0 ? <OpsEmptyState message="No approvals found." /> : null}

                {approveMutation.isError ? (
                    <OpsErrorState message={approveMutation.error instanceof Error ? approveMutation.error.message : 'Failed to approve request.'} />
                ) : null}
                {rejectMutation.isError ? (
                    <OpsErrorState message={rejectMutation.error instanceof Error ? rejectMutation.error.message : 'Failed to reject request.'} />
                ) : null}
            </OpsCard>
        </>
    );
}
