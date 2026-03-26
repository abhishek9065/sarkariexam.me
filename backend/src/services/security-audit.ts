interface SecurityEvent {
  type: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export async function logSecurityEvent(event: SecurityEvent) {
  try {
    const { getCollection } = await import('./cosmosdb.js');
    const col = getCollection('security_audit_log');
    await col.insertOne({ ...event, createdAt: new Date() } as any);
  } catch (error) {
    console.error('[SecurityAudit] Failed to log:', error);
  }
}

export async function getSecurityEvents(
  filters?: { type?: string; severity?: string; userId?: string },
  limit = 100
): Promise<SecurityEvent[]> {
  try {
    const { getCollection } = await import('./cosmosdb.js');
    const col = getCollection('security_audit_log');
    
    const query: Record<string, unknown> = {};
    if (filters?.type) query.type = filters.type;
    if (filters?.severity) query.severity = filters.severity;
    if (filters?.userId) query.userId = filters.userId;
    
    const results = await col.find(query).sort({ timestamp: -1 }).limit(limit).toArray();
    return results as unknown as SecurityEvent[];
  } catch {
    return [];
  }
}

export async function getFailedLoginAttempts(minutes = 30): Promise<{ ip: string; count: number }[]> {
  try {
    const { getCollection } = await import('./cosmosdb.js');
    const col = getCollection('security_audit_log');
    
    const since = new Date(Date.now() - minutes * 60 * 1000);
    const pipeline = [
      { $match: { type: 'failed_login', timestamp: { $gte: since } } },
      { $group: { _id: '$ip', count: { $sum: 1 } } },
      { $match: { count: { $gte: 5 } } },
      { $sort: { count: -1 } },
    ];
    
    const results = await col.aggregate(pipeline).toArray();
    return results.map((r: any) => ({ ip: r._id, count: r.count }));
  } catch {
    return [];
  }
}

export async function getSecurityStats(): Promise<{
  totalEvents24h: number;
  criticalCount: number;
  failedLogins: number;
  suspiciousIPs: number;
}> {
  try {
    const { getCollection } = await import('./cosmosdb.js');
    const col = getCollection('security_audit_log');
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [totalEvents24h, criticalCount, failedLogins, suspiciousIPs] = await Promise.all([
      col.countDocuments({ timestamp: { $gte: since } }),
      col.countDocuments({ severity: 'critical', timestamp: { $gte: since } }),
      col.countDocuments({ type: 'failed_login', timestamp: { $gte: since } }),
      getFailedLoginAttempts(60).then(ips => ips.length),
    ]);
    
    return { totalEvents24h, criticalCount, failedLogins, suspiciousIPs };
  } catch {
    return { totalEvents24h: 0, criticalCount: 0, failedLogins: 0, suspiciousIPs: 0 };
  }
}

export const securityAuditService = {
  logSecurityEvent,
  getSecurityEvents,
  getFailedLoginAttempts,
  getSecurityStats,
};

export default securityAuditService;
