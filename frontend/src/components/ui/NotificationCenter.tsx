import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './NotificationCenter.css';

const apiBase = import.meta.env.VITE_API_BASE ?? '';

type NotificationItem = {
    id: string;
    announcementId: string;
    title: string;
    type: string;
    slug?: string;
    source: string;
    organization?: string;
    createdAt: string;
    readAt?: string | null;
};

type AlertMatch = {
    id?: string;
    title?: string;
    type?: string;
    slug?: string;
    organization?: string;
    updatedAt?: string;
    postedAt?: string;
    createdAt?: string;
};

type AlertsPayload = {
    data?: {
        savedSearches?: Array<{ id?: string; matches?: AlertMatch[] }>;
        preferences?: { matches?: AlertMatch[] };
    };
};

export function NotificationCenter({ token }: { token: string | null }) {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [savedSearchCount, setSavedSearchCount] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);

    const buildItemsFromAlerts = (payload: AlertsPayload): NotificationItem[] => {
        const itemsList: NotificationItem[] = [];
        const seen = new Set<string>();

        const pushItem = (match: AlertMatch, source: string) => {
            if (!match?.id || !match?.title || !match?.type) return;
            if (seen.has(match.id)) return;
            seen.add(match.id);
            itemsList.push({
                id: `${source}:${match.id}`,
                announcementId: String(match.id),
                title: match.title,
                type: match.type,
                slug: match.slug,
                source,
                organization: match.organization,
                createdAt: match.updatedAt || match.postedAt || match.createdAt || new Date().toISOString(),
                readAt: null,
            });
        };

        const saved = payload.data?.savedSearches ?? [];
        saved.forEach((entry) => {
            const source = entry.id ? `saved:${entry.id}` : 'saved';
            (entry.matches ?? []).forEach((match) => pushItem(match, source));
        });

        const prefMatches = payload.data?.preferences?.matches ?? [];
        prefMatches.forEach((match) => pushItem(match, 'preferences'));

        return itemsList;
    };

    const fetchAlertsFallback = async (): Promise<boolean> => {
        if (!token) return false;
        try {
            const response = await fetch(`${apiBase}/api/profile/alerts?windowDays=7&limit=12`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) return false;
            const payload = (await response.json()) as AlertsPayload;
            const nextItems = buildItemsFromAlerts(payload);
            setItems(nextItems);
            setUnreadCount(nextItems.length);
            setSavedSearchCount(nextItems.filter((item) => item.source?.startsWith('saved')).length);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    const fetchNotifications = async () => {
        if (!token) return;
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${apiBase}/api/profile/notifications?limit=12`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                const fallbackOk = await fetchAlertsFallback();
                if (!fallbackOk) {
                    setError('Unable to load alerts.');
                }
                return;
            }
            const payload = await response.json();
            setItems(payload.data ?? []);
            setUnreadCount(payload.unreadCount ?? 0);
            setSavedSearchCount(
                (payload.data ?? []).filter((item: NotificationItem) => item.source?.startsWith('saved')).length
            );
        } catch (err) {
            console.error(err);
            const fallbackOk = await fetchAlertsFallback();
            if (!fallbackOk) {
                setError('Unable to load alerts.');
            }
        } finally {
            setLoading(false);
        }
    };

    const markAllRead = async () => {
        if (!token) return;
        try {
            await fetch(`${apiBase}/api/profile/notifications/read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ all: true }),
            });
            setItems((prev) => prev.map((item) => ({ ...item, readAt: new Date().toISOString() })));
            setUnreadCount(0);
        } catch (err) {
            console.error(err);
        }
    };

    const markRead = async (id: string) => {
        if (!token) return;
        try {
            await fetch(`${apiBase}/api/profile/notifications/read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ids: [id] }),
            });
            setItems((prev) => prev.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)));
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (!open) return;
        fetchNotifications();
    }, [open]);

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        if (open) {
            document.addEventListener('click', handleClick);
        }
        return () => document.removeEventListener('click', handleClick);
    }, [open]);

    if (!token) return null;

    return (
        <div className="notification-center" ref={containerRef}>
            <button
                className="notification-trigger"
                onClick={(event) => {
                    event.stopPropagation();
                    setOpen((prev) => !prev);
                }}
                aria-label="Notifications"
            >
                <span className="notification-icon">🔔</span>
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>

            {open && (
                <div className="notification-panel" onClick={(event) => event.stopPropagation()}>
                    <div className="notification-header">
                        <div>
                            <h4>Alerts</h4>
                            <span className="notification-subtitle">Latest matches and updates</span>
                        </div>
                        <button className="admin-btn secondary small" onClick={markAllRead}>Mark all read</button>
                    </div>

                    {loading ? (
                        <div className="notification-state">Loading alerts...</div>
                    ) : error ? (
                        <div className="notification-state error">{error}</div>
                    ) : items.length === 0 ? (
                        <div className="notification-state">No new alerts yet.</div>
                    ) : (
                        <div className="notification-list">
                            {items.map((item) => {
                                const isRead = Boolean(item.readAt);
                                return (
                                    <button
                                        key={item.id}
                                        className={`notification-item ${isRead ? 'read' : ''}`}
                                        onClick={() => {
                                            markRead(item.id);
                                            if (item.slug) {
                                                navigate(`/${item.type}/${item.slug}?source=notification`);
                                            }
                                            setOpen(false);
                                        }}
                                    >
                                        <div>
                                            <div className="notification-title">{item.title}</div>
                                            <div className="notification-meta">
                                                {item.source?.startsWith('saved') ? 'Saved search' : 'Preferences'} • {new Date(item.createdAt).toLocaleDateString('en-IN')}
                                            </div>
                                        </div>
                                        <span className="notification-type">{item.type}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="notification-footer">
                        {savedSearchCount === 0 && (
                            <button className="admin-btn secondary" onClick={() => navigate('/profile')}>
                                Create a saved search
                            </button>
                        )}
                        <button className="admin-btn primary" onClick={() => navigate('/profile')}>
                            View all alerts
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationCenter;
