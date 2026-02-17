import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { OpsBadge, OpsCard, OpsEmptyState, OpsErrorState, OpsTable, OpsToolbar } from '../components/ops';
import { getAdminAnnouncements } from '../lib/api/client';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import type { AdminAnnouncementListItem } from '../types';

const statusTone = (status?: string) => {
    if (status === 'published') return 'success';
    if (status === 'pending' || status === 'scheduled') return 'warning';
    if (status === 'archived') return 'danger';
    return 'neutral';
};

export function AnnouncementsPage() {
    const [status, setStatus] = useLocalStorageState<string>('admin-vnext-announcements-status', 'all', (raw) => {
        if (raw === '"draft"' || raw === 'draft') return 'draft';
        if (raw === '"pending"' || raw === 'pending') return 'pending';
        if (raw === '"published"' || raw === 'published') return 'published';
        return 'all';
    });
    const [search, setSearch] = useLocalStorageState<string>('admin-vnext-announcements-search', '');
    const [limit, setLimit] = useLocalStorageState<number>('admin-vnext-announcements-limit', 50, (raw) => {
        const parsed = Number(raw.replace(/"/g, ''));
        if (Number.isFinite(parsed) && parsed > 0 && parsed <= 200) return parsed;
        return 50;
    });

    const query = useQuery({
        queryKey: ['admin-announcements', status, search, limit],
        queryFn: () => getAdminAnnouncements({ limit, offset: 0, status, search }),
    });

    const rows = useMemo(() => {
        if (!Array.isArray(query.data)) return [];
        return query.data.slice(0, limit);
    }, [query.data, limit]);

    const statusOptions = [
        { value: 'all', label: 'All' },
        { value: 'pending', label: 'Pending' },
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' },
    ];

    const formatDate = (value?: string) => {
        if (!value) return '-';
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
    };

    return (
        <OpsCard title="Announcements" description="Parity list module with persisted filters for rapid moderation rounds.">
            <OpsToolbar
                controls={
                    <>
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search title or keyword"
                            aria-label="Search announcements"
                        />
                        <select
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                            aria-label="Filter announcements by status"
                        >
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <select
                            value={String(limit)}
                            onChange={(event) => setLimit(Number(event.target.value))}
                            aria-label="Rows per page"
                        >
                            <option value="20">20 rows</option>
                            <option value="50">50 rows</option>
                            <option value="100">100 rows</option>
                        </select>
                    </>
                }
            />

            {query.isPending ? <div className="admin-alert info">Loading announcements...</div> : null}
            {query.error ? <OpsErrorState message="Failed to load announcements list." /> : null}
            {rows.length > 0 ? (
                <OpsTable
                    columns={[
                        { key: 'title', label: 'Title' },
                        { key: 'status', label: 'Status' },
                        { key: 'type', label: 'Type' },
                        { key: 'updated', label: 'Updated' },
                    ]}
                >
                    {rows.map((item: AdminAnnouncementListItem) => (
                        <tr key={item.id || item._id || item.slug || item.title}>
                            <td>{item.title || 'Untitled'}</td>
                            <td>
                                <OpsBadge tone={statusTone(item.status) as 'neutral' | 'success' | 'warning' | 'danger'}>
                                    {item.status || '-'}
                                </OpsBadge>
                            </td>
                            <td>{item.type || '-'}</td>
                            <td>{formatDate(item.updatedAt || item.publishedAt)}</td>
                        </tr>
                    ))}
                </OpsTable>
            ) : null}
            {!query.isPending && !query.error && rows.length === 0 ? (
                <OpsEmptyState message="No announcements found for current filters." />
            ) : null}
        </OpsCard>
    );
}
