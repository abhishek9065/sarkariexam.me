import { useState, useEffect } from 'react';
import { adminRequest } from '../../utils/adminRequest';
import { getApiErrorMessage } from '../../utils/errors';
import './SecurityLogsTable.css';

interface SecurityLog {
    id: number;
    ip_address: string;
    event_type: string;
    endpoint: string;
    metadata: any;
    created_at: string;
}

interface SecurityLogsTableProps {
    onUnauthorized?: () => void;
}

const apiBase = import.meta.env.VITE_API_BASE ?? '';

export function SecurityLogsTable({ onUnauthorized }: SecurityLogsTableProps) {
    const [logs, setLogs] = useState<SecurityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [pollIntervalMs, setPollIntervalMs] = useState(120000);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [total, setTotal] = useState(0);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startIndex = total === 0 ? 0 : (page - 1) * limit + 1;
    const endIndex = Math.min(total, page * limit);

    const formatLastUpdated = (value?: string | null) => {
        if (!value) return 'Not updated yet';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Not updated yet';
        const diffMs = Date.now() - date.getTime();
        if (diffMs < 60 * 1000) return 'Updated just now';
        if (diffMs < 60 * 60 * 1000) return `Updated ${Math.round(diffMs / 60000)}m ago`;
        if (diffMs < 24 * 60 * 60 * 1000) return `Updated ${Math.round(diffMs / (60 * 60 * 1000))}h ago`;
        return `Updated ${Math.round(diffMs / (24 * 60 * 60 * 1000))}d ago`;
    };

    const fetchLogs = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await adminRequest(`${apiBase}/api/admin/security?limit=${limit}&offset=${Math.max(0, (page - 1) * limit)}`, {
                onRateLimit: (rateLimitResponse) => {
                    const retryAfter = rateLimitResponse.headers.get('Retry-After');
                    const message = retryAfter
                        ? `Too many requests. Pausing refresh for ${retryAfter}s.`
                        : 'Too many requests. Pausing live refresh for 5 minutes.';
                    setError(message);
                },
            });
            if (res.status === 429) {
                setPollIntervalMs(5 * 60 * 1000);
                return;
            }
            if (res.status === 401 || res.status === 403) {
                onUnauthorized?.();
                return;
            }
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                setError(getApiErrorMessage(errorBody, 'Failed to load security logs.'));
                setLogs([]);
                return;
            }
            const data = await res.json();
            setLogs(data.data || []);
            setTotal(data.meta?.total ?? data.data?.length ?? 0);
            setUpdatedAt(new Date().toISOString());
        } catch (error) {
            console.error(error);
            setError('Failed to load security logs.');
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        // Poll every 30 seconds for live monitoring
        const interval = setInterval(fetchLogs, pollIntervalMs);
        return () => clearInterval(interval);
    }, [pollIntervalMs, page, limit]);

    useEffect(() => {
        setPage((current) => Math.min(current, totalPages));
    }, [totalPages]);

    if (loading && logs.length === 0) {
        return <div className="loading-spinner">Loading logs...</div>;
    }

    return (
        <div className="security-logs-container">
            <div className="logs-header">
                <h3>🛡️ Security Event Logs</h3>
                <div className="logs-actions">
                    <label className="logs-limit">
                        <span>Rows</span>
                        <select
                            value={limit}
                            onChange={(e) => {
                                setLimit(Number(e.target.value));
                                setPage(1);
                            }}
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                    </label>
                    <span className="logs-updated">{formatLastUpdated(updatedAt)}</span>
                    <button onClick={fetchLogs} className="admin-btn secondary small" disabled={loading}>
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <span className="live-indicator">● Live</span>
                </div>
            </div>

            {error && <div className="logs-error">{error}</div>}

            <div className="logs-table-wrapper">
                <table className="admin-table logs-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Event</th>
                            <th>IP Address</th>
                            <th>Endpoint</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id} className={`log-row ${log.event_type}`}>
                                <td className="time-col">
                                    {new Date(log.created_at).toLocaleTimeString()}
                                    <span className="date-small">{new Date(log.created_at).toLocaleDateString()}</span>
                                </td>
                                <td>
                                    <span className={`event-badge ${log.event_type}`}>
                                        {log.event_type.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="ip-col">{log.ip_address}</td>
                                <td className="endpoint-col">{log.endpoint || '-'}</td>
                                <td className="details-col">
                                    <div className="metadata-json">
                                        {JSON.stringify(log.metadata)}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="empty-state">No security events yet. Lockouts and suspicious logins will appear here.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="logs-pagination">
                <span className="pagination-info">
                    Showing {startIndex}-{endIndex} of {total}
                </span>
                <div className="logs-pagination-actions">
                    <button
                        className="admin-btn secondary small"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={loading || page <= 1}
                    >
                        Prev
                    </button>
                    <span className="pagination-info">Page {page} of {totalPages}</span>
                    <button
                        className="admin-btn secondary small"
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={loading || page >= totalPages}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
