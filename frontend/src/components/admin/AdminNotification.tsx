import { useState, useEffect } from 'react';
import './AdminNotification.css';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface AdminNotification {
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

interface AdminNotificationProps {
    notifications: AdminNotification[];
    onRemove: (id: string) => void;
}

export function AdminNotificationSystem({ notifications, onRemove }: AdminNotificationProps) {
    return (
        <div className="admin-notifications-container">
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
    const [isVisible, setIsVisible] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    useEffect(() => {
        // Trigger entrance animation
        const timer = setTimeout(() => setIsVisible(true), 50);
        
        // Auto-remove after duration
        if (notification.duration && notification.duration > 0) {
            const removeTimer = setTimeout(() => {
                handleRemove();
            }, notification.duration);
            
            return () => {
                clearTimeout(timer);
                clearTimeout(removeTimer);
            };
        }
        
        return () => clearTimeout(timer);
    }, [notification.duration]);

    const handleRemove = () => {
        setIsRemoving(true);
        setTimeout(() => onRemove(notification.id), 300);
    };

    const getIcon = () => {
        switch (notification.type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return 'ℹ️';
        }
    };

    return (
        <div 
            className={`admin-notification ${notification.type} ${isVisible ? 'visible' : ''} ${isRemoving ? 'removing' : ''}`}
        >
            <div className="notification-content">
                <div className="notification-header">
                    <span className="notification-icon">{getIcon()}</span>
                    <h4 className="notification-title">{notification.title}</h4>
                    <button 
                        className="notification-close"
                        onClick={handleRemove}
                        aria-label="Close notification"
                    >
                        ×
                    </button>
                </div>
                <p className="notification-message">{notification.message}</p>
                {notification.action && (
                    <button 
                        className="notification-action"
                        onClick={notification.action.callback}
                    >
                        {notification.action.label}
                    </button>
                )}
            </div>
            <div className="notification-progress"></div>
        </div>
    );
}

// Hook for managing notifications
export function useAdminNotifications() {
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);

    const addNotification = (notification: Omit<AdminNotification, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
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