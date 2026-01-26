import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const environment = import.meta.env.MODE;
const release = (import.meta.env.VITE_SENTRY_RELEASE || import.meta.env.VITE_APP_VERSION) as string | undefined;
const apiBase = import.meta.env.VITE_API_BASE ?? '';

let initialized = false;

export function initErrorMonitoring() {
    if (initialized) return;
    if (!dsn) return;
    if (typeof window === 'undefined') return;

    try {
        Sentry.init({
            dsn,
            environment,
            release,
            tracesSampleRate: 0.05,
            normalizeDepth: 5,
        });
        initialized = true;
    } catch (error) {
        console.error('[Sentry] Init failed:', error);
    }
}

export function captureError(error: Error, context?: { componentStack?: string }, errorId?: string) {
    if (!dsn) return;
    try {
        Sentry.withScope((scope) => {
            if (errorId) scope.setTag('error_id', errorId);
            if (context?.componentStack) scope.setExtra('componentStack', context.componentStack);
            Sentry.captureException(error);
        });
    } catch (err) {
        console.error('[Sentry] Capture failed:', err);
    }
}

export async function reportIssue(input: {
    errorId: string;
    message: string;
    note?: string;
    stack?: string;
    componentStack?: string;
}) {
    try {
        const token = localStorage.getItem('authToken');
        await fetch(`${apiBase}/api/support/error-report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
                ...input,
                pageUrl: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
            }),
        });
    } catch (error) {
        console.error('[ErrorReport] Failed to submit report:', error);
    }
}
