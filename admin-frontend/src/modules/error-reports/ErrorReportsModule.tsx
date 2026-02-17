import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { OpsCard, OpsEmptyState, OpsErrorState, OpsTable } from '../../components/ops';
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
        <OpsCard title="Error Reports" description="Triage client error reports and move items through resolution states.">
            <div className="ops-stack">
                <div className="ops-form-grid">
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by error ID"
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

                {query.isPending ? <div className="admin-alert info">Loading error reports...</div> : null}
                {query.error ? <OpsErrorState message="Failed to load error reports." /> : null}

                {rows.length > 0 ? (
                    <OpsTable
                        columns={[
                            { key: 'id', label: 'Error ID' },
                            { key: 'message', label: 'Message' },
                            { key: 'status', label: 'Status' },
                            { key: 'created', label: 'Created' },
                            { key: 'action', label: 'Action' },
                        ]}
                    >
                        {rows.map((row: AdminErrorReport) => (
                            <tr key={row.id}>
                                <td><code>{row.errorId}</code></td>
                                <td>{row.message}</td>
                                <td>{row.status}</td>
                                <td>{new Date(row.createdAt).toLocaleString()}</td>
                                <td>
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
                    </OpsTable>
                ) : null}

                {!query.isPending && !query.error && rows.length === 0 ? <OpsEmptyState message="No reports found." /> : null}

                {updateMutation.isError ? (
                    <OpsErrorState message={updateMutation.error instanceof Error ? updateMutation.error.message : 'Failed to update report.'} />
                ) : null}
            </div>
        </OpsCard>
    );
}
