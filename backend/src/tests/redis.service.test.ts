import { afterEach, describe, expect, it, vi } from 'vitest';

describe('RedisCache status reporting', () => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.UPSTASH_REDIS_REST_URL;
    } else {
      process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    }
    if (originalToken === undefined) {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    } else {
      process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    }
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('distinguishes configured Redis from a failed command', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
    vi.stubGlobal('fetch', vi.fn(async () => new Response('unavailable', { status: 503 })));

    const { RedisCache } = await import('../services/redis.js');

    expect(RedisCache.getStatus()).toMatchObject({
      configured: true,
      available: true,
      lastCommandSucceeded: null,
    });

    await RedisCache.get('missing-key');

    expect(RedisCache.getStatus()).toMatchObject({
      configured: true,
      available: false,
      lastCommandSucceeded: false,
    });
  });

  it('marks Redis healthy after a successful command', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ result: 'PONG' }), { status: 200 })));

    const { RedisCache } = await import('../services/redis.js');

    await RedisCache.get('ping');

    expect(RedisCache.getStatus()).toMatchObject({
      configured: true,
      available: true,
      lastCommandSucceeded: true,
    });
    expect(RedisCache.hasSuccessfulConnection()).toBe(true);
  });
});
