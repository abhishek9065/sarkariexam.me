import { Request, Response, NextFunction } from 'express';

import RedisCache from '../services/redis.js';
import { SecurityLogger } from '../services/securityLogger.js';

import { getRealIp } from './cloudflare.js';

const WINDOW_CACHE_TTL_BUFFER_SECONDS = 2;

interface RateLimitOptions {
    windowMs?: number;  // Time window in milliseconds
    maxRequests?: number;  // Max requests per window
    keyPrefix?: string;  // Prefix for rate limit key (e.g., 'api', 'auth')
}

async function checkRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number
): Promise<{ allowed: boolean; count: number; resetTime: number }> {
    const now = Date.now();
    const windowBucket = Math.floor(now / windowMs);
    const resetTime = (windowBucket + 1) * windowMs;
    const bucketKey = `${key}:${windowBucket}`;

    const count = await RedisCache.increment(bucketKey);
    if (count === 1) {
        const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000) + WINDOW_CACHE_TTL_BUFFER_SECONDS);
        await RedisCache.expire(bucketKey, ttlSeconds);
    }

    return {
        allowed: count <= maxRequests,
        count,
        resetTime,
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

        const result = await checkRateLimit(key, maxRequests, windowMs);

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - result.count));
        res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

        if (!result.allowed) {
            const retryAfter = Math.max(1, Math.ceil((result.resetTime - Date.now()) / 1000));
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

export default rateLimit;
