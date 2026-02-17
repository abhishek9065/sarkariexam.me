import { useQuery } from '@tanstack/react-query';

import { OpsCard, OpsEmptyState, OpsErrorState, OpsTable } from '../../components/ops';
import { getAdminAnnouncements } from '../../lib/api/client';
import type { AdminAnnouncementListItem } from '../../types';

export function QueueModule() {
    const query = useQuery({
        queryKey: ['admin-queue', 'pending'],
        queryFn: () => getAdminAnnouncements({ status: 'pending', limit: 30 }),
    });

    const rows = query.data ?? [];

    return (
        <OpsCard title="Queue" description="Pending and scheduled content queue for reviewer throughput.">
            {query.isPending ? <div className="admin-alert info">Loading queue...</div> : null}
            {query.error ? <OpsErrorState message="Failed to load queue." /> : null}
            {rows.length > 0 ? (
                <OpsTable
                    columns={[
                        { key: 'title', label: 'Title' },
                        { key: 'status', label: 'Status' },
                        { key: 'type', label: 'Type' },
                    ]}
                >
                    {rows.map((row: AdminAnnouncementListItem) => (
                        <tr key={row.id || row._id || row.slug || row.title}>
                            <td>{row.title || 'Untitled'}</td>
                            <td>{row.status || '-'}</td>
                            <td>{row.type || '-'}</td>
                        </tr>
                    ))}
                </OpsTable>
            ) : null}
            {!query.isPending && !query.error && rows.length === 0 ? <OpsEmptyState message="Queue is empty." /> : null}
        </OpsCard>
    );
}
