import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAdminAuth } from '../../app/useAdminAuth';
import { AdminStepUpCard } from '../../components/AdminStepUpCard';
import {
    getAdminAnnouncements,
    getReviewPreview,
    runBulkApprove,
    runBulkReject,
    runBulkUpdate,
} from '../../lib/api/client';
import type { AdminAnnouncementListItem, AdminReviewPreview } from '../../types';

export function ReviewModule() {
    const queryClient = useQueryClient();
    const { hasValidStepUp, stepUpToken } = useAdminAuth();
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
        onSuccess: (data) => setPreview(data),
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
        },
    });

    return (
        <>
            <AdminStepUpCard />
            <div className="admin-card">
                <h2>Review</h2>
                <p className="admin-muted">Review queue with preview-first decisions and controlled execution.</p>

                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '2fr 1fr 1fr', marginBottom: 12 }}>
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search pending items..."
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
                </div>

                {action === 'schedule' ? (
                    <div style={{ marginBottom: 10 }}>
                        <input
                            type="text"
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            placeholder="Schedule note (optional)"
                        />
                    </div>
                ) : null}

                {query.isPending ? <div>Loading review queue...</div> : null}
                {query.error ? <div style={{ color: '#b91c1c' }}>Failed to load review queue.</div> : null}
                {rows.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>
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
                                    </th>
                                    <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Title</th>
                                    <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                                    <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((item: AdminAnnouncementListItem) => {
                                    const id = item.id || item._id || '';
                                    return (
                                        <tr key={id}>
                                            <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(id)}
                                                    onChange={() => toggleSelect(id)}
                                                />
                                            </td>
                                            <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>{item.title || 'Untitled'}</td>
                                            <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>{item.status || '-'}</td>
                                            <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>{item.type || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : null}

                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                        onClick={() => executeMutation.mutate()}
                    >
                        {executeMutation.isPending ? 'Executing...' : 'Execute Action'}
                    </button>
                </div>

                {preview ? (
                    <div className="admin-card" style={{ marginTop: 12, background: '#f8fbfd' }}>
                        <div><strong>Eligible:</strong> {preview.eligibleIds.length}</div>
                        <div><strong>Blocked:</strong> {preview.blockedIds.length}</div>
                        {preview.warnings.length > 0 ? (
                            <ul style={{ marginTop: 8, marginBottom: 0 }}>
                                {preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                            </ul>
                        ) : (
                            <div className="admin-muted" style={{ marginTop: 8 }}>No warnings.</div>
                        )}
                    </div>
                ) : null}

                {executeMutation.isError ? (
                    <div style={{ color: '#b91c1c', marginTop: 10 }}>
                        {executeMutation.error instanceof Error ? executeMutation.error.message : 'Failed to execute action.'}
                    </div>
                ) : null}
                {executeMutation.isSuccess ? <div style={{ color: '#166534', marginTop: 10 }}>Review action applied.</div> : null}
            </div>
        </>
    );
}
