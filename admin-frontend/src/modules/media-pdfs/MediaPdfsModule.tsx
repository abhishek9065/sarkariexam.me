import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { OpsBadge, OpsCard, OpsEmptyState, OpsErrorState, OpsTable, OpsToolbar } from '../../components/ops';
import { createMediaAsset, getMediaAssets, updateMediaAsset } from '../../lib/api/client';
import type { MediaAsset } from '../../types';

const tone = (status: MediaAsset['status']) => (status === 'active' ? 'success' : 'warning');

export function MediaPdfsModule() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<'notification' | 'result' | 'admit-card' | 'answer-key' | 'syllabus' | 'other' | 'all'>('all');
    const [status, setStatus] = useState<'active' | 'archived' | 'all'>('all');
    const [form, setForm] = useState({
        label: '',
        fileName: '',
        fileUrl: '',
        mimeType: 'application/pdf',
        category: 'other' as MediaAsset['category'],
        keepStableUrl: true,
        fileSizeBytes: '',
    });

    const query = useQuery({
        queryKey: ['admin-media-assets', search, category, status],
        queryFn: () => getMediaAssets({ search, category, status, limit: 150 }),
    });

    const rows = useMemo(() => query.data?.data ?? [], [query.data]);

    const createMutation = useMutation({
        mutationFn: async () => createMediaAsset({
            ...form,
            fileSizeBytes: form.fileSizeBytes ? Number(form.fileSizeBytes) : undefined,
        }),
        onSuccess: async () => {
            setForm({
                label: '',
                fileName: '',
                fileUrl: '',
                mimeType: 'application/pdf',
                category: 'other',
                keepStableUrl: true,
                fileSizeBytes: '',
            });
            await queryClient.invalidateQueries({ queryKey: ['admin-media-assets'] });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (payload: { id: string; status: MediaAsset['status'] }) => updateMediaAsset(payload.id, { status: payload.status }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-media-assets'] });
        },
    });

    return (
        <OpsCard title="Media / PDFs" description="Track notification PDFs and media references with stable URL control.">
            <OpsToolbar
                controls={(
                    <>
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search by file, label, or URL"
                        />
                        <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
                            <option value="all">Category: All</option>
                            <option value="notification">Notification</option>
                            <option value="result">Result</option>
                            <option value="admit-card">Admit Card</option>
                            <option value="answer-key">Answer Key</option>
                            <option value="syllabus">Syllabus</option>
                            <option value="other">Other</option>
                        </select>
                        <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                            <option value="all">Status: All</option>
                            <option value="active">Active</option>
                            <option value="archived">Archived</option>
                        </select>
                    </>
                )}
            />

            <div className="ops-form-grid three">
                <input
                    value={form.label}
                    onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                    placeholder="Label"
                />
                <input
                    value={form.fileName}
                    onChange={(event) => setForm((current) => ({ ...current, fileName: event.target.value }))}
                    placeholder="File name"
                />
                <input
                    value={form.fileUrl}
                    onChange={(event) => setForm((current) => ({ ...current, fileUrl: event.target.value }))}
                    placeholder="https://cdn.example.com/file.pdf"
                />
                <input
                    value={form.mimeType}
                    onChange={(event) => setForm((current) => ({ ...current, mimeType: event.target.value }))}
                    placeholder="MIME type"
                />
                <input
                    value={form.fileSizeBytes}
                    onChange={(event) => setForm((current) => ({ ...current, fileSizeBytes: event.target.value }))}
                    placeholder="File size bytes"
                />
                <select
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as MediaAsset['category'] }))}
                >
                    <option value="notification">Notification</option>
                    <option value="result">Result</option>
                    <option value="admit-card">Admit Card</option>
                    <option value="answer-key">Answer Key</option>
                    <option value="syllabus">Syllabus</option>
                    <option value="other">Other</option>
                </select>
                <label className="ops-row">
                    <input
                        type="checkbox"
                        checked={form.keepStableUrl}
                        onChange={(event) => setForm((current) => ({ ...current, keepStableUrl: event.target.checked }))}
                    />
                    Keep URL stable on replace
                </label>
                <button
                    type="button"
                    className="admin-btn primary"
                    disabled={createMutation.isPending || !form.label.trim() || !form.fileUrl.trim() || !form.fileName.trim()}
                    onClick={() => createMutation.mutate()}
                >
                    {createMutation.isPending ? 'Saving...' : 'Add Media'}
                </button>
            </div>

            {query.isPending ? <div className="admin-alert info">Loading media records...</div> : null}
            {query.error ? <OpsErrorState message="Failed to load media records." /> : null}
            {rows.length > 0 ? (
                <OpsTable
                    columns={[
                        { key: 'label', label: 'Label' },
                        { key: 'file', label: 'File' },
                        { key: 'category', label: 'Category' },
                        { key: 'status', label: 'Status' },
                        { key: 'actions', label: 'Actions' },
                    ]}
                >
                    {rows.map((row) => (
                        <tr key={row.id}>
                            <td>{row.label}</td>
                            <td>
                                <strong>{row.fileName}</strong>
                                <div className="ops-inline-muted">{row.fileUrl}</div>
                            </td>
                            <td>{row.category}</td>
                            <td>
                                <OpsBadge tone={tone(row.status) as 'success' | 'warning'}>
                                    {row.status}
                                </OpsBadge>
                            </td>
                            <td>
                                <div className="ops-actions">
                                    <button type="button" className="admin-btn small subtle" onClick={() => updateMutation.mutate({ id: row.id, status: 'active' })}>
                                        Activate
                                    </button>
                                    <button type="button" className="admin-btn small" onClick={() => updateMutation.mutate({ id: row.id, status: 'archived' })}>
                                        Archive
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </OpsTable>
            ) : null}
            {!query.isPending && !query.error && rows.length === 0 ? (
                <OpsEmptyState message="No media assets found." />
            ) : null}
        </OpsCard>
    );
}
