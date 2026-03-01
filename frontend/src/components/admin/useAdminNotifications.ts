import { useState } from 'react';
import type { AdminNotification } from './AdminNotification.types';

export function useAdminNotifications() {
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);

    const addNotification = (notification: Omit<AdminNotification, 'id'>) => {
        const id = crypto.randomUUID();
        const newNotification = {
            ...notification,
            id,
            duration: notification.duration || 5000,
        };

        setNotifications(prev => [...prev, newNotification]);

        return id;
    };

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    // Convenience methods
    const notifySuccess = (title: string, message: string, duration?: number) =>
        addNotification({ type: 'success', title, message, duration });

    const notifyError = (title: string, message: string, duration?: number) =>
        addNotification({ type: 'error', title, message, duration });

    const notifyWarning = (title: string, message: string, duration?: number) =>
        addNotification({ type: 'warning', title, message, duration });

    const notifyInfo = (title: string, message: string, duration?: number) =>
        addNotification({ type: 'info', title, message, duration });

    return {
        notifications,
        addNotification,
        removeNotification,
        clearAll,
        notifySuccess,
        notifyError,
        notifyWarning,
        notifyInfo,
    };
}
