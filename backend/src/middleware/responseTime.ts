import { Request, Response, NextFunction } from 'express';

import { recordActiveUser } from '../services/activeUsers.js';

interface RequestLog {
    method: string;
    path: string;
    duration: number;
    status: number;
    timestamp: string;
    ip: string;
}

// Store recent logs for analytics
const recentLogs: RequestLog[] = [];
const MAX_LOGS = 1000;

/**
 * Response time logging middleware
 * Logs request duration, status, and path for performance monitoring
 */
export function responseTimeLogger(req: Request, res: Response, next: NextFunction) {
    const startTime = process.hrtime();

    // Log when response finishes
    res.on('finish', () => {
        recordActiveUser(req);
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const durationMs = Math.round((seconds * 1000) + (nanoseconds / 1000000));

        const log: RequestLog = {
            method: req.method,
            path: req.path,
            duration: durationMs,
            status: res.statusCode,
            timestamp: new Date().toISOString(),
            ip: req.ip || 'unknown',
        };

        // Store for analytics
        recentLogs.push(log);
        if (recentLogs.length > MAX_LOGS) {
            recentLogs.shift();
        }

        // Log slow requests (> 500ms)
        if (durationMs > 500) {
            console.warn(`[SLOW] ${req.method} ${req.path} - ${durationMs}ms (${res.statusCode})`);
        }

        // Log errors
        if (res.statusCode >= 400) {
            console.error(`[ERROR] ${req.method} ${req.path} - ${durationMs}ms (${res.statusCode})`);
        }
    });

    next();
}

/**
 * Get performance stats for the API
 */
export function getPerformanceStats() {
    if (recentLogs.length === 0) {
        return { avgResponseTime: 0, totalRequests: 0, errorRate: 0 };
    }

    const totalDuration = recentLogs.reduce((sum, log) => sum + log.duration, 0);
    const errorCount = recentLogs.filter(log => log.status >= 400).length;

    return {
        avgResponseTime: Math.round(totalDuration / recentLogs.length),
        totalRequests: recentLogs.length,
        errorRate: Math.round((errorCount / recentLogs.length) * 100),
        slowRequests: recentLogs.filter(log => log.duration > 500).length,
        recentErrors: recentLogs.filter(log => log.status >= 400).slice(-10),
    };
}

export default responseTimeLogger;
