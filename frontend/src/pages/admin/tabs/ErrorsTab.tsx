import type { ErrorReport, ErrorReportStatus } from '../adminTypes';
import { formatLastUpdated } from '../adminHelpers';

export type ErrorsTabProps = {
    errorReports: ErrorReport[];
    errorReportsLoading: boolean;
    errorReportsError: string | null;
    errorReportsUpdatedAt: string | null;
    errorReportStatusFilter: ErrorReportStatus | 'all';
    setErrorReportStatusFilter: (v: ErrorReportStatus | 'all') => void;
    errorReportQuery: string;
    setErrorReportQuery: (v: string) => void;
    errorReportNotes: Record<string, string>;
    setErrorReportNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    refreshErrorReports: () => void;
    updateErrorReport: (id: string, status: ErrorReportStatus) => void;
    communityMutatingIds: Set<string>;
    canWriteAdmin: boolean;
};

export function ErrorsTab({
    errorReports,
    errorReportsLoading,
    errorReportsError,
    errorReportsUpdatedAt,
    errorReportStatusFilter,
    setErrorReportStatusFilter,
    errorReportQuery,
    setErrorReportQuery,
    errorReportNotes,
    setErrorReportNotes,
    refreshErrorReports,
    updateErrorReport,
    communityMutatingIds,
    canWriteAdmin,
}: ErrorsTabProps) {
    return (
        <div className="admin-list">
            <div className="admin-list-header">
                <div>
                    <h3>Error reports</h3>
                    <p className="admin-subtitle">Review client error reports submitted from the UI.</p>
                </div>
                <div className="admin-list-actions">
                    <span className="admin-updated">{formatLastUpdated(errorReportsUpdatedAt)}</span>
                    <button className="admin-btn secondary" onClick={refreshErrorReports} disabled={errorReportsLoading}>
                        {errorReportsLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            <div className="admin-community-filter">
                <label htmlFor="errorStatusFilter" className="admin-inline-label">Status</label>
                <select
                    id="errorStatusFilter"
                    value={errorReportStatusFilter}
                    onChange={(e) => setErrorReportStatusFilter(e.target.value as ErrorReportStatus | 'all')}
                >
                    <option value="new">New</option>
                    <option value="triaged">Triaged</option>
                    <option value="resolved">Resolved</option>
                    <option value="all">All</option>
                </select>
                <label htmlFor="errorIdFilter" className="admin-inline-label">Error ID</label>
                <input
                    id="errorIdFilter"
                    type="text"
                    placeholder="Search error ID"
                    value={errorReportQuery}
                    onChange={(e) => setErrorReportQuery(e.target.value)}
                />
            </div>

            {errorReportsError && <div className="admin-error">{errorReportsError}</div>}

            {errorReportsLoading ? (
                <div className="admin-loading">Loading error reports...</div>
            ) : errorReports.length === 0 ? (
                <div className="empty-state">No error reports available.</div>
            ) : (
                <div className="admin-community-grid">
                    {errorReports.map((report) => (
                        <div key={report.id} className="admin-community-item">
                            <div className="admin-community-header">
                                <div>
                                    <h4>{report.message}</h4>
                                    <p className="admin-subtitle">Error ID: {report.errorId}</p>
                                </div>
                                <span className={`status-pill ${report.status === 'new' ? 'danger' : report.status === 'resolved' ? 'success' : 'warning'}`}>
                                    {report.status}
                                </span>
                            </div>
                            <div className="admin-community-meta">
                                <span>{new Date(report.createdAt).toLocaleString()}</span>
                                {report.userEmail && <span>User: {report.userEmail}</span>}
                                {report.pageUrl && (
                                    <a href={report.pageUrl} target="_blank" rel="noreferrer" className="community-link">
                                        Page link
                                    </a>
                                )}
                            </div>
                            {report.note && (
                                <div className="admin-community-answer">User note: {report.note}</div>
                            )}
                            {(report.stack || report.componentStack || report.userAgent) && (
                                <details className="admin-trace">
                                    <summary>Debug details</summary>
                                    {report.userAgent && (
                                        <p className="admin-trace-meta"><strong>User agent:</strong> {report.userAgent}</p>
                                    )}
                                    {report.stack && (
                                        <pre className="admin-trace-block">{report.stack}</pre>
                                    )}
                                    {report.componentStack && (
                                        <>
                                            <p className="admin-trace-meta"><strong>Component stack:</strong></p>
                                            <pre className="admin-trace-block">{report.componentStack}</pre>
                                        </>
                                    )}
                                </details>
                            )}
                            <textarea
                                className="review-note-input compact"
                                rows={3}
                                placeholder="Add internal triage notes..."
                                value={errorReportNotes[report.id] ?? report.adminNote ?? ''}
                                onChange={(e) => setErrorReportNotes((prev) => ({ ...prev, [report.id]: e.target.value }))}
                            />
                            {canWriteAdmin && (
                                <div className="admin-community-actions">
                                    <button
                                        className="admin-btn warning small"
                                        onClick={() => updateErrorReport(report.id, 'triaged')}
                                        disabled={communityMutatingIds.has(report.id)}
                                    >
                                        Mark triaged
                                    </button>
                                    <button
                                        className="admin-btn success small"
                                        onClick={() => updateErrorReport(report.id, 'resolved')}
                                        disabled={communityMutatingIds.has(report.id)}
                                    >
                                        Resolve
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
