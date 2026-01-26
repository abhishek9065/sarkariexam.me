/**
 * Sentry Error Tracking Service
 * Uses official @sentry/node SDK
 */

import * as Sentry from '@sentry/node';

// Clean DSN (remove any leading slashes)
const rawDsn = process.env.SENTRY_DSN || '';
const SENTRY_DSN = rawDsn.replace(/^\/+/, '').trim();

let isInitialized = false;

/**
 * Initialize Sentry (call at app startup)
 */
export function initSentry(): void {
    if (!SENTRY_DSN || !SENTRY_DSN.startsWith('https://')) {
        console.log('[Sentry] Not configured - SENTRY_DSN missing or invalid');
        return;
    }

    try {
        Sentry.init({
            dsn: SENTRY_DSN,
            environment: process.env.NODE_ENV || 'development',
            release: process.env.SENTRY_RELEASE || process.env.APP_VERSION,
            tracesSampleRate: 1.0,
            debug: false, // Set to true for debugging
        });

        isInitialized = true;
        console.log('[Sentry] Initialized with DSN:', SENTRY_DSN.substring(0, 40) + '...');
    } catch (error) {
        console.error('[Sentry] Failed to initialize:', error);
    }
}

/**
 * Capture an exception
 */
export function captureException(
    error: Error,
    context?: Record<string, any>
): void {
    console.error('[Error]', error.message, context || '');

    if (isInitialized) {
        Sentry.captureException(error, {
            extra: context,
        });
    }
}

/**
 * Capture a message/warning
 */
export function captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info'
): void {
    console.log(`[${level.toUpperCase()}]`, message);

    if (isInitialized) {
        Sentry.captureMessage(message, level);
    }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: {
    category: string;
    message: string;
    level?: Sentry.SeverityLevel;
}): void {
    if (isInitialized) {
        Sentry.addBreadcrumb(breadcrumb);
    }
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string }): void {
    if (isInitialized) {
        Sentry.setUser(user);
    }
}

/**
 * Clear user context (on logout)
 */
export function clearUser(): void {
    if (isInitialized) {
        Sentry.setUser(null);
    }
}

/**
 * Get recent errors (local fallback - not used with Sentry SDK)
 */
export function getRecentErrors(): Array<any> {
    return []; // Sentry handles this in their dashboard
}

/**
 * Express error handler middleware
 */
export function errorHandler(err: Error, req: any, res: any, next: any): void {
    captureException(err, {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

    if (res.headersSent) {
        return next(err);
    }

    res.status(500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
}

export const ErrorTracking = {
    init: initSentry,
    captureException,
    captureMessage,
    addBreadcrumb,
    setUser,
    clearUser,
    getRecentErrors,
    errorHandler,
    isInitialized: () => isInitialized,
};

export default ErrorTracking;
