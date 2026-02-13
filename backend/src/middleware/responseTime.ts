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
        recordActiveUser(req).catch((error) => {
            console.error('[ActiveUsers] Failed to record active user:', error);
        });
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

const percentile = (values: number[], percentileRank: number): number => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(
        sorted.length - 1,
        Math.max(0, Math.ceil((percentileRank / 100) * sorted.length) - 1)
    );
    return sorted[index];
};

export function getAdminSloSnapshot(options?: {
    windowMinutes?: number;
    p95TargetMs?: number;
    errorRateTargetPct?: number;
}): {
    windowMinutes: number;
    requestCount: number;
    errorRatePct: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    objectives: {
        p95TargetMs: number;
        errorRateTargetPct: number;
    };
    status: {
        meetsP95: boolean;
        meetsErrorRate: boolean;
        healthy: boolean;
    };
} {
    const windowMinutes = Math.max(1, options?.windowMinutes ?? 15);
    const p95TargetMs = Math.max(100, options?.p95TargetMs ?? 1200);
    const errorRateTargetPct = Math.max(0, options?.errorRateTargetPct ?? 1);
    const cutoffTime = Date.now() - windowMinutes * 60 * 1000;

    const adminLogs = recentLogs.filter((log) => {
        const isAdminPath = log.path.startsWith('/api/admin') || log.path.startsWith('/api/auth/admin');
        if (!isAdminPath) return false;
        const timestamp = new Date(log.timestamp).getTime();
        return Number.isFinite(timestamp) && timestamp >= cutoffTime;
    });

    if (adminLogs.length === 0) {
        return {
            windowMinutes,
            requestCount: 0,
            errorRatePct: 0,
            p50Ms: 0,
            p95Ms: 0,
            p99Ms: 0,
            objectives: {
                p95TargetMs,
                errorRateTargetPct,
            },
            status: {
                meetsP95: true,
                meetsErrorRate: true,
                healthy: true,
            },
        };
    }

    const durations = adminLogs.map((log) => log.duration);
    const errorCount = adminLogs.filter((log) => log.status >= 500).length;
    const errorRatePct = Number(((errorCount / adminLogs.length) * 100).toFixed(2));
    const p50Ms = percentile(durations, 50);
    const p95Ms = percentile(durations, 95);
    const p99Ms = percentile(durations, 99);
    const meetsP95 = p95Ms <= p95TargetMs;
    const meetsErrorRate = errorRatePct <= errorRateTargetPct;

    return {
        windowMinutes,
        requestCount: adminLogs.length,
        errorRatePct,
        p50Ms,
        p95Ms,
        p99Ms,
        objectives: {
            p95TargetMs,
            errorRateTargetPct,
        },
        status: {
            meetsP95,
            meetsErrorRate,
            healthy: meetsP95 && meetsErrorRate,
        },
    };
}

export default responseTimeLogger;
