import { useState } from 'react';
import type { AdminAuditLog } from '../adminTypes';
import { AUDIT_ACTIONS } from '../adminConstants';
import { formatLastUpdated } from '../adminHelpers';

export type AuditTabProps = {
    auditLogs: AdminAuditLog[];
    auditLoading: boolean;
    auditError: string | null;
    auditUpdatedAt: string | null;
    auditTotal: number;
    auditPage: number;
    auditLimit: number;
    setAuditLimit: (v: number) => void;
    setAuditPage: (v: number) => void;
    refreshAuditLogs: (page?: number, filters?: { userId: string; action: string; start: string; end: string }) => void;
    formatDateTime: (value?: string | Date | null) => string;
};

export function AuditTab({
    auditLogs,
    auditLoading,
    auditError,
    auditUpdatedAt,
    auditTotal,
    auditPage,
    auditLimit,
    setAuditLimit,
    setAuditPage,
    refreshAuditLogs,
    formatDateTime,
}: AuditTabProps) {
    const [auditFilters, setAuditFilters] = useState({
        userId: '',
        action: '',
        start: '',
        end: '',
    });

    const auditTotalPages = Math.max(1, Math.ceil(auditTotal / auditLimit));
    const auditStartIndex = auditTotal === 0 ? 0 : (auditPage - 1) * auditLimit + 1;
    const auditEndIndex = Math.min(auditTotal, auditPage * auditLimit);

    return (
        <div className="admin-list">
            <div className="admin-list-header">
                <div>
                    <h3>Audit log</h3>
                    <p className="admin-subtitle">Recent admin actions across create, review, and bulk updates.</p>
                </div>
                <div className="admin-list-actions">
                    <span className="admin-updated">{formatLastUpdated(auditUpdatedAt)}</span>
                    <button className="admin-btn secondary" onClick={() => refreshAuditLogs(undefined, auditFilters)} disabled={auditLoading}>
                        {auditLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            <div className="admin-filter-panel">
                <div className="filter-group">
                    <label htmlFor="audit-admin-id">Admin ID</label>
                    <input
                        id="audit-admin-id"
                        type="text"
                        value={auditFilters.userId}
                        onChange={(e) => setAuditFilters((prev) => ({ ...prev, userId: e.target.value }))}
                        placeholder="User ID"
                    />
                </div>
                <div className="filter-group">
                    <label htmlFor="audit-action">Action</label>
                    <select
                        id="audit-action"
                        value={auditFilters.action}
                        onChange={(e) => setAuditFilters((prev) => ({ ...prev, action: e.target.value }))}
                    >
                        <option value="">All actions</option>
                        {AUDIT_ACTIONS.map((action: string) => (
                            <option key={action} value={action}>{action}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label htmlFor="audit-start-date">Start date</label>
                    <input
                        id="audit-start-date"
                        type="date"
                        value={auditFilters.start}
                        onChange={(e) => setAuditFilters((prev) => ({ ...prev, start: e.target.value }))}
                    />
                </div>
                <div className="filter-group">
                    <label htmlFor="audit-end-date">End date</label>
                    <input
                        id="audit-end-date"
                        type="date"
                        value={auditFilters.end}
                        onChange={(e) => setAuditFilters((prev) => ({ ...prev, end: e.target.value }))}
                    />
                </div>
                <div className="filter-group">
                    <label htmlFor="audit-limit">Limit</label>
                    <input
                        id="audit-limit"
                        type="number"
                        min={10}
                        max={200}
                        value={auditLimit}
                        onChange={(e) => {
                            setAuditLimit(Number(e.target.value) || 50);
                            setAuditPage(1);
                        }}
                    />
                </div>
                <div className="filter-actions">
                    <button
                        className="admin-btn secondary"
                        onClick={() => refreshAuditLogs(1)}
                        disabled={auditLoading}
                    >
                        Apply
                    </button>
                    <button
                        className="admin-btn secondary"
                        onClick={() => {
                            setAuditFilters({ userId: '', action: '', start: '', end: '' });
                            setAuditLimit(50);
                            refreshAuditLogs(1, { userId: '', action: '', start: '', end: '' });
                        }}
                        disabled={auditLoading}
                    >
                        Clear
                    </button>
                </div>
            </div>

            {auditLoading ? (
                <div className="admin-loading">Loading audit log...</div>
            ) : auditError ? (
                <div className="admin-error">{auditError}</div>
            ) : auditLogs.length === 0 ? (
                <div className="empty-state">No audit entries yet. Approvals, rejects, deletes, and bulk edits will appear here.</div>
            ) : (
                <>
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Action</th>
                                    <th>Title</th>
                                    <th>Note</th>
                                    <th>Admin</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLogs.map((log) => (
                                    <tr key={log.id}>
                                        <td>{formatDateTime(log.createdAt)}</td>
                                        <td><span className="status-pill info">{log.action}</span></td>
                                        <td>{log.title || log.announcementId || '-'}</td>
                                        <td>{log.note || '-'}</td>
                                        <td>{log.userId || 'system'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="admin-pagination">
                        <span className="pagination-info">
                            Showing {auditStartIndex}-{auditEndIndex} of {auditTotal}
                        </span>
                        <button
                            className="admin-btn secondary small"
                            onClick={() => refreshAuditLogs(Math.max(1, auditPage - 1), auditFilters)}
                            disabled={auditLoading || auditPage <= 1}
                        >
                            Prev
                        </button>
                        <span className="pagination-info">
                            Page {auditPage} of {auditTotalPages}
                        </span>
                        <button
                            className="admin-btn secondary small"
                            onClick={() => refreshAuditLogs(Math.min(auditTotalPages, auditPage + 1), auditFilters)}
                            disabled={auditLoading || auditPage >= auditTotalPages}
                        >
                            Next
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
