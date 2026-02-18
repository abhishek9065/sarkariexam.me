export type AdminNotificationType = 'success' | 'error' | 'warning' | 'info';

export interface AdminNotificationAction {
    label: string;
    callback: () => void;
}

export interface AdminNotification {
    id: string;
    type: AdminNotificationType;
    title: string;
    message: string;
    duration?: number;
    action?: AdminNotificationAction;
}
