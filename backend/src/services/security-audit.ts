interface SecurityEvent {
  type: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

const SAFE_TOKEN_PATTERN = /^[a-z0-9_-]+$/i;

function sanitizeToken(value: unknown, maxLength = 64): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return undefined;
  if (!SAFE_TOKEN_PATTERN.test(trimmed)) return undefined;
  return trimmed;
}

function normalizeLimit(limit: number): number {
  if (!Number.isFinite(limit)) return 100;
  const rounded = Math.trunc(limit);
  return Math.min(500, Math.max(1, rounded));
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

    const safeFilters = {
      type: sanitizeToken(filters?.type),
      severity: sanitizeToken(filters?.severity, 16),
      userId: sanitizeToken(filters?.userId, 120),
    };

    const query: Record<string, unknown> = {};
    if (safeFilters.type) query.type = { $eq: safeFilters.type };
    if (safeFilters.severity) query.severity = { $eq: safeFilters.severity };
    if (safeFilters.userId) query.userId = { $eq: safeFilters.userId };

    const results = await col.find(query).sort({ timestamp: -1 }).limit(normalizeLimit(limit)).toArray();
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
