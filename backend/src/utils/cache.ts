// Simple in-memory cache for API responses
interface CacheEntry {
    data: unknown;
    expiry: number;
}

const cache = new Map<string, CacheEntry>();
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

export function getCache(key: string): unknown | null {
    const entry = cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
        cache.delete(key);
        return null;
    }

    return entry.data;
}

const MAX_CACHE_SIZE = 1000; // Prevent memory exhaustion

export function setCache(key: string, data: unknown, ttlSeconds = 300): void {
    // If cache is full, delete the oldest/first entry (simple approximation of LRU)
    if (cache.size >= MAX_CACHE_SIZE) {
        const firstKey = cache.keys().next().value;
        if (firstKey) cache.delete(firstKey);
    }

    cache.set(key, {
        data,
        expiry: Date.now() + (ttlSeconds * 1000),
    });
}

export function deleteCache(key: string): void {
    cache.delete(key);
}

export function invalidateCache(pattern?: string): void {
    if (!pattern) {
        cache.clear();
        return;
    }

    for (const key of cache.keys()) {
        if (key.includes(pattern)) {
            cache.delete(key);
        }
    }
}

// Cleanup expired entries periodically
function startCleanupInterval(): void {
    if (cleanupInterval) return;
    cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of cache.entries()) {
            if (now > entry.expiry) {
                cache.delete(key);
            }
        }
    }, 60000);
}

/** Stop the cleanup interval - call on server shutdown */
export function stopCacheCleanup(): void {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }
}

// Start cleanup on module load
startCleanupInterval();

export default { getCache, setCache, deleteCache, invalidateCache, stopCacheCleanup };
