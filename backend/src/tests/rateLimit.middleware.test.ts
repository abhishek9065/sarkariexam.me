import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { rateLimit } from '../middleware/rateLimit.js';

const createAppWithLimiter = (keyPrefix: string, maxRequests: number) => {
  const app = express();
  app.use(rateLimit({ keyPrefix, maxRequests, windowMs: 60_000 }));
  app.get('/ping', (_req, res) => res.json({ ok: true }));
  return app;
};

describe('rateLimit middleware', () => {
  it('enforces request caps and emits rate limit headers', async () => {
    const keyPrefix = `rl:test:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const app = createAppWithLimiter(keyPrefix, 2);

    const first = await request(app).get('/ping');
    const second = await request(app).get('/ping');
    const third = await request(app).get('/ping');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);

    expect(Number(first.headers['x-ratelimit-limit'])).toBe(2);
    expect(Number(first.headers['x-ratelimit-remaining'])).toBe(1);
    expect(Number(second.headers['x-ratelimit-remaining'])).toBe(0);
    expect(third.body.error).toBe('Too many requests');
    expect(Number(third.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('keeps counters isolated by key prefix', async () => {
    const appA = createAppWithLimiter(`rl:scope:a:${Date.now()}`, 1);
    const appB = createAppWithLimiter(`rl:scope:b:${Date.now()}`, 1);

    const firstA = await request(appA).get('/ping');
    const secondA = await request(appA).get('/ping');
    const firstB = await request(appB).get('/ping');

    expect(firstA.status).toBe(200);
    expect(secondA.status).toBe(429);
    expect(firstB.status).toBe(200);
  });
});
