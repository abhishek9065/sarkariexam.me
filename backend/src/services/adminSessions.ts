import crypto from 'crypto';

const SESSION_INACTIVE_WINDOW_MS = 30 * 60 * 1000;
const MAX_ACTIONS = 5;

export type AdminSessionRecord = {
  id: string;
  userId: string;
  email: string;
  ip: string;
  userAgent: string;
  device: string;
  browser: string;
  os: string;
  createdAt: Date;
  lastSeen: Date;
  expiresAt?: Date | null;
  actions: string[];
};

type TouchPayload = {
  userId: string;
  email: string;
  ip: string;
  userAgent: string;
  expiresAt?: Date | null;
};

const sessions = new Map<string, AdminSessionRecord>();

const getDeviceLabel = (ua: string) => {
  if (/ipad|tablet/i.test(ua)) return 'Tablet';
  if (/mobile|iphone|android/i.test(ua)) return 'Mobile';
  return 'Desktop';
};

const getBrowserLabel = (ua: string) => {
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Browser';
};

const getOsLabel = (ua: string) => {
  if (/windows/i.test(ua)) return 'Windows';
  if (/mac os x|macintosh/i.test(ua)) return 'macOS';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ios/i.test(ua)) return 'iOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'OS';
};

const normalizeAction = (action?: string) => {
  if (!action) return null;
  return action.split('?')[0];
};

const computeRiskScore = (record: AdminSessionRecord): 'low' | 'medium' | 'high' => {
  if (!record.userAgent) return 'medium';
  if (record.device === 'Mobile' && record.browser === 'Browser') return 'medium';
  return 'low';
};

const cleanupExpiredSessions = () => {
  const now = Date.now();
  for (const [id, record] of sessions.entries()) {
    if (record.expiresAt && record.expiresAt.getTime() < now) {
      sessions.delete(id);
    }
  }
};

export const createAdminSession = (payload: TouchPayload & { sessionId?: string }): AdminSessionRecord => {
  cleanupExpiredSessions();
  const sessionId = payload.sessionId ?? crypto.randomUUID();
  const now = new Date();
  const userAgent = payload.userAgent || 'Unknown';
  const record: AdminSessionRecord = {
    id: sessionId,
    userId: payload.userId,
    email: payload.email,
    ip: payload.ip,
    userAgent,
    device: getDeviceLabel(userAgent),
    browser: getBrowserLabel(userAgent),
    os: getOsLabel(userAgent),
    createdAt: now,
    lastSeen: now,
    expiresAt: payload.expiresAt ?? null,
    actions: [],
  };
  sessions.set(sessionId, record);
  return record;
};

export const touchAdminSession = (
  sessionId: string,
  payload?: TouchPayload,
  action?: string
): AdminSessionRecord | null => {
  cleanupExpiredSessions();
  const existing = sessions.get(sessionId);
  if (!existing) {
    if (!payload) return null;
    return createAdminSession({ ...payload, sessionId });
  }
  existing.lastSeen = new Date();
  if (payload?.ip) existing.ip = payload.ip;
  if (payload?.userAgent) {
    existing.userAgent = payload.userAgent;
    existing.device = getDeviceLabel(payload.userAgent);
    existing.browser = getBrowserLabel(payload.userAgent);
    existing.os = getOsLabel(payload.userAgent);
  }
  if (payload?.expiresAt) {
    existing.expiresAt = payload.expiresAt;
  }
  const normalized = normalizeAction(action);
  if (normalized) {
    const next = [normalized, ...existing.actions.filter((item) => item !== normalized)].slice(0, MAX_ACTIONS);
    existing.actions = next;
  }
  sessions.set(sessionId, existing);
  return existing;
};

export const listAdminSessions = (userId?: string): AdminSessionRecord[] => {
  cleanupExpiredSessions();
  const records = Array.from(sessions.values());
  const filtered = userId ? records.filter((session) => session.userId === userId) : records;
  return filtered.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
};

export const getAdminSession = (sessionId?: string | null): AdminSessionRecord | null => {
  if (!sessionId) return null;
  cleanupExpiredSessions();
  return sessions.get(sessionId) ?? null;
};

export const terminateAdminSession = (sessionId: string): boolean => {
  cleanupExpiredSessions();
  return sessions.delete(sessionId);
};

export const terminateOtherSessions = (userId: string, currentSessionId?: string | null): number => {
  cleanupExpiredSessions();
  let removed = 0;
  for (const [id, record] of sessions.entries()) {
    if (record.userId !== userId) continue;
    if (currentSessionId && id === currentSessionId) continue;
    sessions.delete(id);
    removed += 1;
  }
  return removed;
};

export const mapSessionForClient = (record: AdminSessionRecord, currentSessionId?: string | null) => {
  const isCurrent = record.id === currentSessionId;
  const lastSeenMs = Date.now() - record.lastSeen.getTime();
  const isActive = lastSeenMs < SESSION_INACTIVE_WINDOW_MS;
  return {
    id: record.id,
    userId: record.userId,
    email: record.email,
    ip: record.ip,
    userAgent: record.userAgent,
    device: record.device,
    browser: record.browser,
    os: record.os,
    loginTime: record.createdAt.toISOString(),
    lastActivity: record.lastSeen.toISOString(),
    expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
    isActive,
    isCurrentSession: isCurrent,
    riskScore: computeRiskScore(record),
    actions: record.actions,
  };
};
