import { getCollection } from './cosmosdb.js';

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}

export async function recordRateLimitHit(key: string, endpoint: string) {
  try {
    const { getCollection } = await import('./cosmosdb.js');
    const col = getCollection('rate_limit_hits');
    await col.insertOne({ key, endpoint, timestamp: new Date() } as any);
  } catch (error) {
    // Silent fail
  }
}

export async function getRateLimitStats(): Promise<{
  totalHits24h: number;
  uniqueIPs: number;
  mostLimited: Array<{ key: string; count: number }>;
}> {
  try {
    const { getCollection } = await import('./cosmosdb.js');
    const col = getCollection('rate_limit_hits');
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [totalHits24h, uniqueIPsAgg, mostLimitedAgg] = await Promise.all([
      col.countDocuments({ timestamp: { $gte: since } }),
      col.distinct('key', { timestamp: { $gte: since } }),
      col.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: '$key', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]).toArray(),
    ]);
    
    return {
      totalHits24h,
      uniqueIPs: uniqueIPsAgg.length,
      mostLimited: mostLimitedAgg.map((m: any) => ({ key: m._id, count: m.count })),
    };
  } catch (error) {
    return { totalHits24h: 0, uniqueIPs: 0, mostLimited: [] };
  }
}

export async function getRateLimitByEndpoint(): Promise<{ endpoint: string; hits: number; blocked: number }[]> {
  try {
    const { getCollection } = await import('./cosmosdb.js');
    const col = getCollection('rate_limit_hits');
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const pipeline = [
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: '$endpoint', hits: { $sum: 1 } } },
      { $sort: { hits: -1 } },
      { $limit: 20 },
    ];
    
    const results = await col.aggregate(pipeline).toArray();
    return results.map((r: any) => ({ endpoint: r._id, hits: r.hits, blocked: 0 }));
  } catch (error) {
    return [];
  }
}

export const rateLimitService = {
  checkRateLimit,
  recordRateLimitHit,
  getRateLimitStats,
  getRateLimitByEndpoint,
};

export default rateLimitService;
