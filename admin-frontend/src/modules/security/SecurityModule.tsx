import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAdminPreferences } from '../../app/useAdminPreferences';
import { OpsBadge, OpsCard, OpsEmptyState, OpsErrorState, OpsTable, OpsToolbar } from '../../components/ops';
import { ActionOverflowMenu, useAdminNotifications } from '../../components/ops/legacy-port';
import { getAdminSecurityLogs } from '../../lib/api/client';
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

const eventTone = (eventType: string): 'neutral' | 'success' | 'warning' | 'danger' => {
    const normalized = eventType.toLowerCase();
    if (normalized.includes('fail') || normalized.includes('forbidden') || normalized.includes('blocked') || normalized.includes('error')) {
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
    const { formatDateTime } = useAdminPreferences();
    const { notifyError, notifyInfo, notifySuccess } = useAdminNotifications();
    const [eventType, setEventType] = useState('');
    const [ip, setIp] = useState('');
    const [endpoint, setEndpoint] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');

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

    const rows = useMemo(() => query.data ?? [], [query.data]);
    const riskyCount = useMemo(() => rows.filter((row) => { const tone = eventTone(toEventType(row)); return tone === 'danger' || tone === 'warning'; }).length, [rows]);

    useEffect(() => {
        void trackAdminTelemetry('admin_module_viewed', { module: 'security', count: rows.length });
    }, [rows.length]);

    useEffect(() => {
        void trackAdminTelemetry('admin_filter_applied', {
            module: 'security',
            eventType: eventType || null,
            ip: ip || null,
            endpoint: endpoint || null,
            start: start || null,
            end: end || null,
        });
    }, [end, endpoint, eventType, ip, start]);

    return (
        <OpsCard title="Security" description="Risk-forward security events with quick incident actions and filterable logs.">
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
                            { key: 'when', label: 'When' },
                            { key: 'action', label: 'Action' },
                        ]}
                    >
                        {rows.map((row: AdminSecurityLog, index: number) => {
                            const eventLabel = toEventType(row);
                            const rowIp = toIp(row);
                            const rowEndpoint = toEndpoint(row);

                            return (
                                <tr key={row.id || `${eventLabel}-${index}`}>
                                    <td><OpsBadge tone={eventTone(eventLabel)}>{eventLabel}</OpsBadge></td>
                                    <td><code>{rowEndpoint}</code></td>
                                    <td>{rowIp}</td>
                                    <td>{formatDateTime(toWhen(row))}</td>
                                    <td>
                                        <ActionOverflowMenu
                                            itemLabel={eventLabel}
                                            actions={[
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
                                                    id: 'copy-endpoint',
                                                    label: 'Copy Endpoint',
                                                    disabled: !rowEndpoint || rowEndpoint === '-',
                                                    onClick: async () => {
                                                        try {
                                                            await navigator.clipboard.writeText(rowEndpoint);
                                                            notifySuccess('Copied', `Endpoint copied: ${rowEndpoint}`);
                                                        } catch {
                                                            notifyError('Copy failed', 'Could not copy endpoint to clipboard.');
                                                        }
                                                    },
                                                },
                                                {
                                                    id: 'track-incident',
                                                    label: 'Mark Incident Review',
                                                    onClick: () => {
                                                        void trackAdminTelemetry('admin_incident_action', {
                                                            module: 'security',
                                                            eventType: eventLabel,
                                                            endpoint: rowEndpoint,
                                                            ip: rowIp,
                                                        });
                                                        notifyInfo('Incident tracked', 'Security incident action logged in telemetry.');
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

                {!query.isPending && !query.error && rows.length === 0 ? <OpsEmptyState message="No security logs found." /> : null}
            </div>
        </OpsCard>
    );
}
