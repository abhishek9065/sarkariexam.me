import { useEffect, useState } from 'react';

import type { AdminNotification } from './AdminNotification.types';

interface AdminNotificationSystemProps {
    notifications: AdminNotification[];
    onRemove: (id: string) => void;
}

export function AdminNotificationSystem({ notifications, onRemove }: AdminNotificationSystemProps) {
    return (
        <div className="ops-notification-stack" aria-live="polite" aria-relevant="additions text">
            {notifications.map((notification) => (
                <AdminNotificationItem
                    key={notification.id}
                    notification={notification}
                    onRemove={onRemove}
                />
            ))}
        </div>
    );
}

interface AdminNotificationItemProps {
    notification: AdminNotification;
    onRemove: (id: string) => void;
}

function AdminNotificationItem({ notification, onRemove }: AdminNotificationItemProps) {
    const [visible, setVisible] = useState(false);
    const [removing, setRemoving] = useState(false);

    const handleRemove = () => {
        setRemoving(true);
        window.setTimeout(() => onRemove(notification.id), 220);
    };

    useEffect(() => {
        const entrance = window.setTimeout(() => setVisible(true), 20);
        const removeAfter = notification.duration && notification.duration > 0
            ? window.setTimeout(() => {
                setRemoving(true);
                window.setTimeout(() => onRemove(notification.id), 220);
            }, notification.duration)
            : null;

        return () => {
            window.clearTimeout(entrance);
            if (removeAfter) window.clearTimeout(removeAfter);
        };
    }, [notification.duration, notification.id, onRemove]);

    const icon = notification.type === 'success'
        ? 'ok'
        : notification.type === 'error'
            ? 'err'
            : notification.type === 'warning'
                ? 'warn'
                : 'info';

    return (
        <div className={`ops-notification ${notification.type}${visible ? ' visible' : ''}${removing ? ' removing' : ''}`}>
            <div className="ops-notification-head">
                <span className="ops-notification-icon">{icon}</span>
                <strong>{notification.title}</strong>
                <button type="button" className="admin-btn ghost small" onClick={handleRemove} aria-label="Dismiss notification">x</button>
            </div>
            <p className="ops-inline-muted">{notification.message}</p>
            {notification.action ? (
                <button type="button" className="admin-btn small" onClick={notification.action.callback}>
                    {notification.action.label}
                </button>
            ) : null}
        </div>
    );
}
