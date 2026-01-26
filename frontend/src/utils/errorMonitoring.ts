import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const environment = import.meta.env.MODE;

let initialized = false;

export function initErrorMonitoring() {
    if (initialized) return;
    if (!dsn) return;
    if (typeof window === 'undefined') return;

    try {
        Sentry.init({
            dsn,
            environment,
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

