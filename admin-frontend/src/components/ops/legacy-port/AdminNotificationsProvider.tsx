import { useMemo, useState, type ReactNode } from 'react';

import { AdminNotificationsContext } from './AdminNotificationsContext';
import type { AdminNotification } from './AdminNotification.types';
import { AdminNotificationSystem } from './AdminNotificationSystem';

interface AdminNotificationsProviderProps {
    children: ReactNode;
}

export function AdminNotificationsProvider({ children }: AdminNotificationsProviderProps) {
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);

    const addNotification = (notification: Omit<AdminNotification, 'id'>) => {
        const id = crypto.randomUUID();
        const nextNotification: AdminNotification = {
            ...notification,
            id,
            duration: notification.duration || 5000,
        };
        setNotifications((current) => [...current, nextNotification]);
        return id;
    };

    const removeNotification = (id: string) => {
        setNotifications((current) => current.filter((item) => item.id !== id));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    const value = useMemo(() => ({
        notifications,
        addNotification,
        removeNotification,
        clearAll,
        notifySuccess: (title: string, message: string, duration?: number) => addNotification({ type: 'success', title, message, duration }),
        notifyError: (title: string, message: string, duration?: number) => addNotification({ type: 'error', title, message, duration }),
        notifyWarning: (title: string, message: string, duration?: number) => addNotification({ type: 'warning', title, message, duration }),
        notifyInfo: (title: string, message: string, duration?: number) => addNotification({ type: 'info', title, message, duration }),
    }), [notifications]);

    return (
        <AdminNotificationsContext.Provider value={value}>
            {children}
            <AdminNotificationSystem notifications={notifications} onRemove={removeNotification} />
        </AdminNotificationsContext.Provider>
    );
}
