import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    getCommunityFlags,
    getCommunityForums,
    getCommunityGroups,
    getCommunityQa,
    resolveCommunityFlag,
} from '../../lib/api/client';
import type { CommunityFlag } from '../../types';

export function CommunityModerationModule() {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<'all' | 'open' | 'reviewed' | 'resolved'>('open');
    const [entityType, setEntityType] = useState<'all' | 'forum' | 'qa' | 'group'>('all');

    const flagsQuery = useQuery({
        queryKey: ['community-flags', status, entityType],
        queryFn: () => getCommunityFlags({ status, entityType, limit: 40 }),
    });

    const summaryQuery = useQuery({
        queryKey: ['community-summary-counts'],
        queryFn: async () => {
            const [forums, qa, groups] = await Promise.all([
                getCommunityForums(5),
                getCommunityQa(5),
                getCommunityGroups(5),
            ]);
            return {
                forums: forums.length,
                qa: qa.length,
                groups: groups.length,
            };
        },
    });

    const resolveMutation = useMutation({
        mutationFn: (id: string) => resolveCommunityFlag(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['community-flags'] });
        },
    });

    const rows = flagsQuery.data ?? [];

    return (
        <div className="admin-card">
            <h2>Community Moderation</h2>
            <p className="admin-muted">Review reports, track moderation load, and resolve community flags.</p>

            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr', marginBottom: 12 }}>
                <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as 'all' | 'open' | 'reviewed' | 'resolved')}
                >
                    <option value="all">All statuses</option>
                    <option value="open">Open</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="resolved">Resolved</option>
                </select>
                <select
                    value={entityType}
                    onChange={(event) => setEntityType(event.target.value as 'all' | 'forum' | 'qa' | 'group')}
                >
                    <option value="all">All entity types</option>
                    <option value="forum">Forum</option>
                    <option value="qa">Q&A</option>
                    <option value="group">Group</option>
                </select>
            </div>

            {summaryQuery.isSuccess ? (
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))', marginBottom: 12 }}>
                    <div className="admin-card" style={{ marginBottom: 0, background: '#f8fbfd' }}>
                        <div className="admin-muted" style={{ fontSize: 12 }}>Forums</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{summaryQuery.data.forums}</div>
                    </div>
                    <div className="admin-card" style={{ marginBottom: 0, background: '#f8fbfd' }}>
                        <div className="admin-muted" style={{ fontSize: 12 }}>Q&A</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{summaryQuery.data.qa}</div>
                    </div>
                    <div className="admin-card" style={{ marginBottom: 0, background: '#f8fbfd' }}>
                        <div className="admin-muted" style={{ fontSize: 12 }}>Groups</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{summaryQuery.data.groups}</div>
                    </div>
                </div>
            ) : null}

            {flagsQuery.isPending ? <div>Loading moderation flags...</div> : null}
            {flagsQuery.error ? <div style={{ color: '#b91c1c' }}>Failed to load flags.</div> : null}
            {rows.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Entity ID</th>
                                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Reason</th>
                                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Reporter</th>
                                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e2e8f0' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row: CommunityFlag) => (
                                <tr key={row.id}>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>{row.entityType}</td>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}><code>{row.entityId}</code></td>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>{row.reason}</td>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>{row.reporter || '-'}</td>
                                    <td style={{ borderBottom: '1px solid #edf2f7', padding: '8px 6px' }}>
                                        <button
                                            type="button"
                                            className="admin-btn"
                                            disabled={resolveMutation.isPending}
                                            onClick={() => resolveMutation.mutate(row.id)}
                                        >
                                            Resolve
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : null}
            {!flagsQuery.isPending && !flagsQuery.error && rows.length === 0 ? (
                <div className="admin-muted">No flags found for current filters.</div>
            ) : null}
            {resolveMutation.isError ? (
                <div style={{ color: '#b91c1c', marginTop: 10 }}>
                    {resolveMutation.error instanceof Error ? resolveMutation.error.message : 'Failed to resolve flag.'}
                </div>
            ) : null}
        </div>
    );
}
