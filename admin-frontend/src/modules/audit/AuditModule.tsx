import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAdminPreferences } from '../../app/useAdminPreferences';
import { OpsBadge, OpsCard, OpsEmptyState, OpsErrorState, OpsTable, OpsToolbar } from '../../components/ops';
import { getAdminAuditIntegrity, getAdminAuditLogs } from '../../lib/api/client';
import { trackAdminTelemetry } from '../../lib/adminTelemetry';
import type { AdminAuditLog } from '../../types';

const actionTone = (action?: string): 'neutral' | 'success' | 'warning' | 'danger' => {
    const normalized = String(action || '').toLowerCase();
    if (normalized.includes('delete') || normalized.includes('reject') || normalized.includes('blocked')) return 'danger';
    if (normalized.includes('approve') || normalized.includes('publish')) return 'success';
    if (normalized.includes('step_up') || normalized.includes('terminate') || normalized.includes('password')) return 'warning';
    return 'neutral';
};

export function AuditModule() {
    const { formatDateTime } = useAdminPreferences();
    const [action, setAction] = useState('');
    const [userId, setUserId] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');

    const query = useQuery({
        queryKey: ['admin-audit-logs', action, userId, start, end],
        queryFn: () => getAdminAuditLogs({
            limit: 80,
            offset: 0,
            action: action || undefined,
            userId: userId || undefined,
            start: start || undefined,
            end: end || undefined,
        }),
    });

    const integrityQuery = useQuery({
        queryKey: ['admin-audit-integrity'],
        queryFn: () => getAdminAuditIntegrity(300),
        refetchInterval: 5 * 60 * 1000,
    });

    const rows = query.data ?? [];
    const integrityData = integrityQuery.data;
    const integrityStatus = integrityData
        ? (integrityData.valid === true ? 'verified' : integrityData.valid === false ? 'invalid' : String(integrityData.status ?? integrityData.state ?? 'unknown'))
        : 'unknown';
    const integrityTone = integrityStatus === 'verified' || integrityStatus === 'valid'
        ? 'success'
        : integrityStatus === 'unknown'
            ? 'warning'
            : 'danger';

    useEffect(() => {
        void trackAdminTelemetry('admin_module_viewed', {
            module: 'audit',
            count: rows.length,
            integrity: integrityStatus,
        });
    }, [integrityStatus, rows.length]);

    return (
        <OpsCard title="Audit" description="Compliance timeline with filterable events and ledger integrity checks.">
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
                                value={userId}
                                onChange={(event) => setUserId(event.target.value)}
                                placeholder="Filter by actor id/email"
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
                            <button
                                type="button"
                                className="admin-btn small"
                                onClick={() => {
                                    setAction('');
                                    setUserId('');
                                    setStart('');
                                    setEnd('');
                                }}
                            >
                                Clear
                            </button>
                        </>
                    }
                />

                <div className="ops-kpi-grid">
                    <div className="ops-kpi-card">
                        <div className="ops-kpi-label">Loaded Entries</div>
                        <div className="ops-kpi-value">{rows.length}</div>
                    </div>
                    <div className="ops-kpi-card">
                        <div className="ops-kpi-label">Ledger Integrity</div>
                        <div className="ops-kpi-value"><OpsBadge tone={integrityTone as 'neutral' | 'success' | 'warning' | 'danger'}>{integrityStatus}</OpsBadge></div>
                    </div>
                </div>

                {query.isPending ? <div className="admin-alert info">Loading audit logs...</div> : null}
                {query.error ? <OpsErrorState message="Failed to load audit logs." /> : null}
                {integrityQuery.error ? <OpsErrorState message="Failed to verify audit integrity." /> : null}

                {rows.length > 0 ? (
                    <OpsTable
                        columns={[
                            { key: 'action', label: 'Action' },
                            { key: 'actor', label: 'Actor' },
                            { key: 'when', label: 'When' },
                            { key: 'ref', label: 'Reference' },
                        ]}
                    >
                        {rows.map((row: AdminAuditLog, index: number) => (
                            <tr key={row.id || `${row.action}-${index}`}>
                                <td><OpsBadge tone={actionTone(String(row.action || ''))}>{String(row.action ?? '-')}</OpsBadge></td>
                                <td>{String(row.actorEmail ?? row.actorId ?? '-')}</td>
                                <td>{formatDateTime(typeof row.createdAt === 'string' ? row.createdAt : (row.createdAt as unknown) instanceof Date ? (row.createdAt as unknown as Date).toISOString() : undefined)}</td>
                                <td><code>{String(row.id ?? '-')}</code></td>
                            </tr>
                        ))}
                    </OpsTable>
                ) : null}

                {!query.isPending && !query.error && rows.length === 0 ? (
                    <OpsEmptyState message="No audit entries found." />
                ) : null}
            </div>
        </OpsCard>
    );
}
