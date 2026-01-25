import { Request, Response, NextFunction } from 'express';

import { SecurityLogger } from '../services/securityLogger.js';

import { getRealIp } from './cloudflare.js';

/**
 * In-memory rate limiter
 * Simple and efficient for single-server deployments
 */

// In-memory store for rate limiting
const memoryStore = new Map<string, { count: number; resetTime: number }>();
const MAX_STORE_SIZE = 10000; // Max distinct IPs to track

interface RateLimitOptions {
    windowMs?: number;  // Time window in milliseconds
    maxRequests?: number;  // Max requests per window
    keyPrefix?: string;  // Prefix for rate limit key (e.g., 'api', 'auth')
}

/**
 * In-memory rate limit check
 */
function checkRateLimitMemory(
    key: string,
    maxRequests: number,
    windowMs: number
): { allowed: boolean; count: number; resetTime: number } {
    const now = Date.now();
    const data = memoryStore.get(key);

    if (!data || now > data.resetTime) {
        // New window - limit memory usage
        if (memoryStore.size >= MAX_STORE_SIZE) {
            const firstKey = memoryStore.keys().next().value;
            if (firstKey) memoryStore.delete(firstKey);
        }
        memoryStore.set(key, { count: 1, resetTime: now + windowMs });
        return { allowed: true, count: 1, resetTime: now + windowMs };
    }

    data.count++;
    return {
        allowed: data.count <= maxRequests,
        count: data.count,
        resetTime: data.resetTime
    };
}

/**
 * Rate limit middleware factory
 */
export function rateLimit(options: RateLimitOptions = {}) {
    const windowMs = options.windowMs || 60000; // 1 minute default
    const maxRequests = options.maxRequests || 100; // 100 requests default
    const keyPrefix = options.keyPrefix || 'rl';

    return async (req: Request, res: Response, next: NextFunction) => {
        const clientIp = getRealIp(req);
        const key = `${keyPrefix}:${clientIp}`;

        const result = checkRateLimitMemory(key, maxRequests, windowMs);

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - result.count));
        res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

        if (!result.allowed) {
            const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
            SecurityLogger.log({
                ip_address: clientIp,
                event_type: 'rate_limit',
                endpoint: req.originalUrl || req.url,
                metadata: {
                    limit: maxRequests,
                    windowMs,
                    userAgent: req.headers['user-agent']
                }
            });

            res.setHeader('Retry-After', retryAfter);
            res.status(429).json({
                error: 'Too many requests',
                retryAfter,
            });
            return;
        }

        next();
    };
}

/**
 * Cleanup expired records periodically
 */
function cleanupExpiredRecords() {
    const now = Date.now();
    for (const [key, data] of memoryStore.entries()) {
        if (now > data.resetTime) {
            memoryStore.delete(key);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredRecords, 5 * 60 * 1000);

export default rateLimit;
