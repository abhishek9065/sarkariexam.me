import { useState, useEffect } from 'react';

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

const apiBase = import.meta.env.VITE_API_BASE ?? '';

export function NotificationPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        // Check if notifications are supported
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            return;
        }

        setPermission(Notification.permission);

        // Check if dismissed recently (7-day cooldown)
        const dismissed = localStorage.getItem('notification_prompt_dismissed');
        if (dismissed) {
            const dismissedTime = parseInt(dismissed, 10);
            const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
            if (daysSinceDismissed < 7) {
                return; // Don't show if dismissed within last 7 days
            }
        }

        // Show prompt if permission not decided
        if (Notification.permission === 'default') {
            // Delay the prompt a bit for better UX
            const timer = setTimeout(() => setShowPrompt(true), 3000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAllow = async () => {
        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);
            setShowPrompt(false);

            if (perm === 'granted') {
                // Subscribe to push notifications
                const registration = await navigator.serviceWorker.ready;

                // Get VAPID public key from backend
                const response = await fetch(`${apiBase}/api/push/vapid-public-key`);

                // Check if VAPID keys are configured
                if (!response.ok) {
                    console.log('Push notifications not configured on server');
                    return;
                }

                const { publicKey } = await response.json();

                if (!publicKey) {
                    console.log('No VAPID public key available');
                    return;
                }

                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
                });

                // Send subscription to backend
                await fetch(`${apiBase}/api/push/subscribe`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(subscription.toJSON()),
                });

                console.log('Push subscription saved');
            }
        } catch (error) {
            console.error('Failed to subscribe to push:', error);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('notification_prompt_dismissed', Date.now().toString());
    };

    if (!showPrompt || permission !== 'default') return null;

    return (
        <div className="notification-prompt">
            <div className="notification-prompt-content">
                <span className="notification-icon">🔔</span>
                <div className="notification-text">
                    <strong>Enable Notifications</strong>
                    <p>Get instant alerts for new jobs, results & admit cards!</p>
                </div>
                <div className="notification-buttons">
                    <button onClick={handleDismiss} className="notification-btn dismiss">Later</button>
                    <button onClick={handleAllow} className="notification-btn allow">Allow</button>
                </div>
            </div>
        </div>
    );
}

export default NotificationPrompt;
