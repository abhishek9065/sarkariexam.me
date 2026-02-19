import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAdminAuth } from '../../app/useAdminAuth';
import { AdminStepUpCard } from '../../components/AdminStepUpCard';
import { OpsBadge, OpsCard, OpsEmptyState, OpsErrorState, OpsTable, OpsToolbar } from '../../components/ops';
import { useAdminNotifications } from '../../components/ops/legacy-port';
import {
    checkLinks,
    createLinkRecord,
    getLinkRecords,
    replaceLinks,
    updateLinkRecord,
} from '../../lib/api/client';
import type { LinkRecord } from '../../types';

const toneByStatus = (status: LinkRecord['status']) => {
    if (status === 'active') return 'success';
    if (status === 'expired') return 'warning';
    return 'danger';
};

export function LinkManagerModule() {
    const queryClient = useQueryClient();
    const { stepUpToken, hasValidStepUp } = useAdminAuth();
    const { notifyError, notifyInfo, notifySuccess } = useAdminNotifications();

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<'active' | 'expired' | 'broken' | 'all'>('all');
    const [type, setType] = useState<'official' | 'pdf' | 'external' | 'all'>('all');
    const [form, setForm] = useState({
        label: '',
        url: '',
        type: 'official' as 'official' | 'pdf' | 'external',
        status: 'active' as 'active' | 'expired' | 'broken',
        announcementId: '',
        notes: '',
    });
    const [replaceForm, setReplaceForm] = useState({ fromUrl: '', toUrl: '', scope: 'all' as 'all' | 'announcements' | 'links' });

    const query = useQuery({
        queryKey: ['admin-links', search, status, type],
        queryFn: () => getLinkRecords({ search, status, type, limit: 150 }),
    });

    const rows = useMemo(() => query.data?.data ?? [], [query.data]);

    const createMutation = useMutation({
        mutationFn: async () => createLinkRecord(form),
        onSuccess: async () => {
            setForm({ label: '', url: '', type: 'official', status: 'active', announcementId: '', notes: '' });
            notifySuccess('Link created', 'Link record added to manager.');
            await queryClient.invalidateQueries({ queryKey: ['admin-links'] });
        },
        onError: (error) => notifyError('Create failed', error instanceof Error ? error.message : 'Unable to create link.'),
    });

    const patchMutation = useMutation({
        mutationFn: async (input: { id: string; status: LinkRecord['status'] }) => updateLinkRecord(input.id, { status: input.status }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-links'] });
        },
    });

    const checkMutation = useMutation({
        mutationFn: async () => checkLinks({ ids: rows.slice(0, 100).map((item) => item.id) }),
        onSuccess: (result) => {
            notifyInfo('Link check completed', `Checked ${result.data.length} links.`);
            void queryClient.invalidateQueries({ queryKey: ['admin-links'] });
        },
    });

    const replaceMutation = useMutation({
        mutationFn: async () => {
            if (!stepUpToken || !hasValidStepUp) {
                throw new Error('Step-up verification is required for replace-everywhere.');
            }
            return replaceLinks(replaceForm, stepUpToken);
        },
        onSuccess: async () => {
            notifySuccess('Replace complete', 'URL replacement has been applied.');
            await queryClient.invalidateQueries({ queryKey: ['admin-links'] });
        },
        onError: (error) => notifyError('Replace failed', error instanceof Error ? error.message : 'Unable to replace links.'),
    });

    return (
        <>
            <AdminStepUpCard />
            <OpsCard title="Link Manager" description="Store official/PDF links, run health checks, and replace URLs everywhere.">
                <OpsToolbar
                    controls={(
                        <>
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search by label, URL, or notes"
                            />
                            <select value={type} onChange={(event) => setType(event.target.value as typeof type)}>
                                <option value="all">Type: All</option>
                                <option value="official">Official</option>
                                <option value="pdf">PDF</option>
                                <option value="external">External</option>
                            </select>
                            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                                <option value="all">Status: All</option>
                                <option value="active">Active</option>
                                <option value="expired">Expired</option>
                                <option value="broken">Broken</option>
                            </select>
                        </>
                    )}
                    actions={(
                        <>
                            <button type="button" className="admin-btn small" disabled={checkMutation.isPending} onClick={() => checkMutation.mutate()}>
                                {checkMutation.isPending ? 'Checking...' : 'Run Link Check'}
                            </button>
                            <span className="ops-inline-muted">Rows: {rows.length}</span>
                        </>
                    )}
                />

                <div className="ops-form-grid three">
                    <input
                        value={form.label}
                        onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                        placeholder="Label (Apply Online)"
                    />
                    <input
                        value={form.url}
                        onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
                        placeholder="https://..."
                    />
                    <select
                        value={form.type}
                        onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as typeof form.type }))}
                    >
                        <option value="official">Official</option>
                        <option value="pdf">PDF</option>
                        <option value="external">External</option>
                    </select>
                    <select
                        value={form.status}
                        onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as typeof form.status }))}
                    >
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="broken">Broken</option>
                    </select>
                    <input
                        value={form.announcementId}
                        onChange={(event) => setForm((current) => ({ ...current, announcementId: event.target.value }))}
                        placeholder="Announcement ID (optional)"
                    />
                    <button
                        type="button"
                        className="admin-btn primary"
                        disabled={createMutation.isPending || !form.label.trim() || !form.url.trim()}
                        onClick={() => createMutation.mutate()}
                    >
                        {createMutation.isPending ? 'Saving...' : 'Add Link'}
                    </button>
                    <textarea
                        className="ops-span-full"
                        value={form.notes}
                        onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Notes (optional)"
                    />
                </div>

                <div className="ops-form-grid three">
                    <input
                        value={replaceForm.fromUrl}
                        onChange={(event) => setReplaceForm((current) => ({ ...current, fromUrl: event.target.value }))}
                        placeholder="Replace URL from"
                    />
                    <input
                        value={replaceForm.toUrl}
                        onChange={(event) => setReplaceForm((current) => ({ ...current, toUrl: event.target.value }))}
                        placeholder="Replace URL to"
                    />
                    <select
                        value={replaceForm.scope}
                        onChange={(event) => setReplaceForm((current) => ({ ...current, scope: event.target.value as typeof replaceForm.scope }))}
                    >
                        <option value="all">Scope: All</option>
                        <option value="links">Links only</option>
                        <option value="announcements">Announcements only</option>
                    </select>
                    <button
                        type="button"
                        className="admin-btn danger ops-span-full"
                        disabled={replaceMutation.isPending || !replaceForm.fromUrl.trim() || !replaceForm.toUrl.trim() || !hasValidStepUp}
                        onClick={() => replaceMutation.mutate()}
                    >
                        {replaceMutation.isPending ? 'Replacing...' : 'Update Link Everywhere'}
                    </button>
                </div>

                {query.isPending ? <div className="admin-alert info">Loading links...</div> : null}
                {query.error ? <OpsErrorState message="Failed to load links." /> : null}
                {rows.length > 0 ? (
                    <OpsTable
                        columns={[
                            { key: 'label', label: 'Label' },
                            { key: 'url', label: 'URL' },
                            { key: 'type', label: 'Type' },
                            { key: 'status', label: 'Status' },
                            { key: 'actions', label: 'Actions' },
                        ]}
                    >
                        {rows.map((row) => (
                            <tr key={row.id}>
                                <td>{row.label}</td>
                                <td><a href={row.url} target="_blank" rel="noreferrer">{row.url}</a></td>
                                <td>{row.type}</td>
                                <td>
                                    <OpsBadge tone={toneByStatus(row.status) as 'neutral' | 'success' | 'warning' | 'danger'}>
                                        {row.status}
                                    </OpsBadge>
                                </td>
                                <td>
                                    <div className="ops-actions">
                                        <button type="button" className="admin-btn small subtle" onClick={() => patchMutation.mutate({ id: row.id, status: 'active' })}>
                                            Mark Active
                                        </button>
                                        <button type="button" className="admin-btn small" onClick={() => patchMutation.mutate({ id: row.id, status: 'broken' })}>
                                            Mark Broken
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </OpsTable>
                ) : null}
                {!query.isPending && !query.error && rows.length === 0 ? (
                    <OpsEmptyState message="No links found for current filters." />
                ) : null}
            </OpsCard>
        </>
    );
}
