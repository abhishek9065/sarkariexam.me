import { useQuery } from '@tanstack/react-query';

import { OpsCard, OpsEmptyState, OpsErrorState, OpsTable } from '../../components/ops';
import { getAdminAuditLogs } from '../../lib/api/client';
import type { AdminAuditLog } from '../../types';

export function AuditModule() {
    const query = useQuery({
        queryKey: ['admin-audit-logs'],
        queryFn: () => getAdminAuditLogs(40, 0),
    });

    const rows = query.data ?? [];

    return (
        <OpsCard title="Audit" description="Immutable admin action timeline for compliance checks.">
            {query.isPending ? <div className="admin-alert info">Loading audit logs...</div> : null}
            {query.error ? <OpsErrorState message="Failed to load audit logs." /> : null}
            {rows.length > 0 ? (
                <OpsTable
                    columns={[
                        { key: 'action', label: 'Action' },
                        { key: 'actor', label: 'Actor' },
                        { key: 'when', label: 'When' },
                        { key: 'ref', label: 'Reference' },
                    ]}
                >
                    {rows.map((row: AdminAuditLog, index: number) => (
                        <tr key={row.id || `${row.action}-${index}`}>
                            <td>{String(row.action ?? '-')}</td>
                            <td>{String(row.actorEmail ?? row.actorId ?? '-')}</td>
                            <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}</td>
                            <td><code>{String(row.id ?? '-')}</code></td>
                        </tr>
                    ))}
                </OpsTable>
            ) : null}
            {!query.isPending && !query.error && rows.length === 0 ? (
                <OpsEmptyState message="No audit entries found." />
            ) : null}
        </OpsCard>
    );
}
