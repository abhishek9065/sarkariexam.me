interface PerformanceMetrics {
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerMinute: number;
  errorRate: number;
  timestamp: Date;
}

// In-memory store for performance metrics (capped to avoid memory leaks)
const metricsHistory: Array<{ 
  route: string; 
  method: string; 
  duration: number; 
  statusCode: number; 
  isError: boolean; 
  timestamp: Date 
}> = [];
const MAX_METRICS = 5000;

export async function recordApiMetrics(route: string, method: string, duration: number, statusCode: number) {
  try {
    metricsHistory.push({
      route,
      method,
      duration,
      statusCode,
      isError: statusCode >= 400,
      timestamp: new Date(),
    });

    if (metricsHistory.length > MAX_METRICS) {
      metricsHistory.shift();
    }
  } catch {
    // Silent fail
  }
}

export async function getPerformanceSummary(minutes = 60): Promise<PerformanceMetrics> {
  try {
    const since = Date.now() - minutes * 60 * 1000;
    const recent = metricsHistory.filter(m => m.timestamp.getTime() >= since);
    
    if (recent.length === 0) {
      return {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        requestsPerMinute: 0,
        errorRate: 0,
        timestamp: new Date(),
      };
    }

    const durations = recent.map(m => m.duration).sort((a, b) => a - b);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    
    const getPercentile = (p: number) => {
      const idx = Math.floor(p * durations.length);
      return durations[idx] || 0;
    };

    const errorCount = recent.filter(m => m.isError).length;
    
    return {
      avgResponseTime: Math.round(avgDuration),
      p95ResponseTime: Math.round(getPercentile(0.95)),
      p99ResponseTime: Math.round(getPercentile(0.99)),
      requestsPerMinute: Math.round(recent.length / minutes),
      errorRate: (errorCount / recent.length) * 100,
      timestamp: new Date(),
    };
  } catch {
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
    const since = Date.now() - 60 * 60 * 1000;
    const recent = metricsHistory.filter(m => m.timestamp.getTime() >= since);
    
    const groups = new Map<string, { totalDuration: number; count: number }>();
    
    recent.forEach(m => {
      const key = `${m.method} ${m.route}`;
      const g = groups.get(key) || { totalDuration: 0, count: 0 };
      g.totalDuration += m.duration;
      g.count++;
      groups.set(key, g);
    });

    return Array.from(groups.entries())
      .map(([route, data]) => ({
        route,
        avgDuration: Math.round(data.totalDuration / data.count),
        count: data.count,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function getErrorSummary(hours = 24): Promise<{ code: number; count: number; percentage: number }[]> {
  try {
    const since = Date.now() - hours * 60 * 60 * 1000;
    const recentErrors = metricsHistory.filter(m => m.timestamp.getTime() >= since && m.isError);
    
    const groups = new Map<number, number>();
    recentErrors.forEach(m => {
      groups.set(m.statusCode, (groups.get(m.statusCode) || 0) + 1);
    });

    const total = recentErrors.length;
    
    return Array.from(groups.entries())
      .map(([code, count]) => ({
        code,
        count,
        percentage: total ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  } catch {
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
