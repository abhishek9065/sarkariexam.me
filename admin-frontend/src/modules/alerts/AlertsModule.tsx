import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { OpsBadge, OpsCard, OpsEmptyState, OpsErrorState, OpsTable, OpsToolbar } from '../../components/ops';
import { useAdminNotifications } from '../../components/ops/legacy-port';
import { createAdminAlert, getAdminAlerts, updateAdminAlert } from '../../lib/api/client';
import type { AdminAlert } from '../../types';

type AlertSourceFilter = 'deadline' | 'schedule' | 'link' | 'traffic' | 'manual' | 'all';
type AlertSeverityFilter = 'info' | 'warning' | 'critical' | 'all';
type AlertStatusFilter = 'open' | 'acknowledged' | 'resolved' | 'all';

type AlertFormState = {
    source: 'deadline' | 'schedule' | 'link' | 'traffic' | 'manual';
    severity: 'info' | 'warning' | 'critical';
    message: string;
};

const defaultAlertForm: AlertFormState = {
    source: 'manual',
    severity: 'warning',
    message: '',
};

const toneBySeverity = (severity: AdminAlert['severity']) => {
    if (severity === 'critical') return 'danger';
    if (severity === 'warning') return 'warning';
    return 'info';
};

const toneByStatus = (status: AdminAlert['status']) => {
    if (status === 'open') return 'danger';
    if (status === 'acknowledged') return 'warning';
    return 'success';
};

export function AlertsModule() {
    const queryClient = useQueryClient();
    const { notifyError, notifySuccess } = useAdminNotifications();

    const [source, setSource] = useState<AlertSourceFilter>('all');
    const [severity, setSeverity] = useState<AlertSeverityFilter>('all');
    const [status, setStatus] = useState<AlertStatusFilter>('all');
    const [form, setForm] = useState<AlertFormState>(defaultAlertForm);

    const query = useQuery({
        queryKey: ['admin-alerts', source, severity, status],
        queryFn: () => getAdminAlerts({ source, severity, status, limit: 150 }),
    });

    const alerts = useMemo(() => query.data?.data ?? [], [query.data]);
    const openCount = useMemo(() => alerts.filter((item) => item.status === 'open').length, [alerts]);
    const criticalCount = useMemo(() => alerts.filter((item) => item.severity === 'critical').length, [alerts]);

    const createMutation = useMutation({
        mutationFn: async () =>
            createAdminAlert({
                source: form.source,
                severity: form.severity,
                message: form.message.trim(),
                status: 'open',
            }),
        onSuccess: async () => {
            notifySuccess('Alert created', 'Manual alert added to operations feed.');
            setForm(defaultAlertForm);
            await queryClient.invalidateQueries({ queryKey: ['admin-alerts'] });
        },
        onError: (error) => {
            notifyError(
                'Alert create failed',
                error instanceof Error ? error.message : 'Unable to create alert.'
            );
        },
    });

    const patchMutation = useMutation({
        mutationFn: async (input: { id: string; status: AdminAlert['status'] }) =>
            updateAdminAlert(input.id, { status: input.status }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-alerts'] });
        },
        onError: (error) => {
            notifyError(
                'Alert update failed',
                error instanceof Error ? error.message : 'Unable to update alert status.'
            );
        },
    });

    return (
        <OpsCard title="Alerts" description="Monitor and manage operational alerts for deadlines, schedules, links, and traffic.">
            <OpsToolbar
                controls={(
                    <>
                        <select value={source} onChange={(event) => setSource(event.target.value as AlertSourceFilter)}>
                            <option value="all">Source: All</option>
                            <option value="deadline">Deadline</option>
                            <option value="schedule">Schedule</option>
                            <option value="link">Link Health</option>
                            <option value="traffic">Traffic</option>
                            <option value="manual">Manual</option>
                        </select>
                        <select value={severity} onChange={(event) => setSeverity(event.target.value as AlertSeverityFilter)}>
                            <option value="all">Severity: All</option>
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="critical">Critical</option>
                        </select>
                        <select value={status} onChange={(event) => setStatus(event.target.value as AlertStatusFilter)}>
                            <option value="all">Status: All</option>
                            <option value="open">Open</option>
                            <option value="acknowledged">Acknowledged</option>
                            <option value="resolved">Resolved</option>
                        </select>
                    </>
                )}
                actions={(
                    <>
                        <span className="ops-inline-muted">Open: {openCount}</span>
                        <span className="ops-inline-muted">Critical: {criticalCount}</span>
                        <button
                            type="button"
                            className="admin-btn small subtle"
                            onClick={() => void query.refetch()}
                        >
                            Refresh
                        </button>
                    </>
                )}
            />

            <div className="ops-kpi-grid">
                <div className="ops-kpi-card">
                    <div className="ops-kpi-label">Total Alerts</div>
                    <div className="ops-kpi-value">{alerts.length}</div>
                </div>
                <div className="ops-kpi-card">
                    <div className="ops-kpi-label">Open</div>
                    <div className="ops-kpi-value">{openCount}</div>
                </div>
                <div className="ops-kpi-card">
                    <div className="ops-kpi-label">Critical</div>
                    <div className="ops-kpi-value">{criticalCount}</div>
                </div>
            </div>

            <form
                className="ops-form-grid"
                onSubmit={(event) => {
                    event.preventDefault();
                    createMutation.mutate();
                }}
            >
                <select
                    value={form.source}
                    onChange={(event) =>
                        setForm((current) => ({ ...current, source: event.target.value as AlertFormState['source'] }))}
                    aria-label="Alert source"
                >
                    <option value="manual">Manual</option>
                    <option value="deadline">Deadline</option>
                    <option value="schedule">Schedule</option>
                    <option value="link">Link Health</option>
                    <option value="traffic">Traffic</option>
                </select>
                <select
                    value={form.severity}
                    onChange={(event) =>
                        setForm((current) => ({ ...current, severity: event.target.value as AlertFormState['severity'] }))}
                    aria-label="Alert severity"
                >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                </select>
                <button
                    type="submit"
                    className="admin-btn primary"
                    disabled={createMutation.isPending || !form.message.trim()}
                >
                    {createMutation.isPending ? 'Creating...' : 'Create Alert'}
                </button>
                <textarea
                    className="ops-span-full"
                    value={form.message}
                    onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                    placeholder="Alert message"
                    required
                    minLength={3}
                />
            </form>

            {query.isPending ? <div className="admin-alert info">Loading alerts...</div> : null}
            {query.error ? <OpsErrorState message="Failed to load alerts." /> : null}
            {createMutation.error ? (
                <OpsErrorState message={createMutation.error instanceof Error ? createMutation.error.message : 'Failed to create alert.'} />
            ) : null}

            {!query.isPending && !query.error && alerts.length === 0 ? (
                <OpsEmptyState message="No alerts in feed: All clear right now. Create manual alerts when operational action is required." />
            ) : null}

            {alerts.length > 0 ? (
                <OpsTable
                    columns={[
                        { key: 'message', label: 'Alert' },
                        { key: 'source', label: 'Source' },
                        { key: 'severity', label: 'Severity' },
                        { key: 'status', label: 'Status' },
                        { key: 'updatedAt', label: 'Updated' },
                        { key: 'actions', label: 'Actions' },
                    ]}
                >
                    {alerts.map((alert) => (
                        <tr key={alert.id}>
                            <td>{alert.message}</td>
                            <td>{alert.source}</td>
                            <td>
                                <OpsBadge tone={toneBySeverity(alert.severity)}>{alert.severity}</OpsBadge>
                            </td>
                            <td>
                                <OpsBadge tone={toneByStatus(alert.status)}>{alert.status}</OpsBadge>
                            </td>
                            <td>{alert.updatedAt ? new Date(alert.updatedAt).toLocaleString() : '-'}</td>
                            <td>
                                <div className="ops-actions">
                                    {alert.status !== 'acknowledged' ? (
                                        <button
                                            type="button"
                                            className="admin-btn small subtle"
                                            disabled={patchMutation.isPending}
                                            onClick={() => patchMutation.mutate({ id: alert.id, status: 'acknowledged' })}
                                        >
                                            Acknowledge
                                        </button>
                                    ) : null}
                                    {alert.status !== 'resolved' ? (
                                        <button
                                            type="button"
                                            className="admin-btn small"
                                            disabled={patchMutation.isPending}
                                            onClick={() => patchMutation.mutate({ id: alert.id, status: 'resolved' })}
                                        >
                                            Resolve
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="admin-btn small subtle"
                                            disabled={patchMutation.isPending}
                                            onClick={() => patchMutation.mutate({ id: alert.id, status: 'open' })}
                                        >
                                            Reopen
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </OpsTable>
            ) : null}
        </OpsCard>
    );
}
