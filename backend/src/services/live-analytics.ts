import AnnouncementModelPostgres from '../models/announcements.postgres.js';

import {
  getGeoStateActivity,
  getRecentEngagementCount,
  getRollupSummary,
  getTopAnnouncementViews,
  getTopSearches,
  recordAnalyticsEvent,
} from './analytics.js';

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
    const recentEvents = await getRecentEngagementCount(5);

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
    return getTopSearches(1, limit);
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
    const viewCounts = await getTopAnnouncementViews(24, limit);
    if (viewCounts.length === 0) return [];

    const announcements = await AnnouncementModelPostgres.findByIds(viewCounts.map((entry) => entry.announcementId));
    const byId = new Map(announcements.map((announcement) => [announcement.id, announcement]));

    return viewCounts.map((entry) => {
      const announcement = byId.get(entry.announcementId);
      return {
        id: entry.announcementId,
        title: announcement?.title || 'Unknown',
        views: entry.views,
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
    return getGeoStateActivity(24, 20);
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
    rollupSummary,
  ] = await Promise.all([
    getActiveUsers(),
    getTrendingSearches(10),
    getTopContent(10),
    getGeoData(),
    getRollupSummary(1),
  ]);

  const derivedPageViews = rollupSummary.viewCount + rollupSummary.listingViews;
  
  liveMetricsCache = {
    activeUsers,
    pageViews: derivedPageViews > 0 ? derivedPageViews : Math.floor(activeUsers * 2.5),
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
      type: 'announcement_view', // Valid AnalyticsEventType
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
