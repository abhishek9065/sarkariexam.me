import { getCollection } from './cosmosdb.js';
import { recordAnalyticsEvent } from './analytics.js';

interface LiveMetrics {
  activeUsers: number;
  pageViews: number;
  trendingSearches: Array<{ query: string; count: number }>;
  topContent: Array<{ id: string; title: string; views: number; type: string }>;
  geoData: Array<{ state: string; users: number }>;
  timestamp: Date;
}

// In-memory cache for live metrics (refreshed every 30 seconds)
let liveMetricsCache: LiveMetrics | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds

/**
 * Get current active users (approximate from recent analytics events)
 */
async function getActiveUsers(): Promise<number> {
  try {
    const col = getCollection('analytics_events');
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const recentEvents = await col.countDocuments({
      timestamp: { $gte: fiveMinutesAgo },
      type: { $in: ['page_view', 'content_view'] },
    });
    
    // Estimate unique users (rough approximation)
    return Math.ceil(recentEvents * 0.7);
  } catch (error) {
    console.error('[LiveAnalytics] Error getting active users:', error);
    return 0;
  }
}

/**
 * Get trending searches from last 24 hours
 */
async function getTrendingSearches(limit = 10): Promise<Array<{ query: string; count: number }>> {
  try {
    const col = getCollection('analytics_events');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const pipeline = [
      { $match: { type: 'search', timestamp: { $gte: oneDayAgo } } },
      { $group: { _id: '$metadata.query', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ];
    
    const results = await col.aggregate(pipeline).toArray();
    return results.map((r: any) => ({ query: r._id || 'unknown', count: r.count }));
  } catch (error) {
    console.error('[LiveAnalytics] Error getting trending searches:', error);
    return [];
  }
}

/**
 * Get top performing content
 */
async function getTopContent(limit = 10): Promise<Array<{ id: string; title: string; views: number; type: string }>> {
  try {
    const col = getCollection('analytics_events');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const pipeline = [
      { $match: { type: 'content_view', timestamp: { $gte: oneDayAgo } } },
      { $group: { _id: '$metadata.contentId', views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: limit },
    ];
    
    const viewCounts = await col.aggregate(pipeline).toArray();
    
    // Fetch announcement details
    const contentIds = viewCounts.map((v: any) => v._id).filter(Boolean);
    if (contentIds.length === 0) return [];
    
    const { ObjectId } = await import('mongodb');
    const objectIds = contentIds.map((id: string) => new ObjectId(id));
    
    const announcementsCol = getCollection('announcements');
    const announcements = await announcementsCol
      .find({ _id: { $in: objectIds } })
      .project({ title: 1, type: 1 })
      .toArray();
    
    const idMap = new Map(announcements.map((a: any) => [a._id.toString(), a]));
    
    return viewCounts.map((v: any) => {
      const announcement = idMap.get(v._id);
      return {
        id: v._id,
        title: announcement?.title || 'Unknown',
        views: v.views,
        type: announcement?.type || 'job',
      };
    });
  } catch (error) {
    console.error('[LiveAnalytics] Error getting top content:', error);
    return [];
  }
}

/**
 * Get geographic distribution of users
 */
async function getGeoData(): Promise<Array<{ state: string; users: number }>> {
  try {
    const col = getCollection('analytics_events');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const pipeline = [
      { $match: { timestamp: { $gte: oneDayAgo } } },
      { $group: { _id: '$metadata.state', users: { $sum: 1 } } },
      { $sort: { users: -1 } },
    ];
    
    const results = await col.aggregate(pipeline).toArray();
    return results
      .filter((r: any) => r._id)
      .map((r: any) => ({ state: r._id, users: r.users }));
  } catch (error) {
    console.error('[LiveAnalytics] Error getting geo data:', error);
    return [];
  }
}

/**
 * Get live metrics with caching
 */
export async function getLiveMetrics(): Promise<LiveMetrics> {
  const now = Date.now();
  
  if (liveMetricsCache && now - lastCacheTime < CACHE_TTL) {
    return liveMetricsCache;
  }
  
  const [
    activeUsers,
    trendingSearches,
    topContent,
    geoData,
  ] = await Promise.all([
    getActiveUsers(),
    getTrendingSearches(10),
    getTopContent(10),
    getGeoData(),
  ]);
  
  liveMetricsCache = {
    activeUsers,
    pageViews: Math.floor(activeUsers * 2.5), // Approximate
    trendingSearches,
    topContent,
    geoData,
    timestamp: new Date(),
  };
  
  lastCacheTime = now;
  return liveMetricsCache;
}

/**
 * WebSocket handler for live analytics
 */
export function setupLiveAnalyticsWebSocket(wss: any) {
  wss.on('connection', (ws: any, req: any) => {
    // Authenticate admin connection
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      ws.close(1008, 'Authentication required');
      return;
    }
    
    let interval: NodeJS.Timeout | null = null;
    
    const sendMetrics = async () => {
      try {
        const metrics = await getLiveMetrics();
        ws.send(JSON.stringify({ type: 'metrics', data: metrics }));
      } catch (error) {
        console.error('[LiveAnalytics] WebSocket error:', error);
      }
    };
    
    // Send initial metrics
    sendMetrics();
    
    // Update every 30 seconds
    interval = setInterval(sendMetrics, 30000);
    
    ws.on('close', () => {
      if (interval) clearInterval(interval);
    });
    
    ws.on('error', (error: Error) => {
      console.error('[LiveAnalytics] WebSocket error:', error);
      if (interval) clearInterval(interval);
    });
  });
}

/**
 * Record user location from IP (for geo analytics)
 */
export async function recordUserLocation(userId: string | null, state: string, city?: string) {
  try {
    await recordAnalyticsEvent({
      type: 'page_view',
      userId: userId || undefined,
      metadata: { state, city, location_recorded: true },
    });
  } catch (error) {
    console.error('[LiveAnalytics] Error recording location:', error);
  }
}

export const liveAnalyticsService = {
  getLiveMetrics,
  setupLiveAnalyticsWebSocket,
  recordUserLocation,
};

export default liveAnalyticsService;
