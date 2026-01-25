import { Request, Response } from 'express';

import { rateLimit } from '../middleware/rateLimit.js';
import { setCache, getCache } from '../utils/cache.js';

// Mock objects
const mockReq = (ip: string) => ({
    ip,
    socket: { remoteAddress: ip },
    headers: {},
}) as Partial<Request> as Request;

async function testRateLimit() {
    console.log('🧪 Testing Rate Limiter...');

    // Create limiter with small window and limit
    const limiter = rateLimit({ windowMs: 10000, maxRequests: 5 });
    const ip = '127.0.0.3'; // Unique IP
    const req = mockReq(ip);

    console.log('   Sending 5 requests (allowed)...');
    for (let i = 0; i < 5; i++) {
        await new Promise<void>((resolve) => {
            const res: any = {
                setHeader: (k: string, v: any) => {
                    // Debug headers
                    if (k.startsWith('X-RateLimit')) {
                        // console.log(`[Req ${i+1}] ${k}: ${v}`);
                    }
                },
                status: () => ({ json: () => { } }),
            };

            // Execute middleware
            limiter(req, res, () => {
                resolve(); // next() called
            });
        });
    }

    // Send 6th request (should be blocked)
    console.log('   Sending 6th request (should block)...');

    const result = await new Promise<string>((resolve) => {
        // Setup response to resolve promise on 429
        const res: any = {};
        res.setHeader = (k: string, v: any) => {
            console.log(`[Req 6] ${k}: ${v}`);
        };
        res.status = (code: number) => {
            console.log(`[Req 6] Status Code: ${code}`);
            if (code === 429) resolve('blocked');
            return {
                json: (data: any) => {
                    console.log(`[Req 6] Body:`, data);
                }
            };
        };

        // Setup next to resolve as passed
        limiter(req, res, () => {
            console.log('[Req 6] Next() called - NOT BLOCKED');
            resolve('passed');
        });
    });

    if (result === 'blocked') {
        console.log('✅ Rate limit correctly enforced.');
    } else {
        console.error('❌ Rate limit FAILED (6th request allowed).');
    }
}

async function testCacheSystem() {
    console.log('\n🧪 Testing Cache System...');

    // Test basic set/get
    setCache('test-key', { foo: 'bar' });
    const val = getCache('test-key');

    if (val && val.foo === 'bar') {
        console.log('✅ Basic cache SET/GET working.');
    } else {
        console.error('❌ Basic cache failed.');
    }

    // Test eviction (size limit)
    console.log('   Testing cache eviction (filling 1005 items)...');

    for (let i = 0; i < 1005; i++) {
        setCache(`key-${i}`, `value-${i}`);
    }

    const firstKey = getCache('key-0'); // Should be evicted
    const recentKey = getCache('key-1004'); // Should exist

    if (!firstKey && recentKey) {
        console.log('✅ Cache eviction working (oldest item removed).');
    } else {
        console.error('❌ Cache eviction FAILED.');
        if (firstKey) console.log('   Oldest item still exists.');
        if (!recentKey) console.log('   Newest item missing.');
    }
}

async function runVerify() {
    try {
        await testCacheSystem();
        await testRateLimit();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

runVerify();
