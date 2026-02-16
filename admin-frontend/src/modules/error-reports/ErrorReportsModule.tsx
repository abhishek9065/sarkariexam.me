import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getErrorReports, updateErrorReport } from '../../lib/api/client';
import type { AdminErrorReport } from '../../types';

export function ErrorReportsModule() {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<'all' | 'new' | 'triaged' | 'resolved'>('all');
    const [search, setSearch] = useState('');

    const query = useQuery({
        queryKey: ['error-reports', status, search],
        queryFn: () => getErrorReports({
            status,
            errorId: search || undefined,
            limit: 40,
        }),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, nextStatus }: { id: string; nextStatus: 'new' | 'triaged' | 'resolved' }) => updateErrorReport(id, {
            status: nextStatus,
            adminNote: `Updated via admin vNext at ${new Date().toISOString()}`,
        }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['error-reports'] });
        },
    });

    const rows = query.data ?? [];

    return (
        <div className="admin-card">
            <h2>Error Reports</h2>
            <p className="admin-muted">Triage client error reports and move items through resolution states.</p>

            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '2fr 1fr', marginBottom: 12 }}>
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by error ID..."
                />
                <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as 'all' | 'new' | 'triaged' | 'resolved')}
                >
                    <option value="all">All</option>
                    <option value="new">New</option>
                    <option value="triaged">Triaged</option>
                    <option value="resolved">Resolved</option>
                </select>
            </div>

            {query.isPending ? <div>Loading error reports...</div> : null}
            {query.error ? <div style={{ color: '#b91c1c' }}>Failed to load error reports.</div> : null}
            {rows.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Error ID</th>
                                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Message</th>
                                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Created</th>
                                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row: AdminErrorReport) => (
                                <tr key={row.id}>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                        <code>{row.errorId}</code>
                                    </td>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>{row.message}</td>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>{row.status}</td>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                        {new Date(row.createdAt).toLocaleString()}
                                    </td>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                        <select
                                            value={row.status}
                                            onChange={(event) => updateMutation.mutate({
                                                id: row.id,
                                                nextStatus: event.target.value as 'new' | 'triaged' | 'resolved',
                                            })}
                                        >
                                            <option value="new">New</option>
                                            <option value="triaged">Triaged</option>
                                            <option value="resolved">Resolved</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : null}
            {!query.isPending && !query.error && rows.length === 0 ? <div className="admin-muted">No reports found.</div> : null}
            {updateMutation.isError ? (
                <div style={{ color: '#b91c1c', marginTop: 10 }}>
                    {updateMutation.error instanceof Error ? updateMutation.error.message : 'Failed to update report.'}
                </div>
            ) : null}
        </div>
    );
}
