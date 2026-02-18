import { getCache as getMemoryCache, setCache as setMemoryCache, deleteCache as deleteMemoryCache, invalidateCache } from '../utils/cache.js';

/**
 * Redis Cache Service using Upstash REST API
 * Falls back to in-memory cache if Redis is unavailable
 */

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const isRedisConfigured = !!(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);

if (!isRedisConfigured) {
    console.log('⚠️ Redis not configured. Using in-memory cache fallback.');
}

/**
 * Execute Redis command via Upstash REST API
 */
async function redisCommand(command: string[]): Promise<any> {
    if (!isRedisConfigured) return null;

    try {
        const response = await fetch(`${UPSTASH_REDIS_REST_URL}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(command),
        });

        if (!response.ok) {
            console.error('Redis error:', response.statusText);
            return null;
        }

        const data = await response.json() as { result: any };
        return data.result;
    } catch (error) {
        console.error('Redis connection error:', error);
        return null;
    }
}

const encodeValue = (value: any): string => (
    typeof value === 'string' ? value : JSON.stringify(value)
);

/**
 * Get value from Redis cache
 * Falls back to memory cache if Redis unavailable
 */
export async function get(key: string): Promise<any | null> {
    // Try Redis first
    if (isRedisConfigured) {
        const result = await redisCommand(['GET', key]);
        if (result !== null && result !== undefined) {
            try {
                return JSON.parse(result);
            } catch {
                return result;
            }
        }
    }

    // Fallback to memory cache
    return getMemoryCache(key);
}

/**
 * Set value in Redis cache with TTL
 * Also sets in memory cache as backup
 */
export async function set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    const stringValue = encodeValue(value);

    // Try Redis first
    if (isRedisConfigured) {
        await redisCommand(['SET', key, stringValue, 'EX', ttlSeconds.toString()]);
    }

    // Also set in memory cache as fallback
    setMemoryCache(key, value, ttlSeconds);
}

/**
 * Delete key(s) from Redis cache
 */
export async function del(key: string): Promise<void> {
    if (isRedisConfigured) {
        await redisCommand(['DEL', key]);
    }
    deleteMemoryCache(key);
}

/**
 * Set value only when key does not exist.
 */
export async function setIfNotExists(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
    const stringValue = encodeValue(value);

    if (isRedisConfigured) {
        const result = await redisCommand(['SET', key, stringValue, 'NX', 'EX', ttlSeconds.toString()]);
        if (result === 'OK') {
            setMemoryCache(key, value, ttlSeconds);
            return true;
        }
        if (result !== null && result !== undefined) {
            return false;
        }
    }

    const existing = getMemoryCache(key);
    if (existing !== null && existing !== undefined) {
        return false;
    }
    setMemoryCache(key, value, ttlSeconds);
    return true;
}

/**
 * Increment a numeric key.
 */
export async function increment(key: string): Promise<number> {
    if (isRedisConfigured) {
        const result = await redisCommand(['INCR', key]);
        const parsed = Number(result);
        if (Number.isFinite(parsed)) {
            setMemoryCache(key, parsed, 3600);
            return parsed;
        }
    }

    const current = getMemoryCache(key);
    const nextValue = Number(current ?? 0) + 1;
    setMemoryCache(key, nextValue, 3600);
    return nextValue;
}

/**
 * Update key expiration.
 */
export async function expire(key: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) {
        await del(key);
        return;
    }

    if (isRedisConfigured) {
        await redisCommand(['EXPIRE', key, ttlSeconds.toString()]);
    }

    const existing = getMemoryCache(key);
    if (existing !== null && existing !== undefined) {
        setMemoryCache(key, existing, ttlSeconds);
    }
}

/**
 * Delete all keys matching a pattern
 */
export async function invalidatePattern(pattern: string): Promise<void> {
    if (isRedisConfigured) {
        // Upstash doesn't support KEYS in free tier, so we skip pattern deletion
        // The TTL will handle expiration
        console.log(`Cache pattern invalidation requested: ${pattern}`);
    }
    invalidateCache(pattern);
}

/**
 * Check if Redis is available
 */
export function isAvailable(): boolean {
    return isRedisConfigured;
}

/**
 * CACHE-ASIDE PATTERN: Get from cache or fetch and cache
 * This is the key pattern for handling 15k+ users efficiently
 * 
 * @param key - Cache key (e.g., 'job:up-police-recruitment-2026')
 * @param fetcher - Async function to fetch data if not in cache
 * @param ttlSeconds - Time to live in seconds (default: 1 hour)
 */
export async function getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T | null>,
    ttlSeconds: number = 3600
): Promise<T | null> {
    // 1. Check cache first (Redis or memory)
    const cached = await get(key);
    if (cached !== null && cached !== undefined) {
        console.log(`[Cache HIT] ${key}`);
        return cached as T;
    }

    console.log(`[Cache MISS] ${key}`);

    // 2. Fetch from database
    const data = await fetcher();

    // 3. Store in cache for future requests
    if (data !== null && data !== undefined) {
        await set(key, data, ttlSeconds);
    }

    return data;
}

/**
 * Invalidate a specific cache key (use after updates)
 */
export async function invalidate(key: string): Promise<void> {
    await del(key);
    console.log(`[Cache INVALIDATED] ${key}`);
}

export const RedisCache = {
    get,
    set,
    del,
    setIfNotExists,
    increment,
    expire,
    invalidatePattern,
    isAvailable,
    getOrFetch,
    invalidate,
};

export default RedisCache;
