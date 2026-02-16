import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { useAdminAuth } from '../../app/useAdminAuth';
import { AdminStepUpCard } from '../../components/AdminStepUpCard';
import { getBulkUpdatePreview, runBulkUpdate } from '../../lib/api/client';
import type { AdminBulkPreview } from '../../types';

const parseIds = (raw: string): string[] => raw
    .split(/[\n,\s]+/g)
    .map((item) => item.trim())
    .filter(Boolean);

export function BulkImportModule() {
    const { hasValidStepUp, stepUpToken } = useAdminAuth();
    const [rawIds, setRawIds] = useState('');
    const [status, setStatus] = useState('draft');
    const [note, setNote] = useState('');
    const [preview, setPreview] = useState<AdminBulkPreview | null>(null);

    const ids = useMemo(() => parseIds(rawIds), [rawIds]);

    const previewMutation = useMutation({
        mutationFn: () => getBulkUpdatePreview({
            ids,
            data: {
                status,
                note: note || undefined,
            },
        }),
        onSuccess: (data) => setPreview(data),
    });

    const executeMutation = useMutation({
        mutationFn: async () => {
            if (!hasValidStepUp || !stepUpToken) throw new Error('Step-up verification is required.');
            return runBulkUpdate(ids, { status, note: note || undefined }, stepUpToken);
        },
    });

    return (
        <>
            <AdminStepUpCard />
            <div className="admin-card">
                <h2>Bulk Import</h2>
                <p className="admin-muted">Bulk status changes with preview and controlled execution.</p>

                <textarea
                    value={rawIds}
                    onChange={(event) => setRawIds(event.target.value)}
                    placeholder="Paste announcement IDs (comma, space, or newline separated)"
                    style={{ width: '100%', minHeight: 160, border: '1px solid #d6dde3', borderRadius: 8, padding: 10 }}
                />
                <div style={{ marginTop: 8, display: 'grid', gap: 8, gridTemplateColumns: '1fr 2fr' }}>
                    <select value={status} onChange={(event) => setStatus(event.target.value)}>
                        <option value="draft">Draft</option>
                        <option value="pending">Pending</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                    </select>
                    <input
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Bulk operation note (optional)"
                    />
                </div>

                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="admin-btn"
                        disabled={ids.length === 0 || previewMutation.isPending}
                        onClick={() => previewMutation.mutate()}
                    >
                        {previewMutation.isPending ? 'Previewing...' : `Preview (${ids.length})`}
                    </button>
                    <button
                        type="button"
                        className="admin-btn primary"
                        disabled={ids.length === 0 || executeMutation.isPending || !hasValidStepUp}
                        onClick={() => executeMutation.mutate()}
                    >
                        {executeMutation.isPending ? 'Executing...' : `Execute (${ids.length})`}
                    </button>
                </div>

                {preview ? (
                    <div className="admin-card" style={{ marginTop: 12, background: '#f8fbfd' }}>
                        <div><strong>Total Targets:</strong> {preview.totalTargets}</div>
                        <div><strong>Missing IDs:</strong> {preview.missingIds.length}</div>
                        <div style={{ marginTop: 8 }}>
                            <strong>Affected by Status:</strong>
                            <ul style={{ marginTop: 4, marginBottom: 0 }}>
                                {Object.entries(preview.affectedByStatus).map(([key, value]) => (
                                    <li key={key}>{key}: {value}</li>
                                ))}
                            </ul>
                        </div>
                        {preview.warnings.length > 0 ? (
                            <ul style={{ marginTop: 8, marginBottom: 0 }}>
                                {preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                            </ul>
                        ) : null}
                    </div>
                ) : null}

                {previewMutation.isError ? (
                    <div style={{ color: '#b91c1c', marginTop: 10 }}>
                        {previewMutation.error instanceof Error ? previewMutation.error.message : 'Failed to preview bulk update.'}
                    </div>
                ) : null}
                {executeMutation.isError ? (
                    <div style={{ color: '#b91c1c', marginTop: 10 }}>
                        {executeMutation.error instanceof Error ? executeMutation.error.message : 'Bulk execution failed.'}
                    </div>
                ) : null}
                {executeMutation.isSuccess ? <div style={{ color: '#166534', marginTop: 10 }}>Bulk update completed.</div> : null}
            </div>
        </>
    );
}
