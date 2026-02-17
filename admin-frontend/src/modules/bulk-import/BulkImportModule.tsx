import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { useAdminAuth } from '../../app/useAdminAuth';
import { AdminStepUpCard } from '../../components/AdminStepUpCard';
import { OpsCard, OpsErrorState } from '../../components/ops';
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
            <OpsCard title="Bulk Import" description="Bulk status changes with preview and controlled execution.">
                <div className="ops-stack">
                    <textarea
                        value={rawIds}
                        onChange={(event) => setRawIds(event.target.value)}
                        placeholder="Paste announcement IDs (comma, space, or newline separated)"
                        className="ops-textarea"
                    />
                    <div className="ops-form-grid">
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

                    <div className="ops-actions">
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
                        <div className="ops-card muted">
                            <div className="ops-stack">
                                <div><strong>Total Targets:</strong> {preview.totalTargets}</div>
                                <div><strong>Missing IDs:</strong> {preview.missingIds.length}</div>
                                <div>
                                    <strong>Affected by Status:</strong>
                                    <ul className="ops-list">
                                        {Object.entries(preview.affectedByStatus).map(([key, value]) => (
                                            <li key={key}>{key}: {value}</li>
                                        ))}
                                    </ul>
                                </div>
                                {preview.warnings.length > 0 ? (
                                    <ul className="ops-list">
                                        {preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                                    </ul>
                                ) : null}
                            </div>
                        </div>
                    ) : null}

                    {previewMutation.isError ? (
                        <OpsErrorState message={previewMutation.error instanceof Error ? previewMutation.error.message : 'Failed to preview bulk update.'} />
                    ) : null}
                    {executeMutation.isError ? (
                        <OpsErrorState message={executeMutation.error instanceof Error ? executeMutation.error.message : 'Bulk execution failed.'} />
                    ) : null}
                    {executeMutation.isSuccess ? <div className="ops-success">Bulk update completed.</div> : null}
                </div>
            </OpsCard>
        </>
    );
}
