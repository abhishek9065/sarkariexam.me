import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAdminPreferences } from '../../app/useAdminPreferences';
import { OpsBadge, OpsCard, OpsEmptyState, OpsErrorState, OpsTable } from '../../components/ops';
import { getAdminAnnouncements } from '../../lib/api/client';
import type { AdminAnnouncementListItem } from '../../types';

const queueStatusTone = (status?: string) => {
    if (status === 'scheduled') return 'info';
    if (status === 'pending') return 'warning';
    if (status === 'published') return 'success';
    return 'neutral';
};

export function QueueModule() {
    const { formatDateTime } = useAdminPreferences();
    const [view, setView] = useState<'pending' | 'scheduled' | 'combined'>('combined');

    const pendingQuery = useQuery({
        queryKey: ['admin-queue', 'pending'],
        queryFn: () => getAdminAnnouncements({ status: 'pending', limit: 40, sort: 'newest' }),
    });

    const scheduledQuery = useQuery({
        queryKey: ['admin-queue', 'scheduled'],
        queryFn: () => getAdminAnnouncements({ status: 'scheduled', limit: 40, sort: 'newest' }),
    });

    const rows = useMemo(() => {
        const pendingRows = pendingQuery.data ?? [];
        const scheduledRows = scheduledQuery.data ?? [];
        if (view === 'pending') return pendingRows;
        if (view === 'scheduled') return scheduledRows;
        return [...pendingRows, ...scheduledRows];
    }, [pendingQuery.data, scheduledQuery.data, view]);

    const loading = pendingQuery.isPending || scheduledQuery.isPending;
    const hasError = pendingQuery.error || scheduledQuery.error;

    return (
        <OpsCard title="Queue" description="Pending and scheduled content queue with ownership/state visibility.">
            <div className="ops-stack">
                <div className="ops-count-grid">
                    <div className="ops-kpi-card">
                        <div className="ops-kpi-label">Pending queue</div>
                        <div className="ops-kpi-value">{pendingQuery.data?.length ?? 0}</div>
                    </div>
                    <div className="ops-kpi-card">
                        <div className="ops-kpi-label">Scheduled queue</div>
                        <div className="ops-kpi-value">{scheduledQuery.data?.length ?? 0}</div>
                    </div>
                    <div className="ops-kpi-card">
                        <div className="ops-kpi-label">Combined view</div>
                        <div className="ops-kpi-value">{rows.length}</div>
                    </div>
                </div>

                <div className="ops-actions">
                    <button type="button" className={`admin-btn small ${view === 'combined' ? 'primary' : 'subtle'}`} onClick={() => setView('combined')}>Combined</button>
                    <button type="button" className={`admin-btn small ${view === 'pending' ? 'primary' : 'subtle'}`} onClick={() => setView('pending')}>Pending</button>
                    <button type="button" className={`admin-btn small ${view === 'scheduled' ? 'primary' : 'subtle'}`} onClick={() => setView('scheduled')}>Scheduled</button>
                </div>

                {loading ? <div className="admin-alert info">Loading queue...</div> : null}
                {hasError ? <OpsErrorState message="Failed to load queue." /> : null}
                {rows.length > 0 ? (
                    <OpsTable
                        columns={[
                            { key: 'title', label: 'Title' },
                            { key: 'status', label: 'Status' },
                            { key: 'type', label: 'Type' },
                            { key: 'owner', label: 'Owner' },
                            { key: 'updated', label: 'Updated' },
                        ]}
                    >
                        {rows.map((row: AdminAnnouncementListItem) => (
                            <tr key={row.id || row._id || row.slug || row.title}>
                                <td>{row.title || 'Untitled'}</td>
                                <td>
                                    <OpsBadge tone={queueStatusTone(row.status) as 'neutral' | 'info' | 'warning' | 'success'}>
                                        {row.status || '-'}
                                    </OpsBadge>
                                </td>
                                <td>{row.type || '-'}</td>
                                <td>{row.updatedBy || '-'}</td>
                                <td>{formatDateTime(row.updatedAt || row.publishedAt)}</td>
                            </tr>
                        ))}
                    </OpsTable>
                ) : null}
                {!loading && !hasError && rows.length === 0 ? <OpsEmptyState message="Queue is empty for selected view." /> : null}
            </div>
        </OpsCard>
    );
}
