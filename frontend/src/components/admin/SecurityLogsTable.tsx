import { useState, useEffect } from 'react';
import { adminRequest } from '../../utils/adminRequest';
import { getApiErrorMessage } from '../../utils/errors';
import './SecurityLogsTable.css';

interface SecurityLog {
    id: number;
    ip_address: string;
    event_type: string;
    endpoint: string;
    metadata: any;
    created_at: string;
}

interface SecurityLogsTableProps {
    onUnauthorized?: () => void;
}

const apiBase = import.meta.env.VITE_API_BASE ?? '';
const SECURITY_FILTER_STORAGE_KEY = 'adminSecurityLogFilters';

type SecurityLogFilters = {
    eventType: string;
    ip: string;
    endpoint: string;
    start: string;
    end: string;
};

const EMPTY_FILTERS: SecurityLogFilters = {
    eventType: '',
    ip: '',
    endpoint: '',
    start: '',
    end: '',
};

const EVENT_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
    { value: '', label: 'All events' },
    { value: 'admin_login_failure', label: 'Admin login failures' },
    { value: 'admin_step_up_failed', label: 'Step-up failures' },
    { value: 'admin_security_alert', label: 'Security alerts' },
    { value: 'admin_approval_requested', label: 'Approval requested' },
    { value: 'admin_approval_approved', label: 'Approval approved' },
    { value: 'admin_approval_rejected', label: 'Approval rejected' },
    { value: 'admin_approval_executed', label: 'Approval executed' },
    { value: 'admin_session_terminated', label: 'Session terminated' },
    { value: 'admin_password_reset_failed', label: 'Reset failures' },
    { value: 'admin_password_reset_completed', label: 'Reset completed' },
];

const loadSavedFilters = (): SecurityLogFilters => {
    if (typeof window === 'undefined') return EMPTY_FILTERS;
    try {
        const raw = localStorage.getItem(SECURITY_FILTER_STORAGE_KEY);
        if (!raw) return EMPTY_FILTERS;
        const parsed = JSON.parse(raw) as Partial<SecurityLogFilters>;
        return {
            eventType: typeof parsed.eventType === 'string' ? parsed.eventType : '',
            ip: typeof parsed.ip === 'string' ? parsed.ip : '',
            endpoint: typeof parsed.endpoint === 'string' ? parsed.endpoint : '',
            start: typeof parsed.start === 'string' ? parsed.start : '',
            end: typeof parsed.end === 'string' ? parsed.end : '',
        };
    } catch {
        return EMPTY_FILTERS;
    }
};

export function SecurityLogsTable({ onUnauthorized }: SecurityLogsTableProps) {
    const [logs, setLogs] = useState<SecurityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [pollIntervalMs, setPollIntervalMs] = useState(120000);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [total, setTotal] = useState(0);
    const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
    const [filters, setFilters] = useState<SecurityLogFilters>(() => loadSavedFilters());
    const [draftFilters, setDraftFilters] = useState<SecurityLogFilters>(() => loadSavedFilters());

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startIndex = total === 0 ? 0 : (page - 1) * limit + 1;
    const endIndex = Math.min(total, page * limit);
    const hasActiveFilters = Object.values(filters).some((value) => value.trim() !== '');
    const hasPendingFilterChanges = JSON.stringify(filters) !== JSON.stringify(draftFilters);

    const formatLastUpdated = (value?: string | null) => {
        if (!value) return 'Not updated yet';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Not updated yet';
        const diffMs = Date.now() - date.getTime();
        if (diffMs < 60 * 1000) return 'Updated just now';
        if (diffMs < 60 * 60 * 1000) return `Updated ${Math.round(diffMs / 60000)}m ago`;
        if (diffMs < 24 * 60 * 60 * 1000) return `Updated ${Math.round(diffMs / (60 * 60 * 1000))}h ago`;
        return `Updated ${Math.round(diffMs / (24 * 60 * 60 * 1000))}d ago`;
    };

    const fetchLogs = async () => {
        if (cooldownUntil && Date.now() < cooldownUntil) {
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams({
                limit: String(limit),
                offset: String(Math.max(0, (page - 1) * limit)),
            });
            if (filters.eventType.trim()) params.set('eventType', filters.eventType.trim());
            if (filters.ip.trim()) params.set('ip', filters.ip.trim());
            if (filters.endpoint.trim()) params.set('endpoint', filters.endpoint.trim());
            if (filters.start.trim()) params.set('start', filters.start.trim());
            if (filters.end.trim()) params.set('end', filters.end.trim());

            const res = await adminRequest(`${apiBase}/api/admin/security?${params.toString()}`, {
                onRateLimit: (rateLimitResponse) => {
                    const retryAfter = rateLimitResponse.headers.get('Retry-After');
                    const message = retryAfter
                        ? `Too many requests. Pausing refresh for ${retryAfter}s.`
                        : 'Too many requests. Pausing live refresh for 5 minutes.';
                    setError(message);
                },
            });
            if (res.status === 429) {
                const retryAfter = res.headers.get('Retry-After');
                const waitMs = retryAfter && Number.isFinite(Number(retryAfter))
                    ? Number(retryAfter) * 1000
                    : 5 * 60 * 1000;
                setCooldownUntil(Date.now() + waitMs);
                setPollIntervalMs((current) => Math.max(current, waitMs));
                return;
            }
            if (res.status === 401 || res.status === 403) {
                onUnauthorized?.();
                return;
            }
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                setError(getApiErrorMessage(errorBody, 'Failed to load security logs.'));
                setLogs([]);
                return;
            }
            const data = await res.json();
            setLogs(data.data || []);
            setTotal(data.meta?.total ?? data.data?.length ?? 0);
            setUpdatedAt(new Date().toISOString());
            setCooldownUntil(null);
        } catch (error) {
            console.error(error);
            setError('Failed to load security logs.');
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        setPage(1);
        setFilters({ ...draftFilters });
    };

    const clearFilters = () => {
        setDraftFilters({ ...EMPTY_FILTERS });
        setFilters({ ...EMPTY_FILTERS });
        setPage(1);
    };

    useEffect(() => {
        if (cooldownUntil && Date.now() < cooldownUntil) {
            const timeout = window.setTimeout(() => {
                fetchLogs();
            }, cooldownUntil - Date.now());
            return () => window.clearTimeout(timeout);
        }
        fetchLogs();
        // Poll every 30 seconds for live monitoring
        const interval = setInterval(fetchLogs, pollIntervalMs);
        return () => clearInterval(interval);
    }, [pollIntervalMs, page, limit, cooldownUntil, filters]);

    useEffect(() => {
        try {
            localStorage.setItem(SECURITY_FILTER_STORAGE_KEY, JSON.stringify(filters));
        } catch {
            // ignore storage errors
        }
    }, [filters]);

    useEffect(() => {
        setPage((current) => Math.min(current, totalPages));
    }, [totalPages]);

    if (loading && logs.length === 0) {
        return <div className="loading-spinner">Loading logs...</div>;
    }

    return (
        <div className="security-logs-container">
            <div className="logs-header">
                <h3>🛡️ Security Event Logs</h3>
                <div className="logs-actions">
                    <label className="logs-limit">
                        <span>Rows</span>
                        <select
                            value={limit}
                            onChange={(e) => {
                                setLimit(Number(e.target.value));
                                setPage(1);
                            }}
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                    </label>
                    <span className="logs-updated">{formatLastUpdated(updatedAt)}</span>
                    <button onClick={fetchLogs} className="admin-btn secondary small" disabled={loading}>
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <span className="live-indicator">● Live</span>
                </div>
            </div>

            {error && <div className="logs-error">{error}</div>}

            <form
                className="logs-filters"
                onSubmit={(event) => {
                    event.preventDefault();
                    applyFilters();
                }}
            >
                <label className="logs-filter-field">
                    <span>Event</span>
                    <select
                        value={draftFilters.eventType}
                        onChange={(event) => setDraftFilters((prev) => ({ ...prev, eventType: event.target.value }))}
                    >
                        {EVENT_FILTER_OPTIONS.map((option) => (
                            <option key={option.value || 'all'} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="logs-filter-field">
                    <span>IP</span>
                    <input
                        type="text"
                        value={draftFilters.ip}
                        onChange={(event) => setDraftFilters((prev) => ({ ...prev, ip: event.target.value }))}
                        placeholder="203.0.113.5"
                    />
                </label>
                <label className="logs-filter-field">
                    <span>Endpoint</span>
                    <input
                        type="text"
                        value={draftFilters.endpoint}
                        onChange={(event) => setDraftFilters((prev) => ({ ...prev, endpoint: event.target.value }))}
                        placeholder="/api/admin"
                    />
                </label>
                <label className="logs-filter-field">
                    <span>From</span>
                    <input
                        type="date"
                        value={draftFilters.start}
                        onChange={(event) => setDraftFilters((prev) => ({ ...prev, start: event.target.value }))}
                    />
                </label>
                <label className="logs-filter-field">
                    <span>To</span>
                    <input
                        type="date"
                        value={draftFilters.end}
                        onChange={(event) => setDraftFilters((prev) => ({ ...prev, end: event.target.value }))}
                    />
                </label>
                <div className="logs-filter-actions">
                    <button
                        type="submit"
                        className="admin-btn secondary small"
                        disabled={loading || !hasPendingFilterChanges}
                    >
                        Apply
                    </button>
                    <button
                        type="button"
                        className="admin-btn ghost small"
                        onClick={clearFilters}
                        disabled={loading || !hasActiveFilters}
                    >
                        Clear
                    </button>
                </div>
            </form>
            {hasActiveFilters && (
                <div className="logs-filter-summary" role="status">
                    Filters active: {[
                        filters.eventType ? `event=${filters.eventType}` : null,
                        filters.ip ? `ip~${filters.ip}` : null,
                        filters.endpoint ? `endpoint~${filters.endpoint}` : null,
                        filters.start ? `from=${filters.start}` : null,
                        filters.end ? `to=${filters.end}` : null,
                    ].filter(Boolean).join(' • ')}
                </div>
            )}

            <div className="logs-table-wrapper">
                <table className="admin-table logs-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Event</th>
                            <th>IP Address</th>
                            <th>Endpoint</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id} className={`log-row ${log.event_type}`}>
                                <td className="time-col">
                                    {new Date(log.created_at).toLocaleTimeString()}
                                    <span className="date-small">{new Date(log.created_at).toLocaleDateString()}</span>
                                </td>
                                <td>
                                    <span className={`event-badge ${log.event_type}`}>
                                        {log.event_type.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td className="ip-col">{log.ip_address}</td>
                                <td className="endpoint-col">{log.endpoint || '-'}</td>
                                <td className="details-col">
                                    <div className="metadata-json">
                                        {JSON.stringify(log.metadata)}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="empty-state">No security events yet. Lockouts and suspicious logins will appear here.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="logs-pagination">
                <span className="pagination-info">
                    Showing {startIndex}-{endIndex} of {total}
                </span>
                <div className="logs-pagination-actions">
                    <button
                        className="admin-btn secondary small"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={loading || page <= 1}
                    >
                        Prev
                    </button>
                    <span className="pagination-info">Page {page} of {totalPages}</span>
                    <button
                        className="admin-btn secondary small"
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={loading || page >= totalPages}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
