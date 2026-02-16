import { useQuery } from '@tanstack/react-query';

import { getAdminAnnouncements } from '../../lib/api/client';
import type { AdminAnnouncementListItem } from '../../types';

export function QueueModule() {
    const query = useQuery({
        queryKey: ['admin-queue', 'pending'],
        queryFn: () => getAdminAnnouncements({ status: 'pending', limit: 30 }),
    });

    const rows = query.data ?? [];

    return (
        <div className="admin-card">
            <h2>Queue</h2>
            <p className="admin-muted">Pending and scheduled content queue for reviewer throughput.</p>
            {query.isPending ? <div>Loading queue...</div> : null}
            {query.error ? <div style={{ color: '#b91c1c' }}>Failed to load queue.</div> : null}
            {rows.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Title</th>
                                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row: AdminAnnouncementListItem) => (
                                <tr key={row.id || row._id || row.slug || row.title}>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                        {row.title || 'Untitled'}
                                    </td>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                        {row.status || '-'}
                                    </td>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                        {row.type || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : null}
            {!query.isPending && !query.error && rows.length === 0 ? <div className="admin-muted">Queue is empty.</div> : null}
        </div>
    );
}
