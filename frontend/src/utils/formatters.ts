// Format date to readable string
export function formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Calculate days remaining from deadline
export function getDaysRemaining(deadline: string | undefined): number | null {
    if (!deadline) return null;
    return Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// Check if deadline is expired
export function isExpired(deadline: string | undefined): boolean {
    const days = getDaysRemaining(deadline);
    return days !== null && days < 0;
}

// Check if deadline is urgent (7 days or less)
export function isUrgent(deadline: string | undefined): boolean {
    const days = getDaysRemaining(deadline);
    return days !== null && days <= 7 && days >= 0;
}

// Convert VAPID key for push notifications
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Get badge color based on content type
export function getTypeBadgeColor(type: string): string {
    const colors: Record<string, string> = {
        'job': '#27AE60',
        'result': '#3498DB',
        'admit-card': '#9B59B6',
        'answer-key': '#E67E22',
        'admission': '#1ABC9C',
        'syllabus': '#34495E'
    };
    return colors[type] || '#666';
}

// Format date time to readable string (New)
export function formatDateTime(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// Format relative time (New)
export function formatTimeAgo(value?: string | null) {
    if (!value) return null; // or '-'
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const diffMs = Date.now() - date.getTime();
    const absMs = Math.abs(diffMs);
    const minutes = Math.round(absMs / 60000);
    const hours = Math.round(absMs / 3600000);
    const days = Math.round(absMs / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

// Validate URL (New)
export function isValidUrl(value?: string | null) {
    if (!value) return true;
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

export function formatNumber(value?: number | null, fallback = '0', locale = 'en-IN') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
    return value.toLocaleString(locale);
}
