import { useQuery } from '@tanstack/react-query';

import { OpsCard, OpsEmptyState, OpsErrorState, OpsTable } from '../../components/ops';
import { getAdminSecurityLogs } from '../../lib/api/client';
import type { AdminSecurityLog } from '../../types';

export function SecurityModule() {
    const query = useQuery({
        queryKey: ['admin-security-logs'],
        queryFn: () => getAdminSecurityLogs(30, 0),
    });

    const rows = query.data ?? [];

    return (
        <OpsCard title="Security" description="Recent security events and high-signal endpoint activity.">
            {query.isPending ? <div className="admin-alert info">Loading security logs...</div> : null}
            {query.error ? <OpsErrorState message="Failed to load security logs." /> : null}
            {rows.length > 0 ? (
                <OpsTable
                    columns={[
                        { key: 'event', label: 'Event' },
                        { key: 'endpoint', label: 'Endpoint' },
                        { key: 'ip', label: 'IP' },
                        { key: 'when', label: 'When' },
                    ]}
                >
                    {rows.map((row: AdminSecurityLog, index: number) => (
                        <tr key={row.id || `${row.eventType}-${index}`}>
                            <td>{String(row.eventType ?? row.event_type ?? 'unknown')}</td>
                            <td>{String(row.endpoint ?? '-')}</td>
                            <td>{String(row.ipAddress ?? row.ip_address ?? '-')}</td>
                            <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}</td>
                        </tr>
                    ))}
                </OpsTable>
            ) : null}
            {!query.isPending && !query.error && rows.length === 0 ? <OpsEmptyState message="No security logs found." /> : null}
        </OpsCard>
    );
}
