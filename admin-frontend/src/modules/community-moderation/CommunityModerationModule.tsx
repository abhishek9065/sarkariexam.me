import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAdminPreferences } from '../../app/useAdminPreferences';
import { OpsBadge, OpsCard, OpsEmptyState, OpsErrorState, OpsTable } from '../../components/ops';
import { useAdminNotifications, useConfirmDialog } from '../../components/ops/legacy-port';
import {
    getCommunityFlags,
    getCommunityForums,
    getCommunityGroups,
    getCommunityQa,
    resolveCommunityFlag,
} from '../../lib/api/client';
import { trackAdminTelemetry } from '../../lib/adminTelemetry';
import type { CommunityFlag } from '../../types';

type CommunityTab = 'flags' | 'forums' | 'qa' | 'groups';

const statusTone = (status: string): 'neutral' | 'warning' | 'success' => {
    if (status === 'resolved') return 'success';
    if (status === 'reviewed') return 'warning';
    return 'neutral';
};

export function CommunityModerationModule() {
    const { formatDateTime } = useAdminPreferences();
    const { notifyError, notifyInfo, notifySuccess } = useAdminNotifications();
    const { confirm } = useConfirmDialog();
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<CommunityTab>('flags');
    const [status, setStatus] = useState<'all' | 'open' | 'reviewed' | 'resolved'>('open');
    const [entityType, setEntityType] = useState<'all' | 'forum' | 'qa' | 'group'>('all');

    const flagsQuery = useQuery({
        queryKey: ['community-flags', status, entityType],
        queryFn: () => getCommunityFlags({ status, entityType, limit: 60 }),
        enabled: tab === 'flags',
    });

    const forumsQuery = useQuery({
        queryKey: ['community-forums'],
        queryFn: () => getCommunityForums(40),
        enabled: tab === 'forums',
    });

    const qaQuery = useQuery({
        queryKey: ['community-qa'],
        queryFn: () => getCommunityQa(40),
        enabled: tab === 'qa',
    });

    const groupsQuery = useQuery({
        queryKey: ['community-groups'],
        queryFn: () => getCommunityGroups(40),
        enabled: tab === 'groups',
    });

    const summaryQuery = useQuery({
        queryKey: ['community-summary-counts'],
        queryFn: async () => {
            const [forums, qa, groups] = await Promise.all([
                getCommunityForums(5),
                getCommunityQa(5),
                getCommunityGroups(5),
            ]);
            return { forums: forums.length, qa: qa.length, groups: groups.length };
        },
    });

    const resolveMutation = useMutation({
        mutationFn: (id: string) => resolveCommunityFlag(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['community-flags'] });
        },
    });

    const rows = flagsQuery.data ?? [];

    useEffect(() => {
        void trackAdminTelemetry('admin_module_viewed', { module: 'community', tab });
    }, [tab]);

    return (
        <OpsCard title="Community Moderation" description="Triage community flags and review content surfaces with fast moderation actions.">
            <div className="ops-stack">
                <div className="ops-actions">
                    <button type="button" className={`admin-btn ${tab === 'flags' ? 'primary' : 'subtle'}`} onClick={() => setTab('flags')}>
                        Flags
                    </button>
                    <button type="button" className={`admin-btn ${tab === 'forums' ? 'primary' : 'subtle'}`} onClick={() => setTab('forums')}>
                        Forums
                    </button>
                    <button type="button" className={`admin-btn ${tab === 'qa' ? 'primary' : 'subtle'}`} onClick={() => setTab('qa')}>
                        Q&A
                    </button>
                    <button type="button" className={`admin-btn ${tab === 'groups' ? 'primary' : 'subtle'}`} onClick={() => setTab('groups')}>
                        Groups
                    </button>
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

                {tab === 'flags' ? (
                    <>
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

                        {flagsQuery.isPending ? <div className="admin-alert info">Loading moderation flags...</div> : null}
                        {flagsQuery.error ? <OpsErrorState message="Failed to load moderation flags." /> : null}

                        {rows.length > 0 ? (
                            <OpsTable
                                columns={[
                                    { key: 'type', label: 'Type' },
                                    { key: 'entity', label: 'Entity ID' },
                                    { key: 'reason', label: 'Reason' },
                                    { key: 'reporter', label: 'Reporter' },
                                    { key: 'status', label: 'Status' },
                                    { key: 'created', label: 'Created' },
                                    { key: 'action', label: 'Action' },
                                ]}
                            >
                                {rows.map((row: CommunityFlag) => (
                                    <tr key={row.id}>
                                        <td>{row.entityType}</td>
                                        <td><code>{row.entityId}</code></td>
                                        <td>{row.reason}</td>
                                        <td>{row.reporter || '-'}</td>
                                        <td><OpsBadge tone={statusTone(row.status)}>{row.status}</OpsBadge></td>
                                        <td>{formatDateTime(row.createdAt)}</td>
                                        <td>
                                            <button
                                                type="button"
                                                className="admin-btn"
                                                disabled={resolveMutation.isPending}
                                                onClick={async () => {
                                                    const allowed = await confirm({
                                                        title: 'Resolve this moderation flag?',
                                                        message: 'Resolved flags are removed from active moderation queue.',
                                                        confirmText: 'Resolve',
                                                        cancelText: 'Cancel',
                                                        variant: 'warning',
                                                    });
                                                    if (!allowed) return;
                                                    resolveMutation.mutate(row.id, {
                                                        onSuccess: () => {
                                                            notifySuccess('Resolved', 'Flag removed from active queue.');
                                                            void trackAdminTelemetry('admin_triage_action', {
                                                                module: 'community',
                                                                action: 'resolve_flag',
                                                                entityType: row.entityType,
                                                            });
                                                        },
                                                        onError: (error) => {
                                                            notifyError('Resolve failed', error instanceof Error ? error.message : 'Failed to resolve flag.');
                                                        },
                                                    });
                                                }}
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
                    </>
                ) : null}

                {tab === 'forums' ? (
                    <>
                        {forumsQuery.isPending ? <div className="admin-alert info">Loading forums...</div> : null}
                        {forumsQuery.error ? <OpsErrorState message="Failed to load forums." /> : null}
                        {forumsQuery.data && forumsQuery.data.length > 0 ? (
                            <OpsTable
                                columns={[
                                    { key: 'title', label: 'Title' },
                                    { key: 'category', label: 'Category' },
                                    { key: 'author', label: 'Author' },
                                    { key: 'created', label: 'Created' },
                                ]}
                            >
                                {forumsQuery.data.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.title}</td>
                                        <td>{item.category}</td>
                                        <td>{item.author}</td>
                                        <td>{formatDateTime(item.createdAt)}</td>
                                    </tr>
                                ))}
                            </OpsTable>
                        ) : null}
                        {!forumsQuery.isPending && !forumsQuery.error && (forumsQuery.data?.length ?? 0) === 0 ? (
                            <OpsEmptyState message="No forum discussions found." />
                        ) : null}
                    </>
                ) : null}

                {tab === 'qa' ? (
                    <>
                        {qaQuery.isPending ? <div className="admin-alert info">Loading Q&A...</div> : null}
                        {qaQuery.error ? <OpsErrorState message="Failed to load Q&A items." /> : null}
                        {qaQuery.data && qaQuery.data.length > 0 ? (
                            <OpsTable
                                columns={[
                                    { key: 'question', label: 'Question' },
                                    { key: 'author', label: 'Author' },
                                    { key: 'answered', label: 'Answered By' },
                                    { key: 'created', label: 'Created' },
                                ]}
                            >
                                {qaQuery.data.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.question}</td>
                                        <td>{item.author}</td>
                                        <td>{item.answeredBy || '-'}</td>
                                        <td>{formatDateTime(item.createdAt)}</td>
                                    </tr>
                                ))}
                            </OpsTable>
                        ) : null}
                        {!qaQuery.isPending && !qaQuery.error && (qaQuery.data?.length ?? 0) === 0 ? (
                            <OpsEmptyState message="No Q&A items found." />
                        ) : null}
                    </>
                ) : null}

                {tab === 'groups' ? (
                    <>
                        {groupsQuery.isPending ? <div className="admin-alert info">Loading study groups...</div> : null}
                        {groupsQuery.error ? <OpsErrorState message="Failed to load study groups." /> : null}
                        {groupsQuery.data && groupsQuery.data.length > 0 ? (
                            <OpsTable
                                columns={[
                                    { key: 'name', label: 'Name' },
                                    { key: 'topic', label: 'Topic' },
                                    { key: 'language', label: 'Language' },
                                    { key: 'created', label: 'Created' },
                                ]}
                            >
                                {groupsQuery.data.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.name}</td>
                                        <td>{item.topic}</td>
                                        <td>{item.language}</td>
                                        <td>{formatDateTime(item.createdAt)}</td>
                                    </tr>
                                ))}
                            </OpsTable>
                        ) : null}
                        {!groupsQuery.isPending && !groupsQuery.error && (groupsQuery.data?.length ?? 0) === 0 ? (
                            <OpsEmptyState message="No study groups found." />
                        ) : null}
                    </>
                ) : null}

                {resolveMutation.isError ? (
                    <OpsErrorState message={resolveMutation.error instanceof Error ? resolveMutation.error.message : 'Failed to resolve flag.'} />
                ) : null}
                {resolveMutation.isSuccess ? <div className="ops-inline-muted">Moderation queue updated.</div> : null}

                <div className="ops-inline-muted">
                    Use this workspace for fast triage; deeper content edits continue in announcements and review modules.
                </div>

                <button
                    type="button"
                    className="admin-btn ghost"
                    onClick={() => notifyInfo('Tip', 'Use status=open + entity filter for fastest moderation sweeps.')}
                >
                    Show Triage Tip
                </button>
            </div>
        </OpsCard>
    );
}
