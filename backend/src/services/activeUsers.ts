import type { Request } from 'express';

import RedisCache from './redis.js';

import type { UserRole } from '../types.js';

type ActivityRecord = {
    lastSeen: number;
    isAuthenticated: boolean;
    role?: UserRole;
};

const activeUsers = new Map<string, ActivityRecord>();
const MAX_ENTRIES = 50000;
const REDIS_RECORD_TTL_SECONDS = 3 * 60 * 60;
const REDIS_INDEX_TTL_SECONDS = 24 * 60 * 60;
const REDIS_RECORD_PREFIX = 'analytics:active_users:record:';
const REDIS_INDEX_KEY = 'analytics:active_users:index';
const REDIS_INDEX_MARKER_PREFIX = 'analytics:active_users:indexed:';

function getClientKey(req: Request): string | null {
    if (req.user?.userId) {
        return `user:${req.user.userId}`;
    }

    const forwarded = req.headers['x-forwarded-for'];
    let ip = req.ip;

    if (typeof forwarded === 'string' && forwarded.trim()) {
        ip = forwarded.split(',')[0].trim();
    } else if (Array.isArray(forwarded) && forwarded.length > 0) {
        ip = forwarded[0];
    }

    if (!ip) {
        return null;
    }

    return `ip:${ip}`;
}

const getRedisRecordKey = (key: string) => `${REDIS_RECORD_PREFIX}${key}`;
const getRedisIndexMarkerKey = (key: string) => `${REDIS_INDEX_MARKER_PREFIX}${key}`;

function pruneOldMemory(cutoff: number): void {
    for (const [key, entry] of activeUsers) {
        if (entry.lastSeen < cutoff) {
            activeUsers.delete(key);
        }
    }

    if (activeUsers.size > MAX_ENTRIES) {
        const sorted = [...activeUsers.entries()].sort((a, b) => a[1].lastSeen - b[1].lastSeen);
        const removeCount = Math.ceil(activeUsers.size * 0.1);
        for (let i = 0; i < removeCount; i += 1) {
            activeUsers.delete(sorted[i][0]);
        }
    }
}

const readRedisIndex = async (): Promise<string[]> => {
    const raw = await RedisCache.get(REDIS_INDEX_KEY);
    if (!Array.isArray(raw)) return [];
    return Array.from(new Set(raw.filter((item): item is string => typeof item === 'string' && item.length > 0)));
};

const writeRedisIndex = async (keys: string[]): Promise<void> => {
    const deduped = Array.from(new Set(keys));
    if (deduped.length === 0) {
        await RedisCache.del(REDIS_INDEX_KEY);
        return;
    }
    await RedisCache.set(REDIS_INDEX_KEY, deduped, REDIS_INDEX_TTL_SECONDS);
};

const normalizeActivityRecord = (record: any): ActivityRecord | null => {
    if (!record || typeof record !== 'object') {
        return null;
    }
    const lastSeen = Number((record as any).lastSeen);
    if (!Number.isFinite(lastSeen)) {
        return null;
    }
    return {
        lastSeen,
        isAuthenticated: Boolean((record as any).isAuthenticated),
        role: typeof (record as any).role === 'string' ? (record as any).role as UserRole : undefined,
    };
};

const computeStatsFromMemory = (windowMinutes: number) => {
    const now = Date.now();
    const cutoff = now - windowMinutes * 60 * 1000;
    pruneOldMemory(cutoff);

    let total = 0;
    let authenticated = 0;
    let anonymous = 0;
    let admins = 0;

    for (const entry of activeUsers.values()) {
        if (entry.lastSeen < cutoff) continue;
        total += 1;
        if (entry.isAuthenticated) {
            authenticated += 1;
            if (entry.role === 'admin') {
                admins += 1;
            }
        } else {
            anonymous += 1;
        }
    }

    return {
        windowMinutes,
        since: new Date(cutoff).toISOString(),
        total,
        authenticated,
        anonymous,
        admins,
    };
};

const updateRedisActivity = async (clientKey: string, record: ActivityRecord): Promise<void> => {
    await RedisCache.set(getRedisRecordKey(clientKey), record, REDIS_RECORD_TTL_SECONDS);

    const markerAdded = await RedisCache.setIfNotExists(
        getRedisIndexMarkerKey(clientKey),
        '1',
        REDIS_INDEX_TTL_SECONDS,
    );
    if (!markerAdded) {
        return;
    }

    const index = await readRedisIndex();
    if (index.includes(clientKey)) {
        await writeRedisIndex(index);
        return;
    }

    index.push(clientKey);
    if (index.length > MAX_ENTRIES) {
        index.splice(0, index.length - MAX_ENTRIES);
    }
    await writeRedisIndex(index);
};

const computeStatsFromRedis = async (windowMinutes: number) => {
    const index = await readRedisIndex();
    if (index.length === 0) {
        return null;
    }

    const now = Date.now();
    const cutoff = now - windowMinutes * 60 * 1000;
    const retentionCutoff = now - REDIS_RECORD_TTL_SECONDS * 1000;

    let total = 0;
    let authenticated = 0;
    let anonymous = 0;
    let admins = 0;

    const recordEntries = await Promise.all(index.map(async (key) => {
        const raw = await RedisCache.get(getRedisRecordKey(key));
        return { key, record: normalizeActivityRecord(raw) };
    }));

    let indexChanged = false;
    const freshEntries = recordEntries.filter((entry) => {
        if (!entry.record) {
            indexChanged = true;
            return false;
        }
        if (entry.record.lastSeen < retentionCutoff) {
            indexChanged = true;
            return false;
        }
        return true;
    });

    let limitedEntries = freshEntries;
    if (freshEntries.length > MAX_ENTRIES) {
        indexChanged = true;
        limitedEntries = freshEntries
            .slice()
            .sort((a, b) => a.record!.lastSeen - b.record!.lastSeen)
            .slice(freshEntries.length - MAX_ENTRIES);
    }

    for (const entry of limitedEntries) {
        const record = entry.record!;
        if (record.lastSeen < cutoff) {
            continue;
        }
        total += 1;
        if (record.isAuthenticated) {
            authenticated += 1;
            if (record.role === 'admin') {
                admins += 1;
            }
        } else {
            anonymous += 1;
        }
    }

    if (indexChanged) {
        await writeRedisIndex(limitedEntries.map((entry) => entry.key));
    }

    return {
        windowMinutes,
        since: new Date(cutoff).toISOString(),
        total,
        authenticated,
        anonymous,
        admins,
    };
};

export async function recordActiveUser(req: Request): Promise<void> {
    const key = getClientKey(req);
    if (!key) return;

    const record: ActivityRecord = {
        lastSeen: Date.now(),
        isAuthenticated: Boolean(req.user?.userId),
        role: req.user?.role,
    };

    activeUsers.set(key, record);
    if (activeUsers.size > MAX_ENTRIES) {
        pruneOldMemory(Date.now() - 15 * 60 * 1000);
    }

    if (!RedisCache.isAvailable()) {
        return;
    }

    try {
        await updateRedisActivity(key, record);
    } catch (error) {
        console.error('[ActiveUsers] Redis activity update failed:', error);
    }
}

export async function getActiveUsersStats(windowMinutes: number = 15) {
    if (RedisCache.isAvailable()) {
        try {
            const redisStats = await computeStatsFromRedis(windowMinutes);
            if (redisStats) {
                return redisStats;
            }
        } catch (error) {
            console.error('[ActiveUsers] Redis stats read failed:', error);
        }
    }

    return computeStatsFromMemory(windowMinutes);
}
