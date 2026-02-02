export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface AdminNotification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    duration?: number;
    action?: {
        label: string;
        callback: () => void;
    };
}
