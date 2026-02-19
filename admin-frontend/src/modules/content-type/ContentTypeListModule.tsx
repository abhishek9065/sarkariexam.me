import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { OpsBadge, OpsCard, OpsEmptyState, OpsErrorState, OpsTable, OpsToolbar } from '../../components/ops';
import { getAdminAnnouncements } from '../../lib/api/client';
import type { AdminAnnouncementListItem, AnnouncementStatusFilter, AnnouncementTypeFilter } from '../../types';

type Props = {
    type: AnnouncementTypeFilter;
    title: string;
    description: string;
};

const toneByStatus = (status?: string) => {
    if (status === 'published') return 'success';
    if (status === 'pending' || status === 'scheduled') return 'warning';
    if (status === 'archived') return 'danger';
    return 'neutral';
};

export function ContentTypeListModule({ type, title, description }: Props) {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<AnnouncementStatusFilter | 'all'>('all');
    const [sort, setSort] = useState<'newest' | 'oldest' | 'updated' | 'deadline' | 'views'>('updated');

    const query = useQuery({
        queryKey: ['admin-content-type', type, search, status, sort],
        queryFn: () => getAdminAnnouncements({
            type,
            status,
            search,
            sort,
            limit: 120,
        }),
    });

    const rows = useMemo(
        () => (query.data ?? []).slice(0, 100),
        [query.data]
    );

    return (
        <OpsCard title={title} description={description}>
            <OpsToolbar
                controls={(
                    <>
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={`Search ${title.toLowerCase()} by title, org, or category`}
                        />
                        <select
                            value={status}
                            onChange={(event) => setStatus(event.target.value as AnnouncementStatusFilter | 'all')}
                        >
                            <option value="all">Status: All</option>
                            <option value="draft">Draft</option>
                            <option value="pending">Pending</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="published">Published</option>
                            <option value="archived">Archived</option>
                        </select>
                        <select
                            value={sort}
                            onChange={(event) => setSort(event.target.value as 'newest' | 'oldest' | 'updated' | 'deadline' | 'views')}
                        >
                            <option value="updated">Sort: Updated</option>
                            <option value="newest">Newest</option>
                            <option value="deadline">Deadline</option>
                            <option value="views">Views</option>
                            <option value="oldest">Oldest</option>
                        </select>
                    </>
                )}
                actions={(
                    <span className="ops-inline-muted">
                        Showing {rows.length} records
                    </span>
                )}
            />

            {query.isPending ? <div className="admin-alert info">Loading records...</div> : null}
            {query.error ? <OpsErrorState message="Failed to load records." /> : null}

            {rows.length > 0 ? (
                <OpsTable
                    columns={[
                        { key: 'title', label: 'Title' },
                        { key: 'status', label: 'Status' },
                        { key: 'category', label: 'Category' },
                        { key: 'organization', label: 'Organization' },
                        { key: 'updatedAt', label: 'Updated' },
                    ]}
                >
                    {rows.map((row: AdminAnnouncementListItem) => {
                        const id = row.id || row._id || `${row.title}-${row.updatedAt}`;
                        return (
                            <tr key={id}>
                                <td>
                                    <strong>{row.title || 'Untitled'}</strong>
                                    <div className="ops-inline-muted">
                                        <code>{row.id || row._id || '-'}</code>
                                    </div>
                                </td>
                                <td>
                                    <OpsBadge tone={toneByStatus(row.status) as 'neutral' | 'success' | 'warning' | 'danger'}>
                                        {row.status || 'unknown'}
                                    </OpsBadge>
                                </td>
                                <td>{row.category || '-'}</td>
                                <td>{row.organization || '-'}</td>
                                <td>{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '-'}</td>
                            </tr>
                        );
                    })}
                </OpsTable>
            ) : null}

            {!query.isPending && !query.error && rows.length === 0 ? (
                <OpsEmptyState message="No records found for the selected filters." />
            ) : null}
        </OpsCard>
    );
}
