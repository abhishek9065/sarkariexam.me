import { useState } from 'react';
import { Announcement } from '../../types';
import { ScheduleCalendar } from './ScheduleCalendar';

interface AdminQueueProps {
    items: Announcement[];
    stats: {
        overdue: number;
        upcoming24h: number;
        nextPublish?: string;
    };
    formatDateTime: (value?: string | null) => string;
    formatDate: (value?: string | null) => string;
    formatTime: (value?: string | null) => string;
    timeZoneLabel: string;
    onEdit: (item: Announcement) => void;
    onReschedule: (itemId: string, newDate: Date) => void;
    onPublishNow: (id: string) => void;
    onReject: (id: string) => void;
    onRefresh: () => void;
    onExport: () => void;
    onNewJob: () => void;
    lastUpdated: string | null;
    loading: boolean;
    canWrite?: boolean;
    canApprove?: boolean;
}

export function AdminQueue({
    items,
    stats,
    formatDateTime,
    formatDate,
    formatTime,
    timeZoneLabel,
    onEdit,
    onReschedule,
    onPublishNow,
    onReject,
    onRefresh,
    onExport,
    onNewJob,
    lastUpdated,
    loading,
    canWrite = true,
    canApprove = true,
}: AdminQueueProps) {
    const [view, setView] = useState<'list' | 'calendar'>('list');

    const formatLastUpdated = (value?: string | null) => {
        if (!value) return 'Not updated yet';
        const formatted = formatTime(value);
        return formatted === '-' ? 'Not updated yet' : formatted;
    };

    return (
        <div className="admin-list">
            <div className="admin-list-header">
                <div>
                    <h3>Scheduled queue</h3>
                    <p className="admin-subtitle">Review upcoming scheduled announcements and publish now if needed.</p>
                    <span className="admin-timezone-note">Times shown in {timeZoneLabel}</span>
                </div>
                <div className="admin-list-actions">
                    <span className="admin-updated">{formatLastUpdated(lastUpdated)}</span>
                    <div className="admin-toggle">
                        <button
                            type="button"
                            className={`admin-btn secondary ${view === 'list' ? 'active' : ''}`}
                            onClick={() => setView('list')}
                        >
                            List
                        </button>
                        <button
                            type="button"
                            className={`admin-btn secondary ${view === 'calendar' ? 'active' : ''}`}
                            onClick={() => setView('calendar')}
                        >
                            Calendar
                        </button>
                    </div>
                    <button type="button" className="admin-btn secondary" onClick={onRefresh} disabled={loading}>
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <button type="button" className="admin-btn secondary" onClick={onExport}>
                        Export CSV
                    </button>
                    {canWrite && <button type="button" className="admin-btn primary" onClick={onNewJob}>New job</button>}
                </div>
            </div>

            <div className="admin-user-grid">
                <div className="user-card">
                    <div className="card-label">Scheduled total</div>
                    <div className="card-value">{items.length}</div>
                </div>
                <div className="user-card">
                    <div className="card-label">Overdue</div>
                    <div className="card-value accent">{stats.overdue}</div>
                </div>
                <div className="user-card">
                    <div className="card-label">Next 24h</div>
                    <div className="card-value accent">{stats.upcoming24h}</div>
                </div>
                <div className="user-card">
                    <div className="card-label">Next publish</div>
                    <div className="card-value">{formatDateTime(stats.nextPublish)}</div>
                </div>
            </div>

            {view === 'calendar' && (
                <ScheduleCalendar
                    items={items}
                    onItemClick={canWrite ? onEdit : () => undefined}
                    onReschedule={canWrite ? onReschedule : () => undefined}
                />
            )}

            {items.length === 0 && view === 'list' ? (
                <div className="empty-state">No scheduled announcements yet. Set status to Scheduled with a publish time to see items here.</div>
            ) : view === 'list' ? (
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Publish at</th>
                                <th>Time</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        <div className="row-title">
                                            <span className="title-text">{item.title}</span>
                                            <span className="org-text">{item.organization}</span>
                                        </div>
                                    </td>
                                    <td>{formatDate(item.publishAt)}</td>
                                    <td>{formatTime(item.publishAt)}</td>
                                    <td>
                                        <span className="status-badge info">Scheduled</span>
                                    </td>
                                    <td>
                                        <div className="row-actions">
                                            {canWrite && <button type="button" className="admin-btn secondary small" onClick={() => onEdit(item)}>Edit</button>}
                                            {canApprove && <button type="button" className="admin-btn success small" onClick={() => onPublishNow(item.id)}>Publish Now</button>}
                                            {canApprove && <button type="button" className="admin-btn warning small" onClick={() => onReject(item.id)}>Reject</button>}
                                            {!canWrite && !canApprove && <span className="cell-muted">Read-only</span>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : null}
        </div>
    );
}
