import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { cacheKeys, cacheMiddleware } from '../middleware/cache.js';
import { bumpCacheVersion } from '../services/cacheVersion.js';
import { invalidateCache } from '../utils/cache.js';

const describeOrSkip = process.env.SKIP_MONGO_TESTS === 'true' ? describe.skip : describe;

const extractCacheVersion = (cacheKey: string): number => {
    const match = cacheKey.match(/^v(\d+):/);
    return match ? Number(match[1]) : 0;
};

describeOrSkip('cache middleware key and version behavior', () => {
    beforeEach(() => {
        invalidateCache();
    });

    it('normalizes query parameter order for default cache keys', async () => {
        const app = express();
        let counter = 0;

        app.get('/default', cacheMiddleware({ ttl: 300 }), (_req, res) => {
            counter += 1;
            res.json({ counter });
        });

        const first = await request(app).get('/default?b=2&a=1');
        const second = await request(app).get('/default?a=1&b=2');

        expect(first.headers['x-cache']).toBe('MISS');
        expect(second.headers['x-cache']).toContain('HIT');
        expect(first.headers['x-cache-key']).toBe(second.headers['x-cache-key']);
        expect(first.body).toEqual(second.body);
    });

    it('keeps keyGenerator output and user scoping in the cache key', async () => {
        const app = express();
        let counter = 0;
        const cacheGroup = `announcements-${Date.now()}`;

        app.use((req, _res, next) => {
            const userId = req.get('x-user-id');
            if (userId) {
                (req as any).user = { userId };
            }
            next();
        });

        app.get(
            '/scoped',
            cacheMiddleware({
                ttl: 300,
                keyGenerator: (req) => `${cacheGroup}:q:${req.query.q || ''}`,
            }),
            (_req, res) => {
                counter += 1;
                res.json({ counter });
            }
        );

        const userOneFirst = await request(app).get('/scoped?q=abc').set('x-user-id', 'user-1');
        const userOneSecond = await request(app).get('/scoped?q=abc').set('x-user-id', 'user-1');
        const userTwoFirst = await request(app).get('/scoped?q=abc').set('x-user-id', 'user-2');

        expect(userOneFirst.headers['x-cache']).toBe('MISS');
        expect(userOneSecond.headers['x-cache']).toContain('HIT');
        expect(userOneFirst.headers['x-cache-key']).toContain(`:${cacheGroup}:`);
        expect(userOneFirst.headers['x-cache-key']).toContain(':user:user-1:');
        expect(userTwoFirst.headers['x-cache']).toBe('MISS');
        expect(userTwoFirst.headers['x-cache-key']).toContain(':user:user-2:');
        expect(userOneFirst.headers['x-cache-key']).not.toBe(userTwoFirst.headers['x-cache-key']);
    });

    it('invalidates cached entries when cache version is bumped', async () => {
        const app = express();
        let counter = 0;
        const cacheGroup = `announcements-${Date.now()}-v`;

        app.get(
            '/versioned',
            cacheMiddleware({
                ttl: 300,
                keyGenerator: () => `${cacheGroup}:detail`,
            }),
            (_req, res) => {
                counter += 1;
                res.json({ counter });
            }
        );

        const first = await request(app).get('/versioned');
        const second = await request(app).get('/versioned');

        expect(first.headers['x-cache']).toBe('MISS');
        expect(second.headers['x-cache']).toContain('HIT');
        expect(first.body).toEqual(second.body);

        await bumpCacheVersion(cacheGroup);

        const third = await request(app).get('/versioned');

        expect(third.headers['x-cache']).toBe('MISS');
        expect(third.headers['x-cache-key']).not.toBe(first.headers['x-cache-key']);
        expect(extractCacheVersion(third.headers['x-cache-key'] as string)).toBe(
            extractCacheVersion(first.headers['x-cache-key'] as string) + 1
        );
        expect(third.body.counter).toBeGreaterThan(first.body.counter);
    });

    it('includes location and salary filters in announcements cache keys', () => {
        const req = {
            query: {
                type: 'job',
                limit: '20',
                offset: '0',
                search: 'railway',
                category: 'sc',
                organization: 'rrb',
                location: 'delhi',
                qualification: 'graduate',
                salaryMin: '30000',
                salaryMax: '50000',
                sort: 'newest',
                cursor: 'abc123',
            },
        } as any;

        const v1 = cacheKeys.announcements(req);
        const v2 = cacheKeys.announcementsV2(req);
        const v3 = cacheKeys.announcementsV3Cards(req);

        expect(v1).toContain('location:delhi');
        expect(v1).toContain('salaryMin:30000');
        expect(v1).toContain('salaryMax:50000');

        expect(v2).toContain('location:delhi');
        expect(v2).toContain('salaryMin:30000');
        expect(v2).toContain('salaryMax:50000');

        expect(v3).toContain('location:delhi');
        expect(v3).toContain('salaryMin:30000');
        expect(v3).toContain('salaryMax:50000');
    });
});
