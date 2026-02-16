import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { getAdminAnnouncements, updateAdminAnnouncement } from '../../lib/api/client';
import type { AdminAnnouncementListItem } from '../../types';

type EditableAnnouncement = {
    title: string;
    category: string;
    organization: string;
    status: string;
    content: string;
    externalLink: string;
    location: string;
};

const defaultEditable: EditableAnnouncement = {
    title: '',
    category: '',
    organization: '',
    status: 'draft',
    content: '',
    externalLink: '',
    location: '',
};

export function DetailedPostModule() {
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string>('');
    const [editable, setEditable] = useState<EditableAnnouncement>(defaultEditable);

    const query = useQuery({
        queryKey: ['detailed-post-list', search],
        queryFn: () => getAdminAnnouncements({ limit: 100, search }),
    });

    const announcements = useMemo(() => query.data ?? [], [query.data]);
    const selected = useMemo(
        () => announcements.find((item) => (item.id || item._id) === selectedId) as (AdminAnnouncementListItem | undefined),
        [announcements, selectedId]
    );

    useEffect(() => {
        if (!selected) return;
        setEditable({
            title: selected.title ?? '',
            category: String(selected.category ?? ''),
            organization: String(selected.organization ?? ''),
            status: selected.status ?? 'draft',
            content: String(selected.content ?? ''),
            externalLink: String(selected.externalLink ?? ''),
            location: String(selected.location ?? ''),
        });
    }, [selected]);

    const mutation = useMutation({
        mutationFn: async () => {
            if (!selectedId) throw new Error('Select an announcement first.');
            return updateAdminAnnouncement(selectedId, {
                title: editable.title.trim(),
                category: editable.category.trim(),
                organization: editable.organization.trim(),
                status: editable.status,
                content: editable.content || undefined,
                externalLink: editable.externalLink || undefined,
                location: editable.location || undefined,
            });
        },
        onSuccess: () => {
            void query.refetch();
        },
    });

    return (
        <div className="admin-card">
            <h2>Detailed Post</h2>
            <p className="admin-muted">Edit existing records with full field controls.</p>
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 2fr', marginBottom: 12 }}>
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by title..."
                />
                <select
                    value={selectedId}
                    onChange={(event) => setSelectedId(event.target.value)}
                >
                    <option value="">Select announcement...</option>
                    {announcements.map((item) => {
                        const id = item.id || item._id || '';
                        return (
                            <option key={id} value={id}>
                                {item.title || 'Untitled'} [{item.status || 'unknown'}]
                            </option>
                        );
                    })}
                </select>
            </div>
            {query.isPending ? <div>Loading announcements...</div> : null}
            {query.error ? <div style={{ color: '#b91c1c' }}>Failed to load announcement list.</div> : null}
            {selected ? (
                <form
                    style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
                    onSubmit={(event) => {
                        event.preventDefault();
                        mutation.mutate();
                    }}
                >
                    <input
                        value={editable.title}
                        onChange={(event) => setEditable((current) => ({ ...current, title: event.target.value }))}
                        placeholder="Title"
                        required
                        minLength={10}
                        style={{ gridColumn: '1 / -1' }}
                    />
                    <input
                        value={editable.category}
                        onChange={(event) => setEditable((current) => ({ ...current, category: event.target.value }))}
                        placeholder="Category"
                        required
                    />
                    <input
                        value={editable.organization}
                        onChange={(event) => setEditable((current) => ({ ...current, organization: event.target.value }))}
                        placeholder="Organization"
                        required
                    />
                    <select
                        value={editable.status}
                        onChange={(event) => setEditable((current) => ({ ...current, status: event.target.value }))}
                    >
                        <option value="draft">Draft</option>
                        <option value="pending">Pending</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                    </select>
                    <input
                        value={editable.location}
                        onChange={(event) => setEditable((current) => ({ ...current, location: event.target.value }))}
                        placeholder="Location"
                    />
                    <input
                        value={editable.externalLink}
                        onChange={(event) => setEditable((current) => ({ ...current, externalLink: event.target.value }))}
                        placeholder="External link"
                        style={{ gridColumn: '1 / -1' }}
                    />
                    <textarea
                        value={editable.content}
                        onChange={(event) => setEditable((current) => ({ ...current, content: event.target.value }))}
                        placeholder="Content"
                        style={{ gridColumn: '1 / -1', minHeight: 180, border: '1px solid #d6dde3', borderRadius: 8, padding: 10 }}
                    />
                    <div style={{ gridColumn: '1 / -1' }}>
                        <button type="submit" className="admin-btn primary" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            ) : null}
            {mutation.isError ? (
                <div style={{ color: '#b91c1c', marginTop: 10 }}>
                    {mutation.error instanceof Error ? mutation.error.message : 'Failed to update announcement.'}
                </div>
            ) : null}
            {mutation.isSuccess ? <div style={{ color: '#166534', marginTop: 10 }}>Changes saved.</div> : null}
        </div>
    );
}
