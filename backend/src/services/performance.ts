import { getCollection } from './cosmosdb.js';

interface PerformanceMetrics {
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerMinute: number;
  errorRate: number;
  timestamp: Date;
}

export async function recordApiMetrics(route: string, method: string, duration: number, statusCode: number) {
  try {
    const { getCollection } = await import('./cosmosdb.js');
    const col = getCollection('performance_metrics');
    
    await col.insertOne({
      route,
      method,
      duration,
      statusCode,
      isError: statusCode >= 400,
      timestamp: new Date(),
    } as any);
  } catch (error) {
    // Silently fail to avoid affecting performance
  }
}

export async function getPerformanceSummary(minutes = 60): Promise<PerformanceMetrics> {
  try {
    const { getCollection } = await import('./cosmosdb.js');
    const col = getCollection('performance_metrics');
    const since = new Date(Date.now() - minutes * 60 * 1000);
    
    const pipeline = [
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$duration' },
          p95Duration: { $percentile: { p: [0.95], input: '$duration' } },
          p99Duration: { $percentile: { p: [0.99], input: '$duration' } },
          totalRequests: { $sum: 1 },
          errorCount: { $sum: { $cond: ['$isError', 1, 0] } },
        },
      },
    ];
    
    const result = await col.aggregate(pipeline).toArray();
    const data = result[0] || {};
    
    return {
      avgResponseTime: Math.round(data.avgDuration || 0),
      p95ResponseTime: Math.round(data.p95Duration?.[0] || 0),
      p99ResponseTime: Math.round(data.p99Duration?.[0] || 0),
      requestsPerMinute: Math.round((data.totalRequests || 0) / minutes),
      errorRate: data.totalRequests ? (data.errorCount / data.totalRequests) * 100 : 0,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      requestsPerMinute: 0,
      errorRate: 0,
      timestamp: new Date(),
    };
  }
}

export async function getSlowEndpoints(limit = 10): Promise<{ route: string; avgDuration: number; count: number }[]> {
  try {
    const { getCollection } = await import('./cosmosdb.js');
    const col = getCollection('performance_metrics');
    const since = new Date(Date.now() - 60 * 60 * 1000);
    
    const pipeline = [
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: { route: '$route', method: '$method' },
          avgDuration: { $avg: '$duration' },
          count: { $sum: 1 },
        },
      },
      { $sort: { avgDuration: -1 } },
      { $limit: limit },
    ];
    
    const results = await col.aggregate(pipeline).toArray();
    return results.map((r: any) => ({
      route: `${r._id.method} ${r._id.route}`,
      avgDuration: Math.round(r.avgDuration),
      count: r.count,
    }));
  } catch (error) {
    return [];
  }
}

export async function getErrorSummary(hours = 24): Promise<{ code: number; count: number; percentage: number }[]> {
  try {
    const { getCollection } = await import('./cosmosdb.js');
    const col = getCollection('performance_metrics');
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const pipeline = [
      { $match: { timestamp: { $gte: since }, isError: true } },
      { $group: { _id: '$statusCode', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ];
    
    const results = await col.aggregate(pipeline).toArray();
    const total = results.reduce((sum, r) => sum + r.count, 0);
    
    return results.map((r: any) => ({
      code: r._id,
      count: r.count,
      percentage: total ? Math.round((r.count / total) * 100) : 0,
    }));
  } catch (error) {
    return [];
  }
}

export const performanceService = {
  recordApiMetrics,
  getPerformanceSummary,
  getSlowEndpoints,
  getErrorSummary,
};

export default performanceService;
