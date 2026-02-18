import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { useAdminAuth } from '../../app/useAdminAuth';
import { AdminStepUpCard } from '../../components/AdminStepUpCard';
import { OpsCard, OpsErrorState, OpsToolbar } from '../../components/ops';
import { useAdminNotifications, useConfirmDialog } from '../../components/ops/legacy-port';
import { getBulkUpdatePreview, runBulkUpdate } from '../../lib/api/client';
import { trackAdminTelemetry } from '../../lib/adminTelemetry';
import type { AdminBulkPreview } from '../../types';

const parseIds = (raw: string): string[] => raw
    .split(/[\n,\s]+/g)
    .map((item) => item.trim())
    .filter(Boolean);

export function BulkImportModule() {
    const { hasValidStepUp, stepUpToken } = useAdminAuth();
    const { notifyError, notifyInfo, notifySuccess } = useAdminNotifications();
    const { confirm } = useConfirmDialog();

    const [rawIds, setRawIds] = useState('');
    const [status, setStatus] = useState('draft');
    const [note, setNote] = useState('');
    const [preview, setPreview] = useState<AdminBulkPreview | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    const ids = useMemo(() => parseIds(rawIds), [rawIds]);

    const previewMutation = useMutation({
        mutationFn: () => getBulkUpdatePreview({
            ids,
            data: {
                status,
                note: note || undefined,
            },
        }),
        onSuccess: (data) => {
            setPreview(data);
            setPreviewOpen(true);
            notifyInfo('Bulk preview ready', `${data.totalTargets} targets loaded for review.`);
            void trackAdminTelemetry('admin_bulk_preview_opened', {
                module: 'bulk',
                selected: ids.length,
                totalTargets: data.totalTargets,
                missing: data.missingIds.length,
            });
        },
    });

    const executeMutation = useMutation({
        mutationFn: async () => {
            if (!hasValidStepUp || !stepUpToken) throw new Error('Step-up verification is required.');
            return runBulkUpdate(ids, { status, note: note || undefined }, stepUpToken);
        },
        onSuccess: () => {
            notifySuccess('Bulk update completed', `Applied bulk status change to ${ids.length} selected IDs.`);
            setPreviewOpen(false);
            setPreview(null);
            setRawIds('');
            void trackAdminTelemetry('admin_review_decision_submitted', {
                module: 'bulk',
                action: 'bulk_update',
                selected: ids.length,
            });
        },
    });

    return (
        <>
            <AdminStepUpCard />
            <OpsCard title="Bulk Import" description="Bulk status changes with mandatory preview and controlled execution.">
                <div className="ops-stack">
                    <OpsToolbar
                        compact
                        controls={
                            <>
                                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                                    <option value="draft">Status: Draft</option>
                                    <option value="pending">Status: Pending</option>
                                    <option value="scheduled">Status: Scheduled</option>
                                    <option value="published">Status: Published</option>
                                    <option value="archived">Status: Archived</option>
                                </select>
                                <input
                                    value={note}
                                    onChange={(event) => setNote(event.target.value)}
                                    placeholder="Bulk operation note (optional)"
                                />
                            </>
                        }
                        actions={
                            <>
                                <span className="ops-inline-muted">{ids.length} IDs parsed</span>
                                <button
                                    type="button"
                                    className="admin-btn small subtle"
                                    onClick={() => {
                                        setRawIds('');
                                        setNote('');
                                        setStatus('draft');
                                        setPreview(null);
                                        setPreviewOpen(false);
                                        notifyInfo('Bulk form cleared', 'Cleared IDs and reset bulk action form.');
                                    }}
                                >
                                    Clear all
                                </button>
                            </>
                        }
                    />
                    <textarea
                        value={rawIds}
                        onChange={(event) => setRawIds(event.target.value)}
                        placeholder="Paste announcement IDs (comma, space, or newline separated)"
                        className="ops-textarea"
                    />

                    <div className="ops-actions ops-sticky-actions">
                        <button
                            type="button"
                            className="admin-btn"
                            disabled={ids.length === 0 || previewMutation.isPending}
                            onClick={() => previewMutation.mutate()}
                        >
                            {previewMutation.isPending ? 'Previewing...' : `Preview (${ids.length})`}
                        </button>
                        <span className="ops-inline-muted">Preview before apply is mandatory.</span>
                    </div>

                    {previewMutation.isError ? (
                        <OpsErrorState message={previewMutation.error instanceof Error ? previewMutation.error.message : 'Failed to preview bulk update.'} />
                    ) : null}
                    {executeMutation.isError ? (
                        <OpsErrorState message={executeMutation.error instanceof Error ? executeMutation.error.message : 'Bulk execution failed.'} />
                    ) : null}
                    {executeMutation.isSuccess ? <div className="ops-success">Bulk update completed.</div> : null}
                </div>
            </OpsCard>

            {preview && previewOpen ? (
                <div className="ops-modal-overlay" role="presentation" onClick={() => setPreviewOpen(false)}>
                    <div className="ops-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-preview-title" onClick={(event) => event.stopPropagation()}>
                        <div className="ops-stack">
                            <div className="ops-card-header">
                                <div>
                                    <h3 id="bulk-preview-title" className="ops-card-title">Bulk impact preview</h3>
                                    <p className="ops-card-description">Review impact before applying this bulk update.</p>
                                </div>
                            </div>

                            <div className="ops-count-grid">
                                <div className="ops-kpi-card">
                                    <div className="ops-kpi-label">Total targets</div>
                                    <div className="ops-kpi-value">{preview.totalTargets}</div>
                                </div>
                                <div className="ops-kpi-card">
                                    <div className="ops-kpi-label">Missing IDs</div>
                                    <div className="ops-kpi-value">{preview.missingIds.length}</div>
                                </div>
                                <div className="ops-kpi-card">
                                    <div className="ops-kpi-label">Warnings</div>
                                    <div className="ops-kpi-value">{preview.warnings.length}</div>
                                </div>
                            </div>

                            <div>
                                <strong>Affected by status:</strong>
                                <ul className="ops-list">
                                    {Object.entries(preview.affectedByStatus).map(([key, value]) => (
                                        <li key={key}>{key}: {value}</li>
                                    ))}
                                </ul>
                            </div>

                            {preview.warnings.length > 0 ? (
                                <div>
                                    <strong>Warnings:</strong>
                                    <ul className="ops-list">
                                        {preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                                    </ul>
                                </div>
                            ) : null}

                            <div className="ops-actions">
                                <button type="button" className="admin-btn" onClick={() => setPreviewOpen(false)}>Close</button>
                                <button
                                    type="button"
                                    className="admin-btn primary"
                                    disabled={executeMutation.isPending || !hasValidStepUp}
                                    onClick={async () => {
                                        const approved = await confirm({
                                            title: 'Apply bulk update',
                                            message: `Apply ${status} to ${ids.length} announcement IDs now?`,
                                            confirmText: 'Apply update',
                                            cancelText: 'Cancel',
                                            variant: 'warning',
                                        });
                                        if (!approved) return;
                                        executeMutation.mutate(undefined, {
                                            onError: (error) => notifyError('Bulk update failed', error instanceof Error ? error.message : 'Bulk execution failed.'),
                                        });
                                    }}
                                >
                                    {executeMutation.isPending ? 'Applying...' : 'Apply bulk update'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
