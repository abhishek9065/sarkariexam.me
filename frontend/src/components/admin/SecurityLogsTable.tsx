import { useState, useEffect } from 'react';
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
            const res = await fetch(`${apiBase}/api/admin/security?limit=50`, {
                credentials: 'include',
            });
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
        const interval = setInterval(fetchLogs, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading && logs.length === 0) {
        return <div className="loading-spinner">Loading logs...</div>;
    }

    return (
        <div className="security-logs-container">
            <div className="logs-header">
                <h3>🛡️ Security Event Logs</h3>
                <div className="logs-actions">
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
        </div>
    );
}
