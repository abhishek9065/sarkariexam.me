import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Announcement } from '../../types';
import './NotificationCenter.css';

const apiBase = import.meta.env.VITE_API_BASE ?? '';

type NotificationItem = {
    id: string;
    title: string;
    type: string;
    slug?: string;
    source: string;
    timestamp: string;
};

const getStorageKey = (userId?: string) => `notifications_read_${userId || 'guest'}`;

export function NotificationCenter({ token, userId }: { token: string | null; userId?: string }) {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [savedSearchCount, setSavedSearchCount] = useState(0);

    const readIds = useMemo(() => {
        if (!userId) return new Set<string>();
        try {
            const stored = localStorage.getItem(getStorageKey(userId));
            if (!stored) return new Set<string>();
            return new Set<string>(JSON.parse(stored));
        } catch {
            return new Set<string>();
        }
    }, [userId]);

    const unreadCount = useMemo(() => {
        if (!items.length) return 0;
        return items.filter((item) => !readIds.has(item.id)).length;
    }, [items, readIds]);

    const persistReadIds = (next: Set<string>) => {
        if (!userId) return;
        localStorage.setItem(getStorageKey(userId), JSON.stringify(Array.from(next)));
    };

    const markAllRead = () => {
        const next = new Set(readIds);
        items.forEach((item) => next.add(item.id));
        persistReadIds(next);
        setItems([...items]);
    };

    const markRead = (id: string) => {
        const next = new Set(readIds);
        next.add(id);
        persistReadIds(next);
        setItems([...items]);
    };

    const normalizeAnnouncement = (item: Announcement, source: string): NotificationItem => {
        const timestamp = item.postedAt || item.updatedAt || new Date().toISOString();
        return {
            id: `${item.id}:${source}`,
            title: item.title,
            type: item.type,
            slug: item.slug,
            source,
            timestamp,
        };
    };

    const fetchNotifications = async () => {
        if (!token) return;
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${apiBase}/api/profile/alerts?windowDays=7&limit=6`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                setError('Unable to load alerts.');
                return;
            }
            const payload = await response.json();
            const savedSearches = payload.data?.savedSearches ?? [];
            const preferences = payload.data?.preferences?.matches ?? [];

            const savedItems = savedSearches.flatMap((entry: any) =>
                (entry.matches ?? []).map((match: Announcement) => normalizeAnnouncement(match, `saved:${entry.id}`))
            );
            const preferenceItems = preferences.map((match: Announcement) => normalizeAnnouncement(match, 'preferences'));

            const combined = [...savedItems, ...preferenceItems]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 12);

            setSavedSearchCount(savedSearches.length);
            setItems(combined);
        } catch (err) {
            console.error(err);
            setError('Unable to load alerts.');
        } finally {
            setLoading(false);
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
                                const isRead = readIds.has(item.id);
                                return (
                                    <button
                                        key={item.id}
                                        className={`notification-item ${isRead ? 'read' : ''}`}
                                        onClick={() => {
                                            markRead(item.id);
                                            if (item.slug) {
                                                navigate(`/${item.type}/${item.slug}`);
                                            }
                                            setOpen(false);
                                        }}
                                    >
                                        <div>
                                            <div className="notification-title">{item.title}</div>
                                            <div className="notification-meta">
                                                {item.source.startsWith('saved') ? 'Saved search' : 'Preferences'} • {new Date(item.timestamp).toLocaleDateString('en-IN')}
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
