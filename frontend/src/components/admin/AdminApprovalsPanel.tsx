export type AdminApprovalStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'expired';

export interface AdminApprovalItem {
    id: string;
    actionType: string;
    targetIds: string[];
    status: AdminApprovalStatus;
    requestedByEmail: string;
    requestedAt: string;
    expiresAt: string;
    note?: string;
    approvedByEmail?: string;
    rejectedByEmail?: string;
    rejectionReason?: string;
}

interface AdminApprovalsPanelProps {
    approvals: AdminApprovalItem[];
    loading?: boolean;
    currentUserEmail?: string;
    onRefresh: () => void;
    onApprove: (approvalId: string) => void;
    onReject: (approvalId: string) => void;
}

const formatActionLabel = (actionType: string) => {
    if (actionType === 'announcement_publish') return 'Publish';
    if (actionType === 'announcement_bulk_publish') return 'Bulk publish';
    if (actionType === 'announcement_delete') return 'Delete';
    return actionType;
};

const formatDateTime = (value?: string) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

export function AdminApprovalsPanel({
    approvals,
    loading = false,
    currentUserEmail,
    onRefresh,
    onApprove,
    onReject,
}: AdminApprovalsPanelProps) {
    return (
        <div className="admin-card">
            <div className="admin-card-header">
                <div>
                    <h4>Approval workflow</h4>
                    <p className="admin-subtitle">High-risk publish/delete actions require second-person approval.</p>
                </div>
                <button className="admin-btn secondary small" onClick={onRefresh} disabled={loading}>
                    {loading ? 'Refreshing…' : 'Refresh'}
                </button>
            </div>

            {approvals.length === 0 ? (
                <div className="empty-state">No approval items at the moment.</div>
            ) : (
                <div className="table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Action</th>
                                <th>Targets</th>
                                <th>Requested By</th>
                                <th>Requested At</th>
                                <th>Status</th>
                                <th>Expires</th>
                                <th>Decision</th>
                            </tr>
                        </thead>
                        <tbody>
                            {approvals.map((approval) => {
                                const canResolve = approval.status === 'pending' && approval.requestedByEmail !== currentUserEmail;
                                return (
                                    <tr key={approval.id}>
                                        <td>{formatActionLabel(approval.actionType)}</td>
                                        <td>{approval.targetIds.length}</td>
                                        <td>{approval.requestedByEmail}</td>
                                        <td>{formatDateTime(approval.requestedAt)}</td>
                                        <td>
                                            <span className={`status-pill ${approval.status === 'pending' ? 'warning' : approval.status === 'approved' || approval.status === 'executed' ? 'success' : 'info'}`}>
                                                {approval.status}
                                            </span>
                                        </td>
                                        <td>{formatDateTime(approval.expiresAt)}</td>
                                        <td>
                                            {canResolve ? (
                                                <div className="backup-codes-actions">
                                                    <button className="admin-btn primary small" onClick={() => onApprove(approval.id)}>
                                                        Approve
                                                    </button>
                                                    <button className="admin-btn warning small" onClick={() => onReject(approval.id)}>
                                                        Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="admin-subtitle">
                                                    {approval.approvedByEmail
                                                        ? `Approved by ${approval.approvedByEmail}`
                                                        : approval.rejectedByEmail
                                                            ? `Rejected by ${approval.rejectedByEmail}`
                                                            : '—'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default AdminApprovalsPanel;
