import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './NotificationCenter.css';

type NotificationItem = {
    id: string;
    title: string;
    type: string;
    slug: string;
    organization?: string;
    createdAt: string;
    source: string;
};

const apiBase = import.meta.env.VITE_API_BASE ?? '';

export function NotificationCenter() {
    const navigate = useNavigate();
    const { token, user, isAuthenticated } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());

    const storageKey = useMemo(() => {
        if (!user) return null;
        return `notifications_read_${user.id ?? user.email}`;
    }, [user]);

    useEffect(() => {
        if (!storageKey) return;
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        try {
            const saved = JSON.parse(raw) as string[];
            setReadIds(new Set(saved));
        } catch {
            localStorage.removeItem(storageKey);
        }
    }, [storageKey]);

    const unreadCount = notifications.filter((item) => !readIds.has(item.id)).length;

    const updateReadIds = (next: Set<string>) => {
        setReadIds(next);
        if (storageKey) {
            localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
        }
    };

    const markRead = (id: string) => {
        const next = new Set(readIds);
        next.add(id);
        updateReadIds(next);
    };

    const markAllRead = () => {
        const next = new Set(readIds);
        notifications.forEach((item) => next.add(item.id));
        updateReadIds(next);
    };

    const buildNotifications = (alerts: any) => {
        const items: NotificationItem[] = [];
        if (!alerts) return items;

        for (const search of alerts.savedSearches || []) {
            for (const match of search.matches || []) {
                items.push({
                    id: match.id,
                    title: match.title,
                    type: match.type,
                    slug: match.slug,
                    organization: match.organization,
                    createdAt: match.updatedAt || match.postedAt || new Date().toISOString(),
                    source: `Saved search: ${search.name}`,
                });
            }
        }

        for (const match of alerts.preferences?.matches || []) {
            items.push({
                id: match.id,
                title: match.title,
                type: match.type,
                slug: match.slug,
                organization: match.organization,
                createdAt: match.updatedAt || match.postedAt || new Date().toISOString(),
                source: 'Preferences',
            });
        }

        const unique = new Map<string, NotificationItem>();
        for (const item of items) {
            const existing = unique.get(item.id);
            if (!existing || new Date(item.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
                unique.set(item.id, item);
            }
        }

        return Array.from(unique.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    };

    const fetchNotifications = async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                windowDays: '7',
                limit: '5',
            });
            const res = await fetch(`${apiBase}/api/profile/alerts?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                setError('Unable to load alerts');
                setNotifications([]);
                return;
            }
            const payload = await res.json();
            const items = buildNotifications(payload.data);
            setNotifications(items);
        } catch (err) {
            console.error(err);
            setError('Unable to load alerts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!open || !isAuthenticated) return;
        fetchNotifications();
    }, [open, isAuthenticated, token]);

    if (!isAuthenticated) return null;

    return (
        <div className="notification-center">
            <button className="notification-trigger" onClick={() => setOpen((value) => !value)}>
                <span className="notification-icon" aria-hidden="true">🔔</span>
                {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
            </button>
            {open && (
                <div className="notification-panel">
                    <div className="notification-header">
                        <div>
                            <h4>Alerts</h4>
                            <span className="notification-subtitle">Recent matches from saved searches and preferences.</span>
                        </div>
                        <div className="notification-actions">
                            <button className="admin-btn secondary small" onClick={fetchNotifications} disabled={loading}>
                                {loading ? 'Refreshing...' : 'Refresh'}
                            </button>
                            <button className="admin-btn secondary small" onClick={markAllRead} disabled={notifications.length === 0}>
                                Mark all read
                            </button>
                        </div>
                    </div>
                    {loading ? (
                        <div className="notification-empty">Loading alerts...</div>
                    ) : error ? (
                        <div className="notification-empty">{error}</div>
                    ) : notifications.length === 0 ? (
                        <div className="notification-empty">No alerts yet. Save a search to get notified.</div>
                    ) : (
                        <div className="notification-list">
                            {notifications.map((item) => {
                                const isUnread = !readIds.has(item.id);
                                return (
                                    <button
                                        key={item.id}
                                        className={`notification-item ${isUnread ? 'unread' : ''}`}
                                        onClick={() => {
                                            markRead(item.id);
                                            navigate(`/${item.type}/${item.slug}`);
                                            setOpen(false);
                                        }}
                                    >
                                        <div>
                                            <div className="notification-title">{item.title}</div>
                                            <div className="notification-meta">
                                                <span>{item.organization || 'Unknown'}</span>
                                                <span className="meta-sep">|</span>
                                                <span>{item.source}</span>
                                            </div>
                                        </div>
                                        <span className="notification-time">{new Date(item.createdAt).toLocaleDateString('en-IN')}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default NotificationCenter;
