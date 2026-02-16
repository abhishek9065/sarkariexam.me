import crypto from 'crypto';

import { Request, Response, NextFunction } from 'express';

import RedisCache from '../services/redis.js';

type IdempotencyCompleteEntry = {
    state: 'complete';
    status: number;
    body: any;
    expiresAt: number;
};

type IdempotencyPendingEntry = {
    state: 'pending';
    ownerId: string;
    expiresAt: number;
};

type IdempotencyEntry = IdempotencyCompleteEntry | IdempotencyPendingEntry;

const LOCK_TTL_MS = 30 * 1000;

const toTtlSeconds = (ttlMs: number) => Math.max(1, Math.ceil(ttlMs / 1000));

const isEntry = (value: any): value is IdempotencyEntry => (
    Boolean(value) && typeof value === 'object' && (value.state === 'complete' || value.state === 'pending')
);

const isPending = (value: any): value is IdempotencyPendingEntry => (
    isEntry(value) && value.state === 'pending'
);

const isComplete = (value: any): value is IdempotencyCompleteEntry => (
    isEntry(value) && value.state === 'complete'
);

const replyFromCache = (res: Response, cached: IdempotencyCompleteEntry) => {
    res.status(cached.status).json(cached.body);
};

const replyInProgress = (res: Response, pending: IdempotencyPendingEntry) => {
    const retryAfter = Math.max(1, Math.ceil((pending.expiresAt - Date.now()) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    res.status(409).json({
        error: 'idempotency_in_progress',
        message: 'A request with this Idempotency-Key is still processing.',
        retryAfter,
    });
};

export function idempotency(options?: { ttlMs?: number; keyPrefix?: string }) {
    const ttlMs = options?.ttlMs ?? 5 * 60 * 1000;
    const keyPrefix = options?.keyPrefix ?? 'idemp';

    return async (req: Request, res: Response, next: NextFunction) => {
        const key = req.header('Idempotency-Key');
        if (!key) {
            next();
            return;
        }

        const userId = (req as any).user?.userId ?? 'anon';
        const cacheKey = `${keyPrefix}:${userId}:${key}`;

        const now = Date.now();
        const cached = await RedisCache.get(cacheKey);
        if (isComplete(cached) && cached.expiresAt > now) {
            replyFromCache(res, cached);
            return;
        }
        if (isPending(cached) && cached.expiresAt > now) {
            replyInProgress(res, cached);
            return;
        }

        const ownerId = crypto.randomUUID();
        const lockTtlMs = Math.min(LOCK_TTL_MS, ttlMs);
        const pendingEntry: IdempotencyPendingEntry = {
            state: 'pending',
            ownerId,
            expiresAt: now + lockTtlMs,
        };

        const acquired = await RedisCache.setIfNotExists(cacheKey, pendingEntry, toTtlSeconds(lockTtlMs));
        if (!acquired) {
            const retryEntry = await RedisCache.get(cacheKey);
            if (isComplete(retryEntry) && retryEntry.expiresAt > Date.now()) {
                replyFromCache(res, retryEntry);
                return;
            }
            if (isPending(retryEntry) && retryEntry.expiresAt > Date.now()) {
                replyInProgress(res, retryEntry);
                return;
            }
        }

        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);
        let responseStored = false;

        const saveResponse = async (body: any) => {
            if (responseStored) return;
            responseStored = true;
            const completeEntry: IdempotencyCompleteEntry = {
                state: 'complete',
                status: res.statusCode,
                body,
                expiresAt: Date.now() + ttlMs,
            };
            await RedisCache.set(cacheKey, completeEntry, toTtlSeconds(ttlMs));
        };

        res.json = ((body: any) => {
            void saveResponse(body);
            return originalJson(body);
        }) as typeof res.json;

        res.send = ((body: any) => {
            void saveResponse(body);
            return originalSend(body);
        }) as typeof res.send;

        next();
    };
}

export default idempotency;
