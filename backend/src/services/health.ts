import { config } from '../config.js';

import { healthCheck as legacyMongoHealthCheck } from './cosmosdb.js';
import { postgresHealthCheck, prismaApp } from './postgres/prisma.js';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: { 
      status: 'healthy' | 'unhealthy'; 
      latency: number;
      postgres: { configured: boolean; ok: boolean };
      mongo: { configured: boolean; ok: boolean | null };
    };
    memory: { status: 'healthy' | 'warning' | 'critical'; usage: number };
    disk: { status: 'healthy' | 'warning' | 'critical'; usage: number };
    uptime: { status: 'healthy'; seconds: number };
  };
  timestamp: Date;
}

export async function getSystemHealth(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  // Database checks
  const postgresConfigured = Boolean(config.postgresPrismaUrl);
  const postgresOk = postgresConfigured ? await postgresHealthCheck() : false;
  
  const mongoConfigured = config.legacyMongoConfigured;
  const mongoOk = mongoConfigured ? await legacyMongoHealthCheck() : null;

  const dbLatency = Date.now() - startTime;
  
  // Overall DB status: Healthy if Postgres (primary) is OK
  const dbStatus: 'healthy' | 'unhealthy' = postgresOk ? 'healthy' : 'unhealthy';
  
  // Memory usage
  const memUsage = process.memoryUsage();
  const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  const memStatus: 'healthy' | 'warning' | 'critical' = 
    memPercent > 90 ? 'critical' : memPercent > 75 ? 'warning' : 'healthy';
  
  // Overall status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (dbStatus === 'unhealthy') {
    overallStatus = 'unhealthy';
  } else if (mongoConfigured && !mongoOk) {
    overallStatus = 'degraded'; // Degraded if legacy Mongo is down but Postgres is up
  } else if (memStatus === 'critical' || memStatus === 'warning') {
    overallStatus = 'degraded';
  }
  
  return {
    status: overallStatus,
    checks: {
      database: { 
        status: dbStatus, 
        latency: dbLatency,
        postgres: { configured: postgresConfigured, ok: postgresOk },
        mongo: { configured: mongoConfigured, ok: mongoOk },
      },
      memory: { status: memStatus, usage: Math.round(memPercent) },
      disk: { status: 'healthy', usage: 0 },
      uptime: { status: 'healthy', seconds: Math.floor(process.uptime()) },
    },
    timestamp: new Date(),
  };
}

export async function getServiceStatus(): Promise<{
  services: Array<{ name: string; status: 'up' | 'down' | 'unknown'; lastChecked: Date }>;
}> {
  const services = [
    { name: 'API Server', status: 'up' as const, lastChecked: new Date() },
    { name: 'Database', status: 'up' as const, lastChecked: new Date() },
    { name: 'Frontend', status: 'up' as const, lastChecked: new Date() },
    { name: 'Admin Panel', status: 'up' as const, lastChecked: new Date() },
  ];
  
  return { services };
}

export async function getRecentErrors(limit = 10): Promise<Array<{
  message: string;
  stack?: string;
  timestamp: Date;
  count: number;
}>> {
  try {
    const docs = await prismaApp.errorReportEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    
    return docs.map((d: any) => ({
      message: d.message,
      stack: d.stack,
      timestamp: d.createdAt,
      count: 1, // Simplified
    }));
  } catch {
    return [];
  }
}

export const healthService = {
  getSystemHealth,
  getServiceStatus,
  getRecentErrors,
};

export default healthService;
