import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAdminAuth } from '../../app/useAdminAuth';
import { useAdminPreferences } from '../../app/useAdminPreferences';
import { OpsBadge, OpsEmptyState, OpsErrorState, OpsTable, OpsToolbar } from '../../components/ops';
import { useAdminNotifications } from '../../components/ops/legacy-port';
import { ModuleScaffold, RowActionMenu } from '../../components/workspace';
import { getAdminAuditIntegrity, getAdminAuditLogs, getAdminOpsWorkspace, rebuildAdminAuditLedger } from '../../lib/api/client';
import { trackAdminTelemetry } from '../../lib/adminTelemetry';
import type { AdminAuditLog } from '../../types';

const actionTone = (action?: string): 'neutral' | 'success' | 'warning' | 'danger' => {
    const normalized = String(action || '').toLowerCase();
    if (normalized.includes('delete') || normalized.includes('reject') || normalized.includes('blocked')) return 'danger';
    if (normalized.includes('approve') || normalized.includes('publish')) return 'success';
    if (normalized.includes('step_up') || normalized.includes('terminate') || normalized.includes('password') || normalized.includes('rebuild')) return 'warning';
    return 'neutral';
};

const asMetadata = (row: AdminAuditLog): Record<string, unknown> =>
    row.metadata && typeof row.metadata === 'object' ? row.metadata : {};

const readString = (value: unknown): string => typeof value === 'string' && value.trim() ? value.trim() : '';

const extractActorLabel = (row: AdminAuditLog): string => {
    const metadata = asMetadata(row);
    return readString(row.actorEmail)
        || readString(metadata.actorEmail)
        || readString(metadata.actor)
        || readString(metadata.requestedBy)
        || readString(metadata.approvedBy)
        || readString(metadata.rejectedBy)
        || readString(row.userId)
        || readString(row.actorId)
        || 'Unknown actor';
};

const extractTargetId = (row: AdminAuditLog): string =>
    readString(row.announcementId) || readString(asMetadata(row).announcementId);

const extractTargetLabel = (row: AdminAuditLog): string => {
    const metadata = asMetadata(row);
    return readString(row.title)
        || readString(metadata.title)
        || readString(metadata.label)
        || readString(metadata.name)
        || readString(metadata.targetUserId)
        || extractTargetId(row)
        || '-';
};

const extractRequestId = (row: AdminAuditLog): string => readString(asMetadata(row).requestId);
const extractEndpoint = (row: AdminAuditLog): string => readString(asMetadata(row).endpoint);
const extractMethod = (row: AdminAuditLog): string => readString(asMetadata(row).method);

const extractChangedFields = (row: AdminAuditLog): string[] => {
    const metadata = asMetadata(row);
    if (Array.isArray(metadata.fields)) {
        return metadata.fields
            .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            .slice(0, 6);
    }
    return [];
};

const extractDiffSummary = (row: AdminAuditLog): string | null => {
    const metadata = asMetadata(row);
    const changedFields = extractChangedFields(row);
    if (changedFields.length > 0) {
        return `Changed: ${changedFields.join(', ')}`;
    }

    const previousStatus = readString(metadata.previousStatus);
    const newStatus = readString(metadata.newStatus);
    if (previousStatus || newStatus) {
        return `Status: ${previousStatus || '-'} -> ${newStatus || '-'}`;
    }

    const permissions = Array.isArray(metadata.permissions)
        ? metadata.permissions.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [];
    if (permissions.length > 0) {
        return `Permissions: ${permissions.join(', ')}`;
    }

    return null;
};

export function AuditModule() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { formatDateTime } = useAdminPreferences();
    const { stepUpToken, hasValidStepUp } = useAdminAuth();
    const { notifyError, notifySuccess } = useAdminNotifications();
    const queryClient = useQueryClient();
    const [action, setAction] = useState('');
    const [actorSearch, setActorSearch] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');

    useEffect(() => {
        setAction(searchParams.get('action') || '');
        setActorSearch(searchParams.get('actor') || '');
        setStart(searchParams.get('start') || '');
        setEnd(searchParams.get('end') || '');
    }, [searchParams]);

    const usesWorkspaceFeed = !action.trim() && !actorSearch.trim() && !start && !end;

    const workspaceQuery = useQuery({
        queryKey: ['admin-ops-workspace'],
        queryFn: () => getAdminOpsWorkspace(),
    });

    const rebuildMutation = useMutation({
        mutationFn: () => rebuildAdminAuditLedger(stepUpToken ?? ''),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-audit-integrity'] });
            notifySuccess('Ledger repaired', 'Audit ledger integrity has been rebuilt.');
        },
        onError: (error) => {
            notifyError('Repair failed', error instanceof Error ? error.message : 'Failed to rebuild audit ledger.');
        },
    });

    const query = useQuery({
        queryKey: ['admin-audit-logs', action, actorSearch, start, end],
        queryFn: () => getAdminAuditLogs({
            limit: 80,
            offset: 0,
            action: action || undefined,
            userId: actorSearch || undefined,
            start: start || undefined,
            end: end || undefined,
        }),
        enabled: !usesWorkspaceFeed,
    });

    const integrityQuery = useQuery({
        queryKey: ['admin-audit-integrity'],
        queryFn: () => getAdminAuditIntegrity(300),
        refetchInterval: 5 * 60 * 1000,
    });

    const rows = useMemo(() => (usesWorkspaceFeed ? workspaceQuery.data?.audit ?? [] : query.data ?? []), [query.data, usesWorkspaceFeed, workspaceQuery.data]);
    const integrityData = integrityQuery.data;
    const integrityStatus = integrityData
        ? (integrityData.valid === true ? 'verified' : integrityData.valid === false ? 'invalid' : String(integrityData.status ?? integrityData.state ?? 'unknown'))
        : 'unknown';
    const integrityTone = integrityStatus === 'verified' || integrityStatus === 'valid'
        ? 'success'
        : integrityStatus === 'unknown'
            ? 'warning'
            : 'danger';
    const showPrimaryLoading = usesWorkspaceFeed ? workspaceQuery.isPending : query.isPending;
    const showPrimaryError = usesWorkspaceFeed ? workspaceQuery.error : query.error;

    const actorChips = useMemo(() => {
        const unique = new Map<string, number>();
        for (const row of rows) {
            const actor = extractActorLabel(row);
            if (!actor || actor === 'Unknown actor') continue;
            unique.set(actor, (unique.get(actor) ?? 0) + 1);
        }
        return [...unique.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([label, count]) => ({ label, count }));
    }, [rows]);

    const changedRowCount = useMemo(() => rows.filter((row) => extractChangedFields(row).length > 0).length, [rows]);
    const uniqueActorCount = useMemo(() => new Set(rows.map((row) => extractActorLabel(row))).size, [rows]);

    useEffect(() => {
        void trackAdminTelemetry('admin_module_viewed', {
            module: 'audit',
            count: rows.length,
            integrity: integrityStatus,
            actorFilter: actorSearch || 'all',
        });
    }, [actorSearch, integrityStatus, rows.length]);

    return (
        <ModuleScaffold
            eyebrow="Governance"
            title="Audit"
            description="Investigation-grade audit timeline with actor filters, record drill-ins, and immutable ledger checks."
            metrics={[
                { key: 'audit-loaded', label: 'Loaded Entries', value: rows.length },
                { key: 'audit-actors', label: 'Unique Actors', value: uniqueActorCount, tone: uniqueActorCount > 0 ? 'info' : 'neutral' },
                { key: 'audit-changes', label: 'Changed Records', value: changedRowCount, tone: changedRowCount > 0 ? 'warning' : 'neutral' },
                { key: 'audit-integrity', label: 'Ledger Integrity', value: integrityStatus, tone: integrityTone },
            ]}
        >
            <div className="ops-stack">
                <OpsToolbar
                    controls={
                        <>
                            <input
                                type="search"
                                value={action}
                                onChange={(event) => setAction(event.target.value)}
                                placeholder="Filter by action"
                            />
                            <input
                                type="search"
                                value={actorSearch}
                                onChange={(event) => setActorSearch(event.target.value)}
                                placeholder="Filter by actor email or user ID"
                            />
                            <input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} />
                            <input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} />
                        </>
                    }
                    actions={
                        <>
                            <span className="ops-inline-muted">{rows.length} events loaded</span>
                            <button type="button" className="admin-btn subtle small" onClick={() => void Promise.all([workspaceQuery.refetch(), usesWorkspaceFeed ? Promise.resolve() : query.refetch()])}>
                                Refresh
                            </button>
                            <button type="button" className="admin-btn subtle small" onClick={() => void integrityQuery.refetch()}>
                                Recheck Integrity
                            </button>
                            {integrityStatus === 'invalid' ? (
                                <button
                                    type="button"
                                    className="admin-btn small danger"
                                    onClick={() => rebuildMutation.mutate()}
                                    disabled={rebuildMutation.isPending || !hasValidStepUp}
                                    title={!hasValidStepUp ? 'Step-up verification required' : 'Rebuild the audit ledger chain'}
                                >
                                    {rebuildMutation.isPending ? 'Rebuilding...' : 'Repair Ledger'}
                                </button>
                            ) : null}
                            <button
                                type="button"
                                className="admin-btn small"
                                onClick={() => {
                                    setAction('');
                                    setActorSearch('');
                                    setStart('');
                                    setEnd('');
                                }}
                            >
                                Clear
                            </button>
                        </>
                    }
                />

                {actorChips.length > 0 ? (
                    <div className="ops-row wrap">
                        {actorChips.map((chip) => (
                            <button
                                key={chip.label}
                                type="button"
                                className={`admin-btn small ${actorSearch === chip.label ? 'primary' : 'subtle'}`}
                                onClick={() => setActorSearch(chip.label)}
                            >
                                {chip.label} ({chip.count})
                            </button>
                        ))}
                    </div>
                ) : null}

                {showPrimaryLoading ? <div className="admin-alert info">Loading audit logs...</div> : null}
                {showPrimaryError ? <OpsErrorState message="Failed to load audit logs." /> : null}
                {!showPrimaryError && query.error && usesWorkspaceFeed ? (
                    <div className="admin-alert warning">Filtered audit fetch is temporarily unavailable. The shared site-ops snapshot is still loaded.</div>
                ) : null}
                {rebuildMutation.isError ? (
                    <OpsErrorState message={rebuildMutation.error instanceof Error ? rebuildMutation.error.message : 'Failed to rebuild audit ledger.'} />
                ) : null}

                {rows.length > 0 ? (
                    <OpsTable
                        columns={[
                            { key: 'action', label: 'Action' },
                            { key: 'actor', label: 'Actor' },
                            { key: 'target', label: 'Target' },
                            { key: 'meta', label: 'Details' },
                            { key: 'time', label: 'When' },
                            { key: 'actions', label: 'Actions' },
                        ]}
                    >
                        {rows.map((row) => {
                            const targetId = extractTargetId(row);
                            const targetLabel = extractTargetLabel(row);
                            const requestId = extractRequestId(row);
                            const endpoint = extractEndpoint(row);
                            const method = extractMethod(row);
                            const diffSummary = extractDiffSummary(row);

                            return (
                                <tr key={String(row.id ?? `${row.action ?? 'audit'}-${row.createdAt ?? ''}`)}>
                                    <td><OpsBadge tone={actionTone(row.action)}>{row.action || 'unknown'}</OpsBadge></td>
                                    <td>
                                        <strong>{extractActorLabel(row)}</strong>
                                        {row.userId ? <div className="ops-inline-muted">{row.userId}</div> : null}
                                    </td>
                                    <td>
                                        <strong>{targetLabel}</strong>
                                        {targetId ? <div className="ops-inline-muted">ID: {targetId}</div> : null}
                                    </td>
                                    <td>
                                        {diffSummary ? <div>{diffSummary}</div> : <div>-</div>}
                                        {requestId ? <div className="ops-inline-muted">Request: {requestId}</div> : null}
                                        {endpoint ? <div className="ops-inline-muted">{method ? `${method} ` : ''}{endpoint}</div> : null}
                                    </td>
                                    <td>{formatDateTime(row.createdAt)}</td>
                                    <td>
                                        <RowActionMenu
                                            itemLabel={targetLabel}
                                            actions={[
                                                {
                                                    id: 'filter-actor',
                                                    label: 'Filter Actor',
                                                    onClick: () => setActorSearch(extractActorLabel(row)),
                                                },
                                                {
                                                    id: 'filter-action',
                                                    label: 'Filter Action',
                                                    onClick: () => setAction(String(row.action ?? '')),
                                                },
                                                {
                                                    id: 'open-record',
                                                    label: 'Open Record',
                                                    disabled: !targetId,
                                                    onClick: () => {
                                                        if (!targetId) return;
                                                        navigate(`/detailed-post?focus=${encodeURIComponent(targetId)}`);
                                                    },
                                                },
                                            ]}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </OpsTable>
                ) : null}

                {!showPrimaryLoading && !showPrimaryError && rows.length === 0 ? (
                    <OpsEmptyState message="No audit activity matches the current view." />
                ) : null}
            </div>
        </ModuleScaffold>
    );
}
