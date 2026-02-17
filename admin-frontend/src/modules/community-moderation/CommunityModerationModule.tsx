import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { OpsCard, OpsEmptyState, OpsErrorState, OpsTable } from '../../components/ops';
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
        <OpsCard title="Community Moderation" description="Review reports, track moderation load, and resolve community flags.">
            <div className="ops-stack">
                <div className="ops-form-grid">
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
                    <div className="ops-count-grid">
                        <div className="ops-kpi-card">
                            <div className="ops-kpi-label">Forums</div>
                            <div className="ops-kpi-value">{summaryQuery.data.forums}</div>
                        </div>
                        <div className="ops-kpi-card">
                            <div className="ops-kpi-label">Q&A</div>
                            <div className="ops-kpi-value">{summaryQuery.data.qa}</div>
                        </div>
                        <div className="ops-kpi-card">
                            <div className="ops-kpi-label">Groups</div>
                            <div className="ops-kpi-value">{summaryQuery.data.groups}</div>
                        </div>
                    </div>
                ) : null}

                {flagsQuery.isPending ? <div className="admin-alert info">Loading moderation flags...</div> : null}
                {flagsQuery.error ? <OpsErrorState message="Failed to load moderation flags." /> : null}

                {rows.length > 0 ? (
                    <OpsTable
                        columns={[
                            { key: 'type', label: 'Type' },
                            { key: 'entity', label: 'Entity ID' },
                            { key: 'reason', label: 'Reason' },
                            { key: 'reporter', label: 'Reporter' },
                            { key: 'action', label: 'Action' },
                        ]}
                    >
                        {rows.map((row: CommunityFlag) => (
                            <tr key={row.id}>
                                <td>{row.entityType}</td>
                                <td><code>{row.entityId}</code></td>
                                <td>{row.reason}</td>
                                <td>{row.reporter || '-'}</td>
                                <td>
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
                    </OpsTable>
                ) : null}

                {!flagsQuery.isPending && !flagsQuery.error && rows.length === 0 ? (
                    <OpsEmptyState message="No flags found for current filters." />
                ) : null}

                {resolveMutation.isError ? (
                    <OpsErrorState message={resolveMutation.error instanceof Error ? resolveMutation.error.message : 'Failed to resolve flag.'} />
                ) : null}
            </div>
        </OpsCard>
    );
}
