import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAdminAuth } from '../../app/useAdminAuth';
import { useAdminPreferences } from '../../app/useAdminPreferences';
import { OpsBadge, OpsEmptyState, OpsErrorState, OpsTable, OpsToolbar } from '../../components/ops';
import { useAdminNotifications } from '../../components/ops/legacy-port';
import { ModuleScaffold, RowActionMenu } from '../../components/workspace';
import { getAdminAuditIntegrity, getAdminAuditLogs, rebuildAdminAuditLedger } from '../../lib/api/client';
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
    const { notifyError, notifyInfo, notifySuccess } = useAdminNotifications();
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
    });

    const integrityQuery = useQuery({
        queryKey: ['admin-audit-integrity'],
        queryFn: () => getAdminAuditIntegrity(300),
        refetchInterval: 5 * 60 * 1000,
    });

    const rows = useMemo(() => query.data ?? [], [query.data]);
    const integrityData = integrityQuery.data;
    const integrityStatus = integrityData
        ? (integrityData.valid === true ? 'verified' : integrityData.valid === false ? 'invalid' : String(integrityData.status ?? integrityData.state ?? 'unknown'))
        : 'unknown';
    const integrityTone = integrityStatus === 'verified' || integrityStatus === 'valid'
        ? 'success'
        : integrityStatus === 'unknown'
            ? 'warning'
            : 'danger';

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
                            <button type="button" className="admin-btn subtle small" onClick={() => void query.refetch()}>
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

                <div className="ops-kpi-grid">
                    <div className="ops-kpi-card">
                        <div className="ops-kpi-label">Loaded Entries</div>
                        <div className="ops-kpi-value">{rows.length}</div>
                    </div>
                    <div className="ops-kpi-card">
                        <div className="ops-kpi-label">Unique Actors</div>
                        <div className="ops-kpi-value">{uniqueActorCount}</div>
                    </div>
                    <div className="ops-kpi-card">
                        <div className="ops-kpi-label">Content Diffs</div>
                        <div className="ops-kpi-value">{changedRowCount}</div>
                    </div>
                    <div className="ops-kpi-card">
                        <div className="ops-kpi-label">Ledger Integrity</div>
                        <div className="ops-kpi-value"><OpsBadge tone={integrityTone}>{integrityStatus}</OpsBadge></div>
                    </div>
                </div>

                {integrityData?.reason ? <div className="admin-alert warning">Integrity detail: {String(integrityData.reason)}</div> : null}
                {query.isPending ? <div className="admin-alert info">Loading audit logs...</div> : null}
                {query.error ? <OpsErrorState message="Failed to load audit logs." /> : null}
                {integrityQuery.error ? <OpsErrorState message="Failed to verify audit integrity." /> : null}

                {rows.length > 0 ? (
                    <OpsTable
                        columns={[
                            { key: 'action', label: 'Action' },
                            { key: 'actor', label: 'Actor' },
                            { key: 'target', label: 'Target' },
                            { key: 'context', label: 'Context' },
                            { key: 'when', label: 'When' },
                            { key: 'controls', label: 'Controls' },
                        ]}
                    >
                        {rows.map((row: AdminAuditLog, index: number) => {
                            const actorLabel = extractActorLabel(row);
                            const targetId = extractTargetId(row);
                            const targetLabel = extractTargetLabel(row);
                            const requestId = extractRequestId(row);
                            const endpoint = extractEndpoint(row);
                            const method = extractMethod(row);
                            const diffSummary = extractDiffSummary(row);

                            return (
                                <tr key={row.id || `${row.action}-${index}`}>
                                    <td>
                                        <OpsBadge tone={actionTone(String(row.action || ''))}>{String(row.action ?? '-')}</OpsBadge>
                                        {row.note ? <div className="ops-inline-muted">{String(row.note)}</div> : null}
                                    </td>
                                    <td>
                                        <strong>{actorLabel}</strong>
                                        {row.userId ? <div className="ops-inline-muted">User ID: <code>{row.userId}</code></div> : null}
                                    </td>
                                    <td>
                                        {targetId ? (
                                            <button
                                                type="button"
                                                className="admin-btn subtle small"
                                                onClick={() => navigate(`/detailed-post?focus=${encodeURIComponent(targetId)}`)}
                                            >
                                                {targetLabel}
                                            </button>
                                        ) : (
                                            <strong>{targetLabel}</strong>
                                        )}
                                        {targetId ? <div className="ops-inline-muted">Record: <code>{targetId}</code></div> : null}
                                    </td>
                                    <td>
                                        {endpoint ? <div className="ops-inline-muted">{method ? `${method} ` : ''}{endpoint}</div> : null}
                                        {requestId ? <div className="ops-inline-muted">Request: {requestId}</div> : null}
                                        {diffSummary ? <div className="ops-inline-muted">{diffSummary}</div> : null}
                                    </td>
                                    <td>{formatDateTime(typeof row.createdAt === 'string' ? row.createdAt : undefined)}</td>
                                    <td>
                                        <RowActionMenu
                                            itemLabel={String(row.action ?? 'audit-entry')}
                                            actions={[
                                                {
                                                    id: 'filter-actor',
                                                    label: 'Filter By Actor',
                                                    disabled: !actorLabel || actorLabel === 'Unknown actor',
                                                    onClick: () => {
                                                        setActorSearch(actorLabel);
                                                        notifyInfo('Actor filter applied', actorLabel);
                                                    },
                                                },
                                                {
                                                    id: 'open-post',
                                                    label: 'Open Record',
                                                    disabled: !targetId,
                                                    onClick: () => {
                                                        if (!targetId) return;
                                                        navigate(`/detailed-post?focus=${encodeURIComponent(targetId)}`);
                                                    },
                                                },
                                                {
                                                    id: 'copy-request',
                                                    label: 'Copy Request ID',
                                                    disabled: !requestId,
                                                    onClick: async () => {
                                                        if (!requestId) return;
                                                        try {
                                                            await navigator.clipboard.writeText(requestId);
                                                            notifySuccess('Copied', `Request ID copied: ${requestId}`);
                                                        } catch {
                                                            notifyError('Copy failed', 'Could not copy request ID.');
                                                        }
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

                {!query.isPending && !query.error && rows.length === 0 ? (
                    <OpsEmptyState message="No audit entries found." />
                ) : null}
            </div>
        </ModuleScaffold>
    );
}
