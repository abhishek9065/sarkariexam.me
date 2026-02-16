import { useQuery } from '@tanstack/react-query';

import { getAdminAuditLogs } from '../../lib/api/client';
import type { AdminAuditLog } from '../../types';

export function AuditModule() {
    const query = useQuery({
        queryKey: ['admin-audit-logs'],
        queryFn: () => getAdminAuditLogs(40, 0),
    });

    const rows = query.data ?? [];

    return (
        <div className="admin-card">
            <h2>Audit</h2>
            <p className="admin-muted">Immutable admin actions timeline for review and compliance checks.</p>
            {query.isPending ? <div>Loading audit logs...</div> : null}
            {query.error ? <div style={{ color: '#b91c1c' }}>Failed to load audit logs.</div> : null}
            {rows.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Action</th>
                                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Actor</th>
                                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>When</th>
                                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Ref</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row: AdminAuditLog, index: number) => (
                                <tr key={row.id || `${row.action}-${index}`}>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                        {String(row.action ?? '-')}
                                    </td>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                        {String(row.actorEmail ?? row.actorId ?? '-')}
                                    </td>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}
                                    </td>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                        <code>{String(row.id ?? '-')}</code>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : null}
            {!query.isPending && !query.error && rows.length === 0 ? <div className="admin-muted">No audit entries found.</div> : null}
        </div>
    );
}
