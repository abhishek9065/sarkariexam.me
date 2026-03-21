import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useAdminAuth } from '../../app/useAdminAuth';
import { useAdminPreferences } from '../../app/useAdminPreferences';
import { AdminStepUpCard } from '../../components/AdminStepUpCard';
import { OpsBadge, OpsEmptyState, OpsErrorState, OpsTable, OpsToolbar } from '../../components/ops';
import { useAdminNotifications } from '../../components/ops/legacy-port';
import { ModuleScaffold } from '../../components/workspace';
import { approveAdminApproval, getAdminApprovals, getAdminReviewWorkspace, rejectAdminApproval } from '../../lib/api/client';
import { trackAdminTelemetry } from '../../lib/adminTelemetry';
import type { AdminApprovalItem } from '../../types';

type DecisionMode = 'approve' | 'reject';

interface DecisionModalState {
    id: string;
    mode: DecisionMode;
    actionLabel: string;
    note: string;
}

const statusTone = (status?: string) => {
    if (status === 'approved' || status === 'executed') return 'success';
    if (status === 'rejected' || status === 'expired') return 'danger';
    if (status === 'pending') return 'warning';
    return 'neutral';
};

export function ApprovalsModule() {
    const queryClient = useQueryClient();
    const { hasValidStepUp, stepUpToken } = useAdminAuth();
    const { formatDateTime } = useAdminPreferences();
    const { notifyError, notifySuccess } = useAdminNotifications();

    const [status, setStatus] = useState<'pending' | 'all' | 'approved' | 'rejected' | 'executed' | 'expired'>('pending');
    const [modal, setModal] = useState<DecisionModalState | null>(null);
    const decisionNoteRef = useRef<HTMLTextAreaElement | null>(null);

    const workspaceQuery = useQuery({
        queryKey: ['admin-review-workspace'],
        queryFn: () => getAdminReviewWorkspace(),
    });

    const query = useQuery({
        queryKey: ['admin-approvals', status],
        queryFn: () => getAdminApprovals(status),
        enabled: status !== 'pending',
    });

    const approveMutation = useMutation({
        mutationFn: async ({ id, note }: { id: string; note?: string }) => {
            if (!hasValidStepUp || !stepUpToken) throw new Error('Step-up verification is required.');
            return approveAdminApproval(id, note, stepUpToken);
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['admin-approvals'] }),
                queryClient.invalidateQueries({ queryKey: ['admin-review-workspace'] }),
                queryClient.invalidateQueries({ queryKey: ['admin-dashboard-v3'] }),
            ]);
            notifySuccess('Approval completed', 'Approval request has been approved.');
            void trackAdminTelemetry('admin_review_decision_submitted', {
                module: 'approvals',
                action: 'approve',
            });
            setModal(null);
        },
    });

    const rejectMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
            if (!hasValidStepUp || !stepUpToken) throw new Error('Step-up verification is required.');
            return rejectAdminApproval(id, reason, stepUpToken);
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['admin-approvals'] }),
                queryClient.invalidateQueries({ queryKey: ['admin-review-workspace'] }),
                queryClient.invalidateQueries({ queryKey: ['admin-dashboard-v3'] }),
            ]);
            notifySuccess('Rejection completed', 'Approval request has been rejected.');
            void trackAdminTelemetry('admin_review_decision_submitted', {
                module: 'approvals',
                action: 'reject',
            });
            setModal(null);
        },
    });

    const rows = status === 'pending'
        ? (workspaceQuery.data?.approvals ?? [])
        : (query.data ?? []);

    const activeMutationError = useMemo(() => {
        if (approveMutation.isError) {
            return approveMutation.error instanceof Error ? approveMutation.error.message : 'Failed to approve request.';
        }
        if (rejectMutation.isError) {
            return rejectMutation.error instanceof Error ? rejectMutation.error.message : 'Failed to reject request.';
        }
        return null;
    }, [approveMutation.error, approveMutation.isError, rejectMutation.error, rejectMutation.isError]);

    const showPrimaryLoading = status === 'pending' ? workspaceQuery.isPending : query.isPending;
    const showPrimaryError = status === 'pending' ? workspaceQuery.error : query.error;

    useEffect(() => {
        if (!modal) return undefined;

        const focusFrame = window.requestAnimationFrame(() => {
            decisionNoteRef.current?.focus();
        });

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            setModal(null);
        };

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.cancelAnimationFrame(focusFrame);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [modal]);

    return (
        <>
            <AdminStepUpCard />
            <ModuleScaffold
                eyebrow="Review Pipeline"
                title="Approvals"
                description="Handle dual-control approval decisions with explicit status, timestamps, and reviewer notes."
                metrics={[
                    { key: 'loaded', label: 'Loaded requests', value: rows.length, hint: `Current filter: ${status}.` },
                    { key: 'pending', label: 'Pending', value: workspaceQuery.data?.summary.pendingApprovals ?? rows.filter((row) => row.status === 'pending').length, hint: 'Items waiting for decision.' },
                    { key: 'dueSoon', label: 'Due soon', value: workspaceQuery.data?.summary.dueSoonApprovals ?? 0, hint: 'Approval expiry risk across the pipeline.' },
                    { key: 'execution', label: 'Approved pending execution', value: workspaceQuery.data?.summary.approvedPendingExecution ?? 0, hint: 'Approved actions waiting to be executed.' },
                ]}
                headerActions={(
                    <>
                        <Link to="/review" className="admin-btn subtle">
                            Review desk
                        </Link>
                        <button
                            type="button"
                            className="admin-btn primary"
                            onClick={() => {
                                void workspaceQuery.refetch();
                                if (status !== 'pending') {
                                    void query.refetch();
                                }
                            }}
                        >
                            Refresh approvals
                        </button>
                    </>
                )}
            >
                <OpsToolbar
                    compact
                    controls={
                        <>
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
                        </>
                    }
                    actions={
                        <>
                            <span className="ops-inline-muted">{rows.length} approvals loaded</span>
                            <button
                                type="button"
                                className="admin-btn subtle small"
                                onClick={() => {
                                    void workspaceQuery.refetch();
                                    if (status !== 'pending') {
                                        void query.refetch();
                                    }
                                }}
                            >
                                Refresh
                            </button>
                        </>
                    }
                />

                {showPrimaryLoading ? <div className="admin-alert info">Loading approvals...</div> : null}
                {showPrimaryError ? <OpsErrorState message="Failed to load approvals." /> : null}
                {status !== 'pending' && workspaceQuery.error ? <div className="admin-alert warning">Pipeline summary is temporarily unavailable, but approval records are still loaded.</div> : null}

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
                                <td>{formatDateTime(row.requestedAt)}</td>
                                <td>
                                    {row.status === 'pending' && row.id ? (
                                        <div className="ops-actions">
                                            <button
                                                type="button"
                                                className="admin-btn"
                                                disabled={approveMutation.isPending || !hasValidStepUp}
                                                onClick={() => {
                                                    setModal({
                                                        id: row.id as string,
                                                        mode: 'approve',
                                                        actionLabel: String(row.action ?? 'approval request'),
                                                        note: '',
                                                    });
                                                }}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-btn danger"
                                                disabled={rejectMutation.isPending || !hasValidStepUp}
                                                onClick={() => {
                                                    setModal({
                                                        id: row.id as string,
                                                        mode: 'reject',
                                                        actionLabel: String(row.action ?? 'approval request'),
                                                        note: '',
                                                    });
                                                }}
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

                {!showPrimaryLoading && !showPrimaryError && rows.length === 0 ? (
                    <OpsEmptyState message="No approvals found. Approval requests are created when posts are submitted for review via the publish workflow. Use the Review module to submit posts that require dual-control approval." />
                ) : null}

                {activeMutationError ? <OpsErrorState message={activeMutationError} /> : null}
            </ModuleScaffold>

            {modal ? (
                <div className="ops-modal-overlay" role="presentation" onClick={() => setModal(null)}>
                    <div className="ops-modal" role="dialog" aria-modal="true" aria-labelledby="approval-decision-title" onClick={(event) => event.stopPropagation()}>
                        <div className="ops-stack">
                            <h3 id="approval-decision-title">
                                {modal.mode === 'approve' ? 'Approve request' : 'Reject request'}
                            </h3>
                            <p className="ops-inline-muted">Action: {modal.actionLabel}</p>
                            <textarea
                                ref={decisionNoteRef}
                                className="ops-textarea"
                                value={modal.note}
                                onChange={(event) => setModal((current) => current ? ({ ...current, note: event.target.value }) : current)}
                                placeholder={modal.mode === 'approve' ? 'Approval note (optional)' : 'Rejection reason (required)'}
                            />
                            <div className="ops-actions">
                                <button type="button" className="admin-btn" onClick={() => setModal(null)}>Cancel</button>
                                <button
                                    type="button"
                                    className={`admin-btn ${modal.mode === 'approve' ? 'primary' : 'danger'}`}
                                    disabled={approveMutation.isPending || rejectMutation.isPending}
                                    onClick={() => {
                                        if (modal.mode === 'reject' && !modal.note.trim()) {
                                            notifyError('Reason required', 'Rejection reason is required by policy.');
                                            return;
                                        }
                                        if (modal.mode === 'approve') {
                                            approveMutation.mutate({ id: modal.id, note: modal.note.trim() || undefined }, {
                                                onError: (error) => notifyError('Approve failed', error instanceof Error ? error.message : 'Failed to approve request.'),
                                            });
                                        } else {
                                            rejectMutation.mutate({ id: modal.id, reason: modal.note.trim() }, {
                                                onError: (error) => notifyError('Reject failed', error instanceof Error ? error.message : 'Failed to reject request.'),
                                            });
                                        }
                                    }}
                                >
                                    {modal.mode === 'approve' ? (approveMutation.isPending ? 'Approving...' : 'Approve request') : (rejectMutation.isPending ? 'Rejecting...' : 'Reject request')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
