import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAdminAuth } from '../../app/useAdminAuth';
import { AdminStepUpCard } from '../../components/AdminStepUpCard';
import { OpsCard, OpsEmptyState, OpsErrorState, OpsTable, OpsToolbar } from '../../components/ops';
import { useAdminNotifications, useConfirmDialog } from '../../components/ops/legacy-port';
import {
    getAdminAnnouncements,
    getReviewPreview,
    runBulkApprove,
    runBulkReject,
    runBulkUpdate,
} from '../../lib/api/client';
import { trackAdminTelemetry } from '../../lib/adminTelemetry';
import type { AdminAnnouncementListItem, AdminReviewPreview } from '../../types';

export function ReviewModule() {
    const queryClient = useQueryClient();
    const { hasValidStepUp, stepUpToken } = useAdminAuth();
    const { notifyError, notifyInfo, notifySuccess } = useAdminNotifications();
    const { confirm } = useConfirmDialog();
    const [search, setSearch] = useState('');
    const [action, setAction] = useState<'approve' | 'reject' | 'schedule'>('approve');
    const [scheduleAt, setScheduleAt] = useState('');
    const [note, setNote] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [preview, setPreview] = useState<AdminReviewPreview | null>(null);

    const query = useQuery({
        queryKey: ['review-announcements', search],
        queryFn: () => getAdminAnnouncements({ limit: 120, status: 'pending', search }),
    });

    const rows = useMemo(() => query.data ?? [], [query.data]);

    const toggleSelect = (id: string) => {
        setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    };

    const allSelected = useMemo(() => rows.length > 0 && rows.every((item) => selectedIds.includes(item.id || item._id || '')), [rows, selectedIds]);

    const previewMutation = useMutation({
        mutationFn: () => getReviewPreview({
            ids: selectedIds,
            action,
            note: note || undefined,
            scheduleAt: action === 'schedule' ? (scheduleAt || undefined) : undefined,
        }),
        onSuccess: (data) => {
            setPreview(data);
            notifyInfo('Preview generated', `${data.eligibleIds.length} eligible, ${data.blockedIds.length} blocked.`);
            void trackAdminTelemetry('admin_bulk_preview_opened', {
                module: 'review',
                action,
                selected: selectedIds.length,
                eligible: data.eligibleIds.length,
                blocked: data.blockedIds.length,
            });
        },
    });

    const executeMutation = useMutation({
        mutationFn: async () => {
            if (!hasValidStepUp || !stepUpToken) {
                throw new Error('Step-up verification is required.');
            }
            if (action === 'approve') {
                return runBulkApprove(selectedIds, note || undefined, stepUpToken);
            }
            if (action === 'reject') {
                return runBulkReject(selectedIds, note || undefined, stepUpToken);
            }
            if (!scheduleAt) {
                throw new Error('Schedule time is required for schedule action.');
            }
            return runBulkUpdate(selectedIds, {
                status: 'scheduled',
                publishAt: new Date(scheduleAt).toISOString(),
                note: note || undefined,
            }, stepUpToken);
        },
        onSuccess: async () => {
            setSelectedIds([]);
            setPreview(null);
            await queryClient.invalidateQueries({ queryKey: ['review-announcements'] });
            notifySuccess('Review action applied', `Executed ${action} for selected announcements.`);
            void trackAdminTelemetry('admin_review_decision_submitted', {
                action,
                selected: selectedIds.length,
            });
        },
    });

    return (
        <>
            <AdminStepUpCard />
            <OpsCard title="Review" description="Review queue with preview-first decisions and controlled execution.">
                <OpsToolbar
                    controls={
                        <>
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search pending items"
                            />
                            <select
                                value={action}
                                onChange={(event) => setAction(event.target.value as 'approve' | 'reject' | 'schedule')}
                            >
                                <option value="approve">Approve</option>
                                <option value="reject">Reject</option>
                                <option value="schedule">Schedule</option>
                            </select>
                            <input
                                type={action === 'schedule' ? 'datetime-local' : 'text'}
                                value={action === 'schedule' ? scheduleAt : note}
                                onChange={(event) => {
                                    if (action === 'schedule') setScheduleAt(event.target.value);
                                    else setNote(event.target.value);
                                }}
                                placeholder={action === 'schedule' ? 'Schedule time' : 'Note (optional)'}
                            />
                        </>
                    }
                />

                {action === 'schedule' ? (
                    <input
                        type="text"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Schedule note (optional)"
                    />
                ) : null}

                {query.isPending ? <div className="admin-alert info">Loading review queue...</div> : null}
                {query.error ? <OpsErrorState message="Failed to load review queue." /> : null}

                {rows.length > 0 ? (
                    <OpsTable
                        columns={[
                            { key: 'select', label: 'Select' },
                            { key: 'title', label: 'Title' },
                            { key: 'status', label: 'Status' },
                            { key: 'type', label: 'Type' },
                        ]}
                    >
                        <tr>
                            <td>
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={() => {
                                        if (allSelected) {
                                            setSelectedIds([]);
                                        } else {
                                            setSelectedIds(rows.map((item) => item.id || item._id || '').filter(Boolean));
                                        }
                                    }}
                                />
                            </td>
                            <td colSpan={3} className="ops-inline-muted">Select all rows</td>
                        </tr>
                        {rows.map((item: AdminAnnouncementListItem) => {
                            const id = item.id || item._id || '';
                            return (
                                <tr key={id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(id)}
                                            onChange={() => toggleSelect(id)}
                                        />
                                    </td>
                                    <td>{item.title || 'Untitled'}</td>
                                    <td>{item.status || '-'}</td>
                                    <td>{item.type || '-'}</td>
                                </tr>
                            );
                        })}
                    </OpsTable>
                ) : null}

                {!query.isPending && !query.error && rows.length === 0 ? (
                    <OpsEmptyState message="No pending announcements found." />
                ) : null}

                <div className="ops-actions ops-sticky-actions">
                    <button
                        type="button"
                        className="admin-btn"
                        disabled={selectedIds.length === 0 || previewMutation.isPending}
                        onClick={() => previewMutation.mutate()}
                    >
                        {previewMutation.isPending ? 'Previewing...' : 'Preview Impact'}
                    </button>
                    <button
                        type="button"
                        className="admin-btn primary"
                        disabled={selectedIds.length === 0 || executeMutation.isPending || !hasValidStepUp}
                        onClick={async () => {
                            const approved = await confirm({
                                title: 'Apply review action',
                                message: `Run ${action} for ${selectedIds.length} selected announcements?`,
                                confirmText: 'Execute action',
                                cancelText: 'Cancel',
                                variant: action === 'reject' ? 'warning' : 'info',
                            });
                            if (!approved) return;
                            executeMutation.mutate(undefined, {
                                onError: (error) => {
                                    notifyError('Execution failed', error instanceof Error ? error.message : 'Failed to execute action.');
                                },
                            });
                        }}
                    >
                        {executeMutation.isPending ? 'Executing...' : 'Execute Action'}
                    </button>
                </div>

                {preview ? (
                    <div className="ops-card muted">
                        <div><strong>Eligible:</strong> {preview.eligibleIds.length}</div>
                        <div><strong>Blocked:</strong> {preview.blockedIds.length}</div>
                        {preview.warnings.length > 0 ? (
                            <ul className="ops-list">
                                {preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                            </ul>
                        ) : (
                            <div className="ops-inline-muted">No warnings.</div>
                        )}
                    </div>
                ) : null}

                {executeMutation.isError ? (
                    <OpsErrorState message={executeMutation.error instanceof Error ? executeMutation.error.message : 'Failed to execute action.'} />
                ) : null}
                {executeMutation.isSuccess ? <div className="ops-success">Review action applied.</div> : null}
            </OpsCard>
        </>
    );
}
