import crypto from 'crypto';

import { config } from '../config.js';

const SESSION_INACTIVE_WINDOW_MS = 30 * 60 * 1000;
const MAX_ACTIONS = 5;
const ADMIN_SESSION_IDLE_TIMEOUT_MS = config.adminSessionIdleTimeoutMinutes * 60 * 1000;
const ADMIN_SESSION_ABSOLUTE_TIMEOUT_MS = config.adminSessionAbsoluteTimeoutHours * 60 * 60 * 1000;

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
    const tokenExpired = record.expiresAt && record.expiresAt.getTime() < now;
    const idleExpired = now - record.lastSeen.getTime() > ADMIN_SESSION_IDLE_TIMEOUT_MS;
    const absoluteExpired = now - record.createdAt.getTime() > ADMIN_SESSION_ABSOLUTE_TIMEOUT_MS;
    if (tokenExpired || idleExpired || absoluteExpired) {
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

export const validateAdminSession = (
  sessionId?: string | null
): { valid: boolean; reason?: 'session_not_found' | 'session_expired' | 'session_idle_timeout' | 'session_absolute_timeout' } => {
  if (!sessionId) return { valid: false, reason: 'session_not_found' };
  cleanupExpiredSessions();
  const record = sessions.get(sessionId);
  if (!record) return { valid: false, reason: 'session_not_found' };

  const now = Date.now();
  if (record.expiresAt && record.expiresAt.getTime() <= now) {
    sessions.delete(sessionId);
    return { valid: false, reason: 'session_expired' };
  }
  if (now - record.lastSeen.getTime() > ADMIN_SESSION_IDLE_TIMEOUT_MS) {
    sessions.delete(sessionId);
    return { valid: false, reason: 'session_idle_timeout' };
  }
  if (now - record.createdAt.getTime() > ADMIN_SESSION_ABSOLUTE_TIMEOUT_MS) {
    sessions.delete(sessionId);
    return { valid: false, reason: 'session_absolute_timeout' };
  }

  return { valid: true };
};

export const isNewDeviceForUser = (input: {
  userId: string;
  ip: string;
  userAgent: string;
}): boolean => {
  cleanupExpiredSessions();
  const device = getDeviceLabel(input.userAgent || 'Unknown');
  const browser = getBrowserLabel(input.userAgent || 'Unknown');
  const os = getOsLabel(input.userAgent || 'Unknown');
  const userSessions = listAdminSessions(input.userId);
  if (userSessions.length === 0) return false;
  return !userSessions.some((session) =>
    session.ip === input.ip &&
    session.device === device &&
    session.browser === browser &&
    session.os === os
  );
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
