import { useQuery } from '@tanstack/react-query';

import { getAdminSecurityLogs } from '../../lib/api/client';
import type { AdminSecurityLog } from '../../types';

export function SecurityModule() {
    const query = useQuery({
        queryKey: ['admin-security-logs'],
        queryFn: () => getAdminSecurityLogs(30, 0),
    });

    const rows = query.data ?? [];

    return (
        <div className="admin-card">
            <h2>Security</h2>
            <p className="admin-muted">Recent security events and high-signal endpoint activity.</p>
            {query.isPending ? <div>Loading security logs...</div> : null}
            {query.error ? <div style={{ color: '#b91c1c' }}>Failed to load security logs.</div> : null}
            {rows.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Event</th>
                                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Endpoint</th>
                                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>IP</th>
                                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>When</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row: AdminSecurityLog, index: number) => (
                                <tr key={row.id || `${row.eventType}-${index}`}>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                        {String(row.eventType ?? row.event_type ?? 'unknown')}
                                    </td>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                        {String(row.endpoint ?? '-')}
                                    </td>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                        {String(row.ipAddress ?? row.ip_address ?? '-')}
                                    </td>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : null}
            {!query.isPending && !query.error && rows.length === 0 ? <div className="admin-muted">No security logs found.</div> : null}
        </div>
    );
}
