import { useState } from 'react';
import { Announcement } from '../../types';
import { ScheduleCalendar } from './ScheduleCalendar';
import { formatDateTime } from '../../utils/formatters';

interface AdminQueueProps {
    items: Announcement[];
    stats: {
        overdue: number;
        upcoming24h: number;
        nextPublish?: string;
    };
    onEdit: (item: Announcement) => void;
    onReschedule: (itemId: string, newDate: Date) => void;
    onPublishNow: (id: string) => void;
    onReject: (id: string) => void;
    onRefresh: () => void;
    onExport: () => void;
    onNewJob: () => void;
    lastUpdated: string | null;
    loading: boolean;
}

export function AdminQueue({
    items,
    stats,
    onEdit,
    onReschedule,
    onPublishNow,
    onReject,
    onRefresh,
    onExport,
    onNewJob,
    lastUpdated,
    loading
}: AdminQueueProps) {
    const [view, setView] = useState<'list' | 'calendar'>('list');

    const formatLastUpdated = (value?: string | null) => {
        if (!value) return 'Not updated yet';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Not updated yet';
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="admin-list">
            <div className="admin-list-header">
                <div>
                    <h3>Scheduled queue</h3>
                    <p className="admin-subtitle">Review upcoming scheduled announcements and publish now if needed.</p>
                </div>
                <div className="admin-list-actions">
                    <span className="admin-updated">{formatLastUpdated(lastUpdated)}</span>
                    <div className="admin-toggle">
                        <button
                            className={`admin-btn secondary ${view === 'list' ? 'active' : ''}`}
                            onClick={() => setView('list')}
                        >
                            List
                        </button>
                        <button
                            className={`admin-btn secondary ${view === 'calendar' ? 'active' : ''}`}
                            onClick={() => setView('calendar')}
                        >
                            Calendar
                        </button>
                    </div>
                    <button className="admin-btn secondary" onClick={onRefresh} disabled={loading}>
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <button className="admin-btn secondary" onClick={onExport}>
                        Export CSV
                    </button>
                    <button className="admin-btn primary" onClick={onNewJob}>New job</button>
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
                    onItemClick={onEdit}
                    onReschedule={onReschedule}
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
                                    <td>{new Date(item.publishAt || '').toLocaleDateString('en-IN', {
                                        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                                    })}</td>
                                    <td>{new Date(item.publishAt || '').toLocaleTimeString('en-IN', {
                                        hour: '2-digit', minute: '2-digit'
                                    })}</td>
                                    <td>
                                        <span className="status-badge info">Scheduled</span>
                                    </td>
                                    <td>
                                        <div className="row-actions">
                                            <button className="admin-btn secondary small" onClick={() => onEdit(item)}>Edit</button>
                                            <button className="admin-btn success small" onClick={() => onPublishNow(item.id)}>Publish Now</button>
                                            <button className="admin-btn warning small" onClick={() => onReject(item.id)}>Reject</button>
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
