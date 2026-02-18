import { createContext, useContext } from 'react';

import type { AdminNotification } from './AdminNotification.types';

export interface AdminNotificationsContextValue {
    notifications: AdminNotification[];
    addNotification: (notification: Omit<AdminNotification, 'id'>) => string;
    removeNotification: (id: string) => void;
    clearAll: () => void;
    notifySuccess: (title: string, message: string, duration?: number) => string;
    notifyError: (title: string, message: string, duration?: number) => string;
    notifyWarning: (title: string, message: string, duration?: number) => string;
    notifyInfo: (title: string, message: string, duration?: number) => string;
}

export const AdminNotificationsContext = createContext<AdminNotificationsContextValue | null>(null);

export function useAdminNotifications() {
    const context = useContext(AdminNotificationsContext);
    if (!context) {
        throw new Error('useAdminNotifications must be used within AdminNotificationsProvider');
    }
    return context;
}
