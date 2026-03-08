import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAdminAuth } from '../../app/useAdminAuth';
import { useAdminPreferences } from '../../app/useAdminPreferences';
import { AdminStepUpCard } from '../../components/AdminStepUpCard';
import { OpsBadge, OpsCard, OpsEmptyState, OpsErrorState, OpsTable, OpsToolbar } from '../../components/ops';
import { ActionOverflowMenu, useAdminNotifications } from '../../components/ops/legacy-port';
import { getAdminSecurityLogs, updateAdminSecurityIncident } from '../../lib/api/client';
import { trackAdminTelemetry } from '../../lib/adminTelemetry';
import type { AdminSecurityLog } from '../../types';

const toEventType = (row: AdminSecurityLog) => String(row.eventType ?? (row as Record<string, unknown>).event_type ?? 'unknown');
const toIp = (row: AdminSecurityLog) => String(row.ipAddress ?? (row as Record<string, unknown>).ip_address ?? '-');
const toEndpoint = (row: AdminSecurityLog) => String(row.endpoint ?? '-');
const toWhen = (row: AdminSecurityLog): string | undefined => {
    const raw = row.createdAt ?? (row as Record<string, unknown>).created_at;
    if (!raw) return undefined;
    if (raw instanceof Date) return raw.toISOString();
    if (typeof raw === 'string') return raw;
    return String(raw);
};
const toMetadata = (row: AdminSecurityLog): Record<string, unknown> => {
    const metadata = (row as Record<string, unknown>).metadata;
    return metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : {};
};
const toSessionId = (row: AdminSecurityLog) => {
    const metadata = toMetadata(row);
    return typeof metadata.sessionId === 'string' ? metadata.sessionId : '';
};
const toActorEmail = (row: AdminSecurityLog) => {
    const metadata = toMetadata(row);
    return typeof metadata.email === 'string' ? metadata.email : '';
};
const toDeviceSummary = (row: AdminSecurityLog) => {
    const metadata = toMetadata(row);
    const device = typeof metadata.device === 'string' ? metadata.device : '';
    const browser = typeof metadata.browser === 'string' ? metadata.browser : '';
    const os = typeof metadata.os === 'string' ? metadata.os : '';
    return [device, browser, os].filter(Boolean).join(' | ');
};
const toIncidentNote = (row: AdminSecurityLog) => {
    if (typeof row.note === 'string' && row.note.trim()) return row.note;
    const metadata = toMetadata(row);
    return typeof metadata.reason === 'string' ? metadata.reason : '';
};

const eventTone = (eventType: string): 'neutral' | 'success' | 'warning' | 'danger' => {
    const normalized = eventType.toLowerCase();
    if (normalized.includes('fail') || normalized.includes('forbidden') || normalized.includes('blocked') || normalized.includes('error') || normalized.includes('alert')) {
        return 'danger';
    }
    if (normalized.includes('throttle') || normalized.includes('limit') || normalized.includes('warn')) {
        return 'warning';
    }
    if (normalized.includes('success')) {
        return 'success';
    }
    return 'neutral';
};

export function SecurityModule() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { formatDateTime } = useAdminPreferences();
    const { hasValidStepUp, stepUpToken, user } = useAdminAuth();
    const { notifyError, notifyInfo, notifySuccess } = useAdminNotifications();
    const [searchParams] = useSearchParams();
    const [eventType, setEventType] = useState('');
    const [ip, setIp] = useState('');
    const [endpoint, setEndpoint] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'investigating' | 'resolved'>('all');
    const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
    const [incidentNoteDraft, setIncidentNoteDraft] = useState('');
    const riskFilter = searchParams.get('risk');

    const query = useQuery({
        queryKey: ['admin-security-logs', eventType, ip, endpoint, start, end],
        queryFn: () => getAdminSecurityLogs({
            limit: 80,
            offset: 0,
            eventType: eventType || undefined,
            ip: ip || undefined,
            endpoint: endpoint || undefined,
            start: start || undefined,
            end: end || undefined,
        }),
    });

    const updateMutation = useMutation({
        mutationFn: async ({
            id,
            incidentStatus,
            assigneeEmail,
            note,
        }: { id: string; incidentStatus?: 'new' | 'investigating' | 'resolved'; assigneeEmail?: string; note?: string }) => {
            if (!stepUpToken || !hasValidStepUp) {
                throw new Error('Step-up verification is required to update security incidents.');
            }
            return updateAdminSecurityIncident(id, { incidentStatus, assigneeEmail, note }, stepUpToken);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-security-logs'] });
            notifySuccess('Incident updated', 'Security incident state was saved.');
        },
        onError: (error) => {
            notifyError('Incident update failed', error instanceof Error ? error.message : 'Failed to update security incident.');
        },
    });

    const rows = useMemo(() => {
        const loaded = query.data ?? [];
        return loaded.filter((row) => {
            const tone = eventTone(toEventType(row));
            if (riskFilter === 'high' && tone !== 'danger') return false;
            if (statusFilter !== 'all' && (row.incidentStatus ?? 'new') !== statusFilter) return false;
            return true;
        });
    }, [query.data, riskFilter, statusFilter]);
    const riskyCount = useMemo(() => rows.filter((row) => { const tone = eventTone(toEventType(row)); return tone === 'danger' || tone === 'warning'; }).length, [rows]);
    const activeIncident = useMemo(
        () => rows.find((row) => String(row.id ?? '') === activeIncidentId) ?? null,
        [activeIncidentId, rows]
    );

    useEffect(() => {
        if (!activeIncident) {
            setIncidentNoteDraft('');
            return;
        }
        setIncidentNoteDraft(typeof activeIncident.note === 'string' ? activeIncident.note : '');
    }, [activeIncident]);

    useEffect(() => {
        void trackAdminTelemetry('admin_module_viewed', { module: 'security', count: rows.length });
    }, [rows.length]);

    return (
        <>
            <AdminStepUpCard />
            <OpsCard title="Security" description="Risk-forward security events with incident ownership, state transitions, and filterable logs.">
                <div className="ops-stack">
                    <OpsToolbar
                        controls={
                            <>
                                <input
                                    type="search"
                                    value={eventType}
                                    onChange={(event) => setEventType(event.target.value)}
                                    placeholder="Filter by event type"
                                />
                                <input
                                    type="search"
                                    value={ip}
                                    onChange={(event) => setIp(event.target.value)}
                                    placeholder="Filter by IP"
                                />
                                <input
                                    type="search"
                                    value={endpoint}
                                    onChange={(event) => setEndpoint(event.target.value)}
                                    placeholder="Filter by endpoint"
                                />
                                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | 'new' | 'investigating' | 'resolved')}>
                                    <option value="all">All incidents</option>
                                    <option value="new">New</option>
                                    <option value="investigating">Investigating</option>
                                    <option value="resolved">Resolved</option>
                                </select>
                                <input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} />
                                <input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} />
                            </>
                        }
                        actions={
                            <>
                                <span className="ops-inline-muted">{rows.length} events loaded</span>
                                <button
                                    type="button"
                                    className="admin-btn subtle small"
                                    onClick={() => {
                                        setEventType('');
                                        setIp('');
                                        setEndpoint('');
                                        setStart('');
                                        setEnd('');
                                        setStatusFilter('all');
                                        notifyInfo('Filters cleared', 'Security filters reset to defaults.');
                                    }}
                                >
                                    Clear
                                </button>
                                <button type="button" className="admin-btn small" onClick={() => void query.refetch()}>
                                    Refresh
                                </button>
                            </>
                        }
                    />

                    <div className="ops-kpi-grid">
                        <div className="ops-kpi-card">
                            <div className="ops-kpi-label">Loaded Events</div>
                            <div className="ops-kpi-value">{rows.length}</div>
                        </div>
                        <div className="ops-kpi-card">
                            <div className="ops-kpi-label">Risky Events</div>
                            <div className="ops-kpi-value">{riskyCount}</div>
                        </div>
                    </div>

                    {query.isPending ? <div className="admin-alert info">Loading security logs...</div> : null}
                    {query.error ? <OpsErrorState message="Failed to load security logs." /> : null}

                    {rows.length > 0 ? (
                        <OpsTable
                            columns={[
                                { key: 'event', label: 'Event' },
                                { key: 'endpoint', label: 'Endpoint' },
                                { key: 'ip', label: 'IP' },
                                { key: 'incident', label: 'Incident' },
                                { key: 'when', label: 'When' },
                                { key: 'action', label: 'Action' },
                            ]}
                        >
                            {rows.map((row: AdminSecurityLog, index: number) => {
                                const eventLabel = toEventType(row);
                                const rowIp = toIp(row);
                                const rowEndpoint = toEndpoint(row);
                                const rowId = typeof row.id === 'string' ? row.id : String(row.id ?? '');
                                const sessionId = toSessionId(row);
                                const actorEmail = toActorEmail(row);
                                const deviceSummary = toDeviceSummary(row);
                                const incidentNote = toIncidentNote(row);

                                return (
                                    <tr key={row.id || `${eventLabel}-${index}`}>
                                        <td><OpsBadge tone={eventTone(eventLabel)}>{eventLabel}</OpsBadge></td>
                                        <td>
                                            <code>{rowEndpoint}</code>
                                            {actorEmail ? <div className="ops-inline-muted">{actorEmail}</div> : null}
                                            {deviceSummary ? <div className="ops-inline-muted">{deviceSummary}</div> : null}
                                            {sessionId ? <div className="ops-inline-muted">Session: <code>{sessionId}</code></div> : null}
                                            {incidentNote ? <div className="ops-inline-muted">Note: {incidentNote}</div> : null}
                                        </td>
                                        <td>{rowIp}</td>
                                        <td>
                                            <OpsBadge tone={row.incidentStatus === 'resolved' ? 'success' : row.incidentStatus === 'investigating' ? 'warning' : 'neutral'}>
                                                {row.incidentStatus ?? 'new'}
                                            </OpsBadge>
                                            <div className="ops-inline-muted">{row.assigneeEmail || 'Unassigned'}</div>
                                        </td>
                                        <td>{formatDateTime(toWhen(row))}</td>
                                        <td>
                                            <div className="ops-actions">
                                                <button
                                                    type="button"
                                                    className="admin-btn subtle small"
                                                    onClick={() => {
                                                        setActiveIncidentId(rowId);
                                                        const params = new URLSearchParams();
                                                        if (sessionId) params.set('sessionId', sessionId);
                                                        if (rowIp && rowIp !== '-') params.set('search', rowIp);
                                                        else if (actorEmail) params.set('search', actorEmail);
                                                        if (eventTone(eventLabel) === 'danger') params.set('risk', 'high');
                                                        navigate(`/sessions?${params.toString()}`);
                                                    }}
                                                >
                                                    Related Sessions
                                                </button>
                                            </div>
                                            <ActionOverflowMenu
                                                itemLabel={eventLabel}
                                                actions={[
                                                    {
                                                        id: 'assign-me',
                                                        label: 'Assign to Me',
                                                        disabled: !rowId || updateMutation.isPending,
                                                        onClick: () => updateMutation.mutate({ id: rowId, incidentStatus: 'investigating', assigneeEmail: user?.email }),
                                                    },
                                                    {
                                                        id: 'mark-investigating',
                                                        label: 'Mark Investigating',
                                                        disabled: !rowId || updateMutation.isPending,
                                                        onClick: () => updateMutation.mutate({ id: rowId, incidentStatus: 'investigating', assigneeEmail: row.assigneeEmail || user?.email }),
                                                    },
                                                    {
                                                        id: 'mark-resolved',
                                                        label: 'Mark Resolved',
                                                        disabled: !rowId || updateMutation.isPending,
                                                        onClick: () => updateMutation.mutate({ id: rowId, incidentStatus: 'resolved', assigneeEmail: row.assigneeEmail || user?.email }),
                                                    },
                                                    {
                                                        id: 'investigate',
                                                        label: 'Investigate',
                                                        disabled: !rowId,
                                                        onClick: () => setActiveIncidentId(rowId),
                                                    },
                                                    {
                                                        id: 'copy-ip',
                                                        label: 'Copy IP',
                                                        disabled: !rowIp || rowIp === '-',
                                                        onClick: async () => {
                                                            try {
                                                                await navigator.clipboard.writeText(rowIp);
                                                                notifySuccess('Copied', `IP copied: ${rowIp}`);
                                                            } catch {
                                                                notifyError('Copy failed', 'Could not copy IP to clipboard.');
                                                            }
                                                        },
                                                    },
                                                    {
                                                        id: 'copy-session-id',
                                                        label: 'Copy Session ID',
                                                        disabled: !sessionId,
                                                        onClick: async () => {
                                                            if (!sessionId) return;
                                                            try {
                                                                await navigator.clipboard.writeText(sessionId);
                                                                notifySuccess('Copied', `Session ID copied: ${sessionId}`);
                                                            } catch {
                                                                notifyError('Copy failed', 'Could not copy session ID to clipboard.');
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

                    {activeIncident ? (
                        <OpsCard title={`Incident Detail: ${toEventType(activeIncident)}`} tone="muted">
                            <div className="ops-stack">
                                <div className="ops-meta-row">
                                    <OpsBadge tone={eventTone(toEventType(activeIncident))}>{toEventType(activeIncident)}</OpsBadge>
                                    <span>{toActorEmail(activeIncident) || 'Unknown actor'}</span>
                                    {toSessionId(activeIncident) ? <span>Session: <code>{toSessionId(activeIncident)}</code></span> : null}
                                </div>
                                <div className="ops-inline-muted">{toEndpoint(activeIncident)} | {toIp(activeIncident)}</div>
                                {toDeviceSummary(activeIncident) ? <div className="ops-inline-muted">{toDeviceSummary(activeIncident)}</div> : null}
                                <textarea
                                    className="ops-textarea"
                                    value={incidentNoteDraft}
                                    onChange={(event) => setIncidentNoteDraft(event.target.value)}
                                    placeholder="Capture investigation notes, root cause, or next steps"
                                />
                                <div className="ops-actions">
                                    <button
                                        type="button"
                                        className="admin-btn primary"
                                        disabled={updateMutation.isPending}
                                        onClick={() => updateMutation.mutate({
                                            id: String(activeIncident.id ?? ''),
                                            incidentStatus: activeIncident.incidentStatus === 'resolved' ? 'resolved' : 'investigating',
                                            assigneeEmail: activeIncident.assigneeEmail || user?.email,
                                            note: incidentNoteDraft.trim(),
                                        })}
                                    >
                                        Save Incident Note
                                    </button>
                                    <button
                                        type="button"
                                        className="admin-btn subtle"
                                        onClick={() => {
                                            const params = new URLSearchParams();
                                            const actor = toActorEmail(activeIncident);
                                            if (actor) params.set('actor', actor);
                                            params.set('action', 'security_incident_update');
                                            navigate(`/audit?${params.toString()}`);
                                        }}
                                    >
                                        Open Audit Trail
                                    </button>
                                </div>
                            </div>
                        </OpsCard>
                    ) : null}

                    {!query.isPending && !query.error && rows.length === 0 ? <OpsEmptyState message="No security logs found." /> : null}
                    {updateMutation.isError ? (
                        <OpsErrorState message={updateMutation.error instanceof Error ? updateMutation.error.message : 'Failed to update security incident.'} />
                    ) : null}
                </div>
            </OpsCard>
        </>
    );
}
