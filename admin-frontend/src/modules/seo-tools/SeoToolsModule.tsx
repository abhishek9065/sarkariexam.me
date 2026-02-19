import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { OpsCard, OpsEmptyState, OpsErrorState, OpsTable, OpsToolbar } from '../../components/ops';
import { getAdminAnnouncements, updateAnnouncementSeo } from '../../lib/api/client';
import type { AdminAnnouncementListItem } from '../../types';

const initialSeo = {
    metaTitle: '',
    metaDescription: '',
    canonical: '',
    indexPolicy: 'index' as 'index' | 'noindex',
    ogImage: '',
    schemaJson: '',
};

export function SeoToolsModule() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<AdminAnnouncementListItem | null>(null);
    const [seoState, setSeoState] = useState(initialSeo);

    const query = useQuery({
        queryKey: ['admin-seo-announcements', search],
        queryFn: () => getAdminAnnouncements({ search, limit: 100, status: 'all' }),
    });

    const rows = useMemo(() => query.data ?? [], [query.data]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const id = selected?.id || selected?._id;
            if (!id) {
                throw new Error('Select a post before saving SEO.');
            }
            return updateAnnouncementSeo(id, {
                seo: {
                    metaTitle: seoState.metaTitle.trim() || undefined,
                    metaDescription: seoState.metaDescription.trim() || undefined,
                    canonical: seoState.canonical.trim() || undefined,
                    indexPolicy: seoState.indexPolicy,
                    ogImage: seoState.ogImage.trim() || undefined,
                },
                schema: seoState.schemaJson.trim()
                    ? JSON.parse(seoState.schemaJson)
                    : undefined,
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-seo-announcements'] });
        },
    });

    const hydrateSeo = (item: AdminAnnouncementListItem) => {
        setSelected(item);
        setSeoState({
            metaTitle: item.seo?.metaTitle ?? '',
            metaDescription: item.seo?.metaDescription ?? '',
            canonical: item.seo?.canonical ?? '',
            indexPolicy: item.seo?.indexPolicy ?? 'index',
            ogImage: item.seo?.ogImage ?? '',
            schemaJson: item.schema ? JSON.stringify(item.schema, null, 2) : '',
        });
    };

    return (
        <OpsCard title="SEO Tools" description="Manage meta, canonical, index policy and structured data on each post.">
            <OpsToolbar
                controls={(
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search posts by title to edit SEO"
                    />
                )}
                actions={(
                    <span className="ops-inline-muted">
                        {selected ? `Selected: ${selected.title}` : 'Select a post to edit SEO'}
                    </span>
                )}
            />

            {query.isPending ? <div className="admin-alert info">Loading posts...</div> : null}
            {query.error ? <OpsErrorState message="Failed to load posts." /> : null}
            {rows.length > 0 ? (
                <OpsTable
                    columns={[
                        { key: 'title', label: 'Title' },
                        { key: 'type', label: 'Type' },
                        { key: 'status', label: 'Status' },
                        { key: 'action', label: 'Action' },
                    ]}
                >
                    {rows.map((row) => {
                        const id = row.id || row._id || `${row.title}-${row.updatedAt}`;
                        return (
                            <tr key={id}>
                                <td>{row.title || 'Untitled'}</td>
                                <td>{row.type || '-'}</td>
                                <td>{row.status || '-'}</td>
                                <td>
                                    <button type="button" className="admin-btn small subtle" onClick={() => hydrateSeo(row)}>
                                        Edit SEO
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </OpsTable>
            ) : null}
            {!query.isPending && !query.error && rows.length === 0 ? (
                <OpsEmptyState message="No matching posts found." />
            ) : null}

            {selected ? (
                <div className="ops-form-grid">
                    <input
                        className="ops-span-full"
                        value={seoState.metaTitle}
                        onChange={(event) => setSeoState((current) => ({ ...current, metaTitle: event.target.value }))}
                        placeholder="Meta title"
                    />
                    <textarea
                        className="ops-span-full"
                        value={seoState.metaDescription}
                        onChange={(event) => setSeoState((current) => ({ ...current, metaDescription: event.target.value }))}
                        placeholder="Meta description"
                    />
                    <input
                        value={seoState.canonical}
                        onChange={(event) => setSeoState((current) => ({ ...current, canonical: event.target.value }))}
                        placeholder="Canonical URL"
                    />
                    <select
                        value={seoState.indexPolicy}
                        onChange={(event) => setSeoState((current) => ({ ...current, indexPolicy: event.target.value as 'index' | 'noindex' }))}
                    >
                        <option value="index">Index</option>
                        <option value="noindex">Noindex</option>
                    </select>
                    <input
                        className="ops-span-full"
                        value={seoState.ogImage}
                        onChange={(event) => setSeoState((current) => ({ ...current, ogImage: event.target.value }))}
                        placeholder="OpenGraph image URL"
                    />
                    <textarea
                        className="ops-span-full ops-textarea"
                        value={seoState.schemaJson}
                        onChange={(event) => setSeoState((current) => ({ ...current, schemaJson: event.target.value }))}
                        placeholder='Schema JSON (optional), e.g. {"@type":"JobPosting"}'
                    />
                    <div className="ops-actions ops-span-full">
                        <button type="button" className="admin-btn primary" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                            {saveMutation.isPending ? 'Saving...' : 'Save SEO'}
                        </button>
                    </div>
                </div>
            ) : null}

            {saveMutation.isError ? (
                <OpsErrorState message={saveMutation.error instanceof Error ? saveMutation.error.message : 'Failed to save SEO.'} />
            ) : null}
            {saveMutation.isSuccess ? <div className="ops-success">SEO updated successfully.</div> : null}
        </OpsCard>
    );
}
