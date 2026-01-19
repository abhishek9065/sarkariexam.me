import { useState, useEffect } from 'react';
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
    adminToken: string | null;
}

const apiBase = import.meta.env.VITE_API_BASE ?? '';

export function SecurityLogsTable({ adminToken }: SecurityLogsTableProps) {
    const [logs, setLogs] = useState<SecurityLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        if (!adminToken) return;
        try {
            setLoading(true);
            const res = await fetch(`${apiBase}/api/admin/security/logs?limit=50`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            const data = await res.json();
            setLogs(data.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        // Poll every 30 seconds for live monitoring
        const interval = setInterval(fetchLogs, 30000);
        return () => clearInterval(interval);
    }, [adminToken]);

    if (loading && logs.length === 0) {
        return <div className="loading-spinner">Loading logs...</div>;
    }

    return (
        <div className="security-logs-container">
            <div className="logs-header">
                <h3>🛡️ Security Event Logs</h3>
                <div className="logs-actions">
                    <button onClick={fetchLogs} className="admin-btn secondary small">Refresh</button>
                    <span className="live-indicator">● Live</span>
                </div>
            </div>

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
                                <td colSpan={5} className="empty-state">No security events found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
