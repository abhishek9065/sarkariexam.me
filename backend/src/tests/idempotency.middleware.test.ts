import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { idempotency } from '../middleware/idempotency.js';

const buildApp = (keyPrefix: string, executeCounter: { value: number }) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = { userId: 'user-1' };
    next();
  });

  app.post('/action', idempotency({ keyPrefix, ttlMs: 15_000 }), async (req, res) => {
    executeCounter.value += 1;
    const delayMs = Number(req.body?.delayMs ?? 0);
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    return res.status(201).json({
      execution: executeCounter.value,
      payload: req.body?.payload ?? null,
    });
  });

  return app;
};

describe('idempotency middleware', () => {
  let executeCounter: { value: number };
  let app: express.Express;

  beforeEach(() => {
    executeCounter = { value: 0 };
    const keyPrefix = `idemp:test:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    app = buildApp(keyPrefix, executeCounter);
  });

  it('replays the first response for the same user/key pair', async () => {
    const first = await request(app)
      .post('/action')
      .set('Idempotency-Key', 'same-key')
      .send({ payload: 'first' });

    const second = await request(app)
      .post('/action')
      .set('Idempotency-Key', 'same-key')
      .send({ payload: 'second' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);
    expect(executeCounter.value).toBe(1);
  });

  it('allows repeated writes when idempotency key is missing', async () => {
    const first = await request(app)
      .post('/action')
      .send({ payload: 'first' });

    const second = await request(app)
      .post('/action')
      .send({ payload: 'second' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.execution).toBe(1);
    expect(second.body.execution).toBe(2);
    expect(executeCounter.value).toBe(2);
  });

  it('deduplicates concurrent requests for the same idempotency key', async () => {
    const firstPromise = request(app)
      .post('/action')
      .set('Idempotency-Key', 'in-flight')
      .send({ payload: 'slow', delayMs: 150 });

    await new Promise((resolve) => setTimeout(resolve, 25));

    const second = await request(app)
      .post('/action')
      .set('Idempotency-Key', 'in-flight')
      .send({ payload: 'fast' });

    const first = await firstPromise;

    expect(first.status).toBe(201);
    expect([201, 409]).toContain(second.status);
    if (second.status === 409) {
      expect(second.body.error).toBe('idempotency_in_progress');
      expect(Number(second.headers['retry-after'])).toBeGreaterThan(0);
    } else {
      expect(second.body).toEqual(first.body);
    }
    expect(executeCounter.value).toBe(1);
  });
});
