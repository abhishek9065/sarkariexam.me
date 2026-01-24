import { Request, Response, NextFunction } from 'express';

type IdempotencyEntry = {
    status: number;
    body: any;
    expiresAt: number;
};

const store = new Map<string, IdempotencyEntry>();
const MAX_ENTRIES = 2000;

const cleanupExpired = () => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        if (entry.expiresAt <= now) {
            store.delete(key);
        }
    }
};

setInterval(cleanupExpired, 5 * 60 * 1000);

export function idempotency(options?: { ttlMs?: number; keyPrefix?: string }) {
    const ttlMs = options?.ttlMs ?? 5 * 60 * 1000;
    const keyPrefix = options?.keyPrefix ?? 'idemp';

    return (req: Request, res: Response, next: NextFunction) => {
        const key = req.header('Idempotency-Key');
        if (!key) {
            next();
            return;
        }

        const userId = (req as any).user?.userId ?? 'anon';
        const cacheKey = `${keyPrefix}:${userId}:${key}`;
        const cached = store.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            res.status(cached.status).json(cached.body);
            return;
        }

        if (store.size > MAX_ENTRIES) {
            cleanupExpired();
        }

        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        const saveResponse = (body: any) => {
            store.set(cacheKey, {
                status: res.statusCode,
                body,
                expiresAt: Date.now() + ttlMs,
            });
        };

        res.json = (body: any) => {
            saveResponse(body);
            return originalJson(body);
        };

        res.send = (body: any) => {
            saveResponse(body);
            return originalSend(body);
        };

        next();
    };
}

export default idempotency;
