import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

import { OpsCard, OpsErrorState, OpsToolbar } from '../../components/ops';
import { useAdminNotifications } from '../../components/ops/legacy-port';
import {
    autosaveAnnouncementDraft,
    createAnnouncementDraft,
    getAdminAnnouncementsPaged,
    getAnnouncementRevisions,
    restoreRevision,
    updateAdminAnnouncement,
} from '../../lib/api/client';
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

const createSnapshot = (value: EditableAnnouncement) => JSON.stringify(value);

export function DetailedPostModule() {
    const location = useLocation();
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string>('');
    const [editable, setEditable] = useState<EditableAnnouncement>(defaultEditable);
    const [lastSyncedSnapshot, setLastSyncedSnapshot] = useState<string>(createSnapshot(defaultEditable));
    const [lastAutosaveAt, setLastAutosaveAt] = useState<string>('');
    const [autosaveEnabled, setAutosaveEnabled] = useState(true);
    const { notifyInfo, notifySuccess, notifyError } = useAdminNotifications();

    const query = useQuery({
        queryKey: ['detailed-post-list', search],
        queryFn: () => getAdminAnnouncementsPaged({ limit: 100, search, sort: 'updated', status: 'all' }),
    });

    const announcements = useMemo(() => query.data?.data ?? [], [query.data?.data]);
    const selected = useMemo(
        () => announcements.find((item) => (item.id || item._id) === selectedId) as (AdminAnnouncementListItem | undefined),
        [announcements, selectedId]
    );

    const revisionsQuery = useQuery({
        queryKey: ['announcement-revisions', selectedId],
        queryFn: () => getAnnouncementRevisions(selectedId, 12),
        enabled: Boolean(selectedId),
        staleTime: 30_000,
    });

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const focus = params.get('focus');
        if (!focus) return;
        if (focus !== selectedId) {
            setSelectedId(focus);
        }
    }, [location.search, selectedId]);

    useEffect(() => {
        if (!selected) return;
        const nextEditable: EditableAnnouncement = {
            title: selected.title ?? '',
            category: String(selected.category ?? ''),
            organization: String(selected.organization ?? ''),
            status: selected.status ?? 'draft',
            content: String(selected.content ?? ''),
            externalLink: String(selected.externalLink ?? ''),
            location: String(selected.location ?? ''),
        };
        setEditable(nextEditable);
        setLastSyncedSnapshot(createSnapshot(nextEditable));
        setLastAutosaveAt('');
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
            const snapshot = createSnapshot(editable);
            setLastSyncedSnapshot(snapshot);
            setLastAutosaveAt(new Date().toISOString());
            notifySuccess('Saved', 'Post changes were saved to server.');
            void query.refetch();
            void revisionsQuery.refetch();
        },
        onError: (error) => {
            notifyError('Save failed', error instanceof Error ? error.message : 'Unable to save post changes.');
        },
    });

    const autosaveMutation = useMutation({
        mutationFn: async () => {
            if (!selectedId) throw new Error('Missing selected post for autosave.');
            return autosaveAnnouncementDraft(selectedId, {
                title: editable.title.trim(),
                category: editable.category.trim(),
                organization: editable.organization.trim(),
                status: editable.status as 'draft' | 'pending' | 'scheduled' | 'published' | 'archived',
                content: editable.content || undefined,
                externalLink: editable.externalLink || undefined,
                location: editable.location || undefined,
                autosave: {
                    editorSessionId: 'detailed-post-module',
                    clientUpdatedAt: new Date().toISOString(),
                },
            });
        },
        onSuccess: (data) => {
            setLastSyncedSnapshot(createSnapshot(editable));
            setLastAutosaveAt(String(data.updatedAt || new Date().toISOString()));
        },
        onError: () => {
            // Do not interrupt editor flow on autosave jitter.
        },
    });

    const createDraftMutation = useMutation({
        mutationFn: () => createAnnouncementDraft({ type: 'job' }),
        onSuccess: async (draft) => {
            await query.refetch();
            setSelectedId(draft.id);
            setSearch('');
            notifySuccess('Draft created', `New draft ${draft.id} is ready in editor.`);
        },
        onError: (error) => {
            notifyError('Create draft failed', error instanceof Error ? error.message : 'Unable to initialize draft.');
        },
    });

    const restoreMutation = useMutation({
        mutationFn: async ({ id, version }: { id: string; version: number }) => {
            return restoreRevision(id, version);
        },
        onSuccess: () => {
            notifySuccess('Restored', 'Revision has been restored. The previous state was saved as a new revision.');
            void query.refetch();
            void revisionsQuery.refetch();
        },
        onError: (error) => {
            notifyError('Restore failed', error instanceof Error ? error.message : 'Unable to restore revision.');
        },
    });

    const currentSnapshot = createSnapshot(editable);
    const isDirty = Boolean(selectedId) && currentSnapshot !== lastSyncedSnapshot;

    useEffect(() => {
        if (!autosaveEnabled) return;
        if (!selectedId || !isDirty) return;

        const timer = window.setInterval(() => {
            if (autosaveMutation.isPending || mutation.isPending) return;
            autosaveMutation.mutate();
        }, 10_000);

        return () => window.clearInterval(timer);
    }, [autosaveEnabled, autosaveMutation, isDirty, mutation.isPending, selectedId]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && (event.key === 's' || event.key === 'Enter')) {
                event.preventDefault();
                if (selectedId && !mutation.isPending) {
                    mutation.mutate();
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [mutation, selectedId]);

    return (
        <OpsCard title="Detailed Post" description="Deep editor with server autosave, revision timeline, and restore controls.">
            <div className="ops-stack">
                <OpsToolbar
                    compact
                    controls={
                        <>
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search by title"
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
                            <button
                                type="button"
                                className="admin-btn small"
                                onClick={() => createDraftMutation.mutate()}
                                disabled={createDraftMutation.isPending}
                            >
                                {createDraftMutation.isPending ? 'Creating draft...' : 'New draft'}
                            </button>
                        </>
                    }
                    actions={
                        <>
                            <span className="ops-inline-muted">
                                {selected ? `Editing: ${selected.title || selectedId}` : 'Select a record to edit.'}
                            </span>
                            <span className="ops-inline-muted">
                                Autosave: {autosaveEnabled ? 'On' : 'Off'}
                                {lastAutosaveAt ? ` | Last autosave ${new Date(lastAutosaveAt).toLocaleTimeString()}` : ''}
                                {isDirty ? ' | Unsaved changes' : ' | Synced'}
                            </span>
                            <button type="button" className="admin-btn small subtle" onClick={() => void query.refetch()}>
                                Refresh list
                            </button>
                            <button
                                type="button"
                                className="admin-btn small subtle"
                                onClick={() => setAutosaveEnabled((value) => !value)}
                                disabled={!selected}
                            >
                                {autosaveEnabled ? 'Disable autosave' : 'Enable autosave'}
                            </button>
                            <button
                                type="button"
                                className="admin-btn small"
                                onClick={() => {
                                    if (!selected) return;
                                    const restored: EditableAnnouncement = {
                                        title: selected.title ?? '',
                                        category: String(selected.category ?? ''),
                                        organization: String(selected.organization ?? ''),
                                        status: selected.status ?? 'draft',
                                        content: String(selected.content ?? ''),
                                        externalLink: String(selected.externalLink ?? ''),
                                        location: String(selected.location ?? ''),
                                    };
                                    setEditable(restored);
                                    setLastSyncedSnapshot(createSnapshot(restored));
                                    notifyInfo('Form restored', 'Unsaved edits reset to current record values.');
                                }}
                                disabled={!selected}
                            >
                                Restore values
                            </button>
                        </>
                    }
                />
                {query.isPending ? <div className="admin-alert info">Loading announcements...</div> : null}
                {query.error ? <OpsErrorState message="Failed to load announcement list." /> : null}

                {selected ? (
                    <form
                        className="ops-editor-layout"
                        onSubmit={(event) => {
                            event.preventDefault();
                            mutation.mutate();
                        }}
                    >
                        <div className="ops-editor-main">
                            <input
                                value={editable.title}
                                onChange={(event) => setEditable((current) => ({ ...current, title: event.target.value }))}
                                placeholder="Title"
                                required
                                minLength={10}
                                className="ops-span-full"
                            />
                            <div className="ops-form-grid">
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
                                <input
                                    value={editable.location}
                                    onChange={(event) => setEditable((current) => ({ ...current, location: event.target.value }))}
                                    placeholder="Location"
                                    className="ops-span-full"
                                />
                            </div>
                            <input
                                value={editable.externalLink}
                                onChange={(event) => setEditable((current) => ({ ...current, externalLink: event.target.value }))}
                                placeholder="External link"
                                className="ops-span-full"
                            />
                            <textarea
                                value={editable.content}
                                onChange={(event) => setEditable((current) => ({ ...current, content: event.target.value }))}
                                placeholder="Content"
                                className="ops-span-full ops-textarea"
                            />
                        </div>

                        <div className="ops-editor-rail">
                            <OpsCard title="Publish Checklist" tone="muted">
                                <div className="ops-stack">
                                    <select
                                        value={editable.status}
                                        onChange={(event) => setEditable((current) => ({ ...current, status: event.target.value }))}
                                        className="ops-span-full"
                                    >
                                        <option value="draft">Draft</option>
                                        <option value="pending">Pending Review</option>
                                        <option value="scheduled">Scheduled</option>
                                        <option value="published">Published</option>
                                        <option value="archived">Archived</option>
                                    </select>

                                    <div className="ops-row">
                                        <input type="checkbox" checked={Boolean(editable.title && editable.category && editable.organization)} readOnly />
                                        <span className="ops-inline-muted">Basic info complete</span>
                                    </div>
                                    <div className="ops-row">
                                        <input type="checkbox" checked={Boolean(editable.content)} readOnly />
                                        <span className="ops-inline-muted">Content provided</span>
                                    </div>
                                    <div className="ops-row">
                                        <input type="checkbox" checked={!isDirty} readOnly />
                                        <span className="ops-inline-muted">{isDirty ? 'Unsaved changes' : 'All changes saved'}</span>
                                    </div>

                                    <div className="ops-actions">
                                        <button type="submit" className="admin-btn primary" disabled={mutation.isPending}>
                                            {mutation.isPending ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        <button
                                            type="button"
                                            className="admin-btn subtle"
                                            onClick={() => window.open(`/post/${selectedId}`, '_blank')}
                                        >
                                            Preview as user
                                        </button>
                                    </div>
                                </div>
                            </OpsCard>
                        </div>
                    </form>
                ) : null}

                {selectedId ? (
                    <div className="ops-card muted">
                        <h4>Revision Timeline</h4>
                        {revisionsQuery.isPending ? <div className="ops-inline-muted">Loading revisions...</div> : null}
                        {revisionsQuery.error ? <OpsErrorState message="Failed to load revision timeline." /> : null}
                        {!revisionsQuery.isPending && !revisionsQuery.error ? (
                            <div className="ops-stack">
                                {(revisionsQuery.data?.revisions ?? []).map((revision) => (
                                    <div key={revision.version} className="ops-row wrap" style={{ gap: '0.5rem', alignItems: 'center' }}>
                                        <strong>v{revision.version}</strong>
                                        <span className="ops-inline-muted">
                                            {revision.updatedAt ? new Date(revision.updatedAt).toLocaleString() : 'Unknown time'}
                                        </span>
                                        <code>{(revision.changedKeys || []).slice(0, 6).join(', ') || 'no-key-diff'}</code>
                                        <button
                                            type="button"
                                            className="admin-btn subtle"
                                            style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                                            disabled={restoreMutation.isPending}
                                            onClick={() => {
                                                if (window.confirm(`Restore this announcement to version ${revision.version}? The current state will be saved as a new revision.`)) {
                                                    restoreMutation.mutate({ id: selectedId, version: revision.version });
                                                }
                                            }}
                                        >
                                            {restoreMutation.isPending ? '...' : '⏪ Restore'}
                                        </button>
                                    </div>
                                ))}
                                {(revisionsQuery.data?.revisions ?? []).length === 0 ? (
                                    <div className="ops-inline-muted">No revision history available for this record yet.</div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {restoreMutation.isError ? (
                    <OpsErrorState message={restoreMutation.error instanceof Error ? restoreMutation.error.message : 'Failed to restore revision.'} />
                ) : null}
                {restoreMutation.isSuccess ? <div className="ops-success">Revision restored successfully.</div> : null}

                {mutation.isError ? (
                    <OpsErrorState message={mutation.error instanceof Error ? mutation.error.message : 'Failed to update announcement.'} />
                ) : null}
                {mutation.isSuccess ? <div className="ops-success">Changes saved.</div> : null}
            </div>
        </OpsCard>
    );
}
