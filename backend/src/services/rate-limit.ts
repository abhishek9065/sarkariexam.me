// In-memory rate limit store (use Redis in production for distributed environments)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Simple in-memory history for stats (capped at 1000 items to avoid memory leaks)
const rateLimitHistory: Array<{ key: string; endpoint: string; timestamp: Date }> = [];
const MAX_HISTORY = 1000;

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
  // Use in-memory history instead of Mongo to decouple from legacy storage
  rateLimitHistory.push({ key, endpoint, timestamp: new Date() });
  if (rateLimitHistory.length > MAX_HISTORY) {
    rateLimitHistory.shift();
  }
}

export async function getRateLimitStats(): Promise<{
  totalHits24h: number;
  uniqueIPs: number;
  mostLimited: Array<{ key: string; count: number }>;
}> {
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const recent = rateLimitHistory.filter(h => h.timestamp.getTime() >= since);
  
  const counts = new Map<string, number>();
  recent.forEach(h => counts.set(h.key, (counts.get(h.key) || 0) + 1));
  
  const mostLimited = Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
    
  return {
    totalHits24h: recent.length,
    uniqueIPs: counts.size,
    mostLimited,
  };
}

export async function getRateLimitByEndpoint(): Promise<{ endpoint: string; hits: number; blocked: number }[]> {
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const recent = rateLimitHistory.filter(h => h.timestamp.getTime() >= since);
  
  const counts = new Map<string, number>();
  recent.forEach(h => counts.set(h.endpoint, (counts.get(h.endpoint) || 0) + 1));
  
  return Array.from(counts.entries())
    .map(([endpoint, hits]) => ({ endpoint, hits, blocked: 0 }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 20);
}

export const rateLimitService = {
  checkRateLimit,
  recordRateLimitHit,
  getRateLimitStats,
  getRateLimitByEndpoint,
};

export default rateLimitService;
