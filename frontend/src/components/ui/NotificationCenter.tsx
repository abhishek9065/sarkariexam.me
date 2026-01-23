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

export function NotificationCenter({ token }: { token: string | null }) {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [savedSearchCount, setSavedSearchCount] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        if (!token) return;
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${apiBase}/api/profile/notifications?limit=12`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                setError('Unable to load alerts.');
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
            setError('Unable to load alerts.');
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
            <button className="notification-trigger" onClick={() => setOpen(!open)} aria-label="Notifications">
                <span className="notification-icon">🔔</span>
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>

            {open && (
                <div className="notification-panel">
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
