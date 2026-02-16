import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getAdminAnnouncements } from '../lib/api/client';
import type { AdminAnnouncementListItem } from '../types';
import { useLocalStorageState } from '../lib/useLocalStorageState';

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
        <div className="admin-card">
            <h2>Announcements</h2>
            <p className="admin-muted">Parity list module with persisted filters for fast moderation rounds.</p>

            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '2fr 1fr 1fr', marginBottom: 12 }}>
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search title / keyword..."
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
            </div>

            {query.isPending ? <div>Loading announcements...</div> : null}
            {query.error ? <div style={{ color: '#b91c1c' }}>Failed to load announcements list.</div> : null}
            {rows.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '8px 6px' }}>Title</th>
                                <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '8px 6px' }}>Status</th>
                                <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '8px 6px' }}>Type</th>
                                <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '8px 6px' }}>Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((item: AdminAnnouncementListItem) => (
                                <tr key={item.id || item._id || item.slug || item.title}>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                        {item.title || 'Untitled'}
                                    </td>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                        {item.status || '-'}
                                    </td>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                        {item.type || '-'}
                                    </td>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                        {formatDate(item.updatedAt || item.publishedAt)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : null}
            {!query.isPending && !query.error && rows.length === 0 ? <div className="admin-muted">No announcements found.</div> : null}
        </div>
    );
}
