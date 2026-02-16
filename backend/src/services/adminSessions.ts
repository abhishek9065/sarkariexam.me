import crypto from 'crypto';

import { config } from '../config.js';

import RedisCache from './redis.js';

const SESSION_INACTIVE_WINDOW_MS = 30 * 60 * 1000;
const MAX_ACTIONS = 5;
const ADMIN_SESSION_IDLE_TIMEOUT_MS = config.adminSessionIdleTimeoutMinutes * 60 * 1000;
const ADMIN_SESSION_ABSOLUTE_TIMEOUT_MS = config.adminSessionAbsoluteTimeoutHours * 60 * 60 * 1000;
const SESSION_INDEX_KEY = 'auth:admin_sessions:index';
const USER_SESSION_INDEX_KEY_PREFIX = 'auth:admin_sessions:user:';
const SESSION_KEY_PREFIX = 'auth:admin_session:';
const INDEX_TTL_SECONDS = Math.max(24 * 60 * 60, Math.ceil(ADMIN_SESSION_ABSOLUTE_TIMEOUT_MS / 1000) + (24 * 60 * 60));

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

type SerializedAdminSessionRecord = Omit<AdminSessionRecord, 'createdAt' | 'lastSeen' | 'expiresAt'> & {
  createdAt: string;
  lastSeen: string;
  expiresAt?: string | null;
};

type TouchPayload = {
  userId: string;
  email: string;
  ip: string;
  userAgent: string;
  expiresAt?: Date | null;
};

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

const getSessionKey = (sessionId: string) => `${SESSION_KEY_PREFIX}${sessionId}`;
const getUserIndexKey = (userId: string) => `${USER_SESSION_INDEX_KEY_PREFIX}${userId}`;

const readIndex = async (key: string): Promise<string[]> => {
  const raw = await RedisCache.get(key);
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is string => typeof value === 'string' && value.length > 0);
};

const writeIndex = async (key: string, values: string[]): Promise<void> => {
  const deduped = Array.from(new Set(values));
  if (deduped.length === 0) {
    await RedisCache.del(key);
    return;
  }
  await RedisCache.set(key, deduped, INDEX_TTL_SECONDS);
};

const addToIndex = async (key: string, sessionId: string): Promise<void> => {
  const current = await readIndex(key);
  if (current.includes(sessionId)) {
    await writeIndex(key, current);
    return;
  }
  current.push(sessionId);
  await writeIndex(key, current);
};

const removeFromIndex = async (key: string, sessionId: string): Promise<void> => {
  const current = await readIndex(key);
  if (current.length === 0) return;
  const next = current.filter((value) => value !== sessionId);
  if (next.length === current.length) {
    await writeIndex(key, current);
    return;
  }
  await writeIndex(key, next);
};

const serializeRecord = (record: AdminSessionRecord): SerializedAdminSessionRecord => ({
  ...record,
  createdAt: record.createdAt.toISOString(),
  lastSeen: record.lastSeen.toISOString(),
  expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
});

const parseDate = (value: unknown): Date | null => {
  if (!value || typeof value !== 'string') return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const deserializeRecord = (raw: any): AdminSessionRecord | null => {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string' || typeof raw.userId !== 'string' || typeof raw.email !== 'string') {
    return null;
  }
  const createdAt = parseDate(raw.createdAt);
  const lastSeen = parseDate(raw.lastSeen);
  if (!createdAt || !lastSeen) {
    return null;
  }
  return {
    id: raw.id,
    userId: raw.userId,
    email: raw.email,
    ip: typeof raw.ip === 'string' ? raw.ip : 'unknown',
    userAgent: typeof raw.userAgent === 'string' ? raw.userAgent : 'Unknown',
    device: typeof raw.device === 'string' ? raw.device : 'Desktop',
    browser: typeof raw.browser === 'string' ? raw.browser : 'Browser',
    os: typeof raw.os === 'string' ? raw.os : 'OS',
    createdAt,
    lastSeen,
    expiresAt: parseDate(raw.expiresAt),
    actions: Array.isArray(raw.actions)
      ? raw.actions.filter((action: unknown): action is string => typeof action === 'string').slice(0, MAX_ACTIONS)
      : [],
  };
};

const getSessionExpiryReason = (
  record: AdminSessionRecord,
  now: number = Date.now()
): 'session_expired' | 'session_idle_timeout' | 'session_absolute_timeout' | null => {
  if (record.expiresAt && record.expiresAt.getTime() <= now) {
    return 'session_expired';
  }
  if (now - record.lastSeen.getTime() > ADMIN_SESSION_IDLE_TIMEOUT_MS) {
    return 'session_idle_timeout';
  }
  if (now - record.createdAt.getTime() > ADMIN_SESSION_ABSOLUTE_TIMEOUT_MS) {
    return 'session_absolute_timeout';
  }
  return null;
};

const getSessionTtlSeconds = (record: AdminSessionRecord): number => {
  const now = Date.now();
  const expiryCandidates = [
    record.lastSeen.getTime() + ADMIN_SESSION_IDLE_TIMEOUT_MS,
    record.createdAt.getTime() + ADMIN_SESSION_ABSOLUTE_TIMEOUT_MS,
  ];
  if (record.expiresAt) {
    expiryCandidates.push(record.expiresAt.getTime());
  }
  const expiresAt = Math.min(...expiryCandidates);
  const ttlMs = expiresAt - now;
  if (ttlMs <= 0) return 0;
  return Math.max(1, Math.ceil(ttlMs / 1000));
};

const readSessionRecord = async (sessionId: string): Promise<AdminSessionRecord | null> => {
  const raw = await RedisCache.get(getSessionKey(sessionId));
  return deserializeRecord(raw);
};

const writeSessionRecord = async (record: AdminSessionRecord): Promise<boolean> => {
  const ttlSeconds = getSessionTtlSeconds(record);
  if (ttlSeconds <= 0) {
    await RedisCache.del(getSessionKey(record.id));
    return false;
  }
  await RedisCache.set(getSessionKey(record.id), serializeRecord(record), ttlSeconds);
  return true;
};

const removeSessionRecord = async (sessionId: string, userIdHint?: string): Promise<void> => {
  let userId = userIdHint;
  if (!userId) {
    const existing = await readSessionRecord(sessionId);
    userId = existing?.userId;
  }

  await RedisCache.del(getSessionKey(sessionId));
  await removeFromIndex(SESSION_INDEX_KEY, sessionId);
  if (userId) {
    await removeFromIndex(getUserIndexKey(userId), sessionId);
  }
};

const ensureSessionIndexed = async (record: AdminSessionRecord): Promise<void> => {
  await Promise.all([
    addToIndex(SESSION_INDEX_KEY, record.id),
    addToIndex(getUserIndexKey(record.userId), record.id),
  ]);
};

const cleanupSessionIfExpired = async (record: AdminSessionRecord): Promise<boolean> => {
  const reason = getSessionExpiryReason(record);
  if (!reason) return false;
  await removeSessionRecord(record.id, record.userId);
  return true;
};

const getSessionsFromIndex = async (indexKey: string, userIdHint?: string): Promise<AdminSessionRecord[]> => {
  const sessionIds = await readIndex(indexKey);
  if (sessionIds.length === 0) {
    return [];
  }

  const records = await Promise.all(sessionIds.map(async (sessionId) => ({
    sessionId,
    record: await readSessionRecord(sessionId),
  })));

  const active: AdminSessionRecord[] = [];
  for (const item of records) {
    if (!item.record) {
      await removeSessionRecord(item.sessionId, userIdHint);
      continue;
    }
    const expired = await cleanupSessionIfExpired(item.record);
    if (!expired) {
      active.push(item.record);
    }
  }

  return active.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
};

export const createAdminSession = async (payload: TouchPayload & { sessionId?: string }): Promise<AdminSessionRecord> => {
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

  await writeSessionRecord(record);
  await ensureSessionIndexed(record);
  return record;
};

export const touchAdminSession = async (
  sessionId: string,
  payload?: TouchPayload,
  action?: string
): Promise<AdminSessionRecord | null> => {
  const existing = await getAdminSession(sessionId);
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

  const persisted = await writeSessionRecord(existing);
  if (!persisted) {
    await removeSessionRecord(existing.id, existing.userId);
    return null;
  }

  await ensureSessionIndexed(existing);
  return existing;
};

export const listAdminSessions = async (userId?: string): Promise<AdminSessionRecord[]> => {
  if (userId) {
    return getSessionsFromIndex(getUserIndexKey(userId), userId);
  }
  return getSessionsFromIndex(SESSION_INDEX_KEY);
};

export const validateAdminSession = async (
  sessionId?: string | null
): Promise<{ valid: boolean; reason?: 'session_not_found' | 'session_expired' | 'session_idle_timeout' | 'session_absolute_timeout' }> => {
  if (!sessionId) return { valid: false, reason: 'session_not_found' };

  const record = await readSessionRecord(sessionId);
  if (!record) {
    await removeSessionRecord(sessionId);
    return { valid: false, reason: 'session_not_found' };
  }

  const reason = getSessionExpiryReason(record);
  if (reason) {
    await removeSessionRecord(sessionId, record.userId);
    return { valid: false, reason };
  }

  return { valid: true };
};

export const isNewDeviceForUser = async (input: {
  userId: string;
  ip: string;
  userAgent: string;
}): Promise<boolean> => {
  const device = getDeviceLabel(input.userAgent || 'Unknown');
  const browser = getBrowserLabel(input.userAgent || 'Unknown');
  const os = getOsLabel(input.userAgent || 'Unknown');
  const userSessions = await listAdminSessions(input.userId);
  if (userSessions.length === 0) return false;

  return !userSessions.some((session) =>
    session.ip === input.ip &&
    session.device === device &&
    session.browser === browser &&
    session.os === os
  );
};

export const getAdminSession = async (sessionId?: string | null): Promise<AdminSessionRecord | null> => {
  if (!sessionId) return null;
  const record = await readSessionRecord(sessionId);
  if (!record) {
    await removeSessionRecord(sessionId);
    return null;
  }
  const expired = await cleanupSessionIfExpired(record);
  if (expired) {
    return null;
  }
  return record;
};

export const terminateAdminSession = async (sessionId: string): Promise<boolean> => {
  const existing = await readSessionRecord(sessionId);
  if (!existing) {
    await removeSessionRecord(sessionId);
    return false;
  }
  await removeSessionRecord(sessionId, existing.userId);
  return true;
};

export const terminateOtherSessions = async (userId: string, currentSessionId?: string | null): Promise<number> => {
  const sessions = await listAdminSessions(userId);
  let removed = 0;

  for (const record of sessions) {
    if (currentSessionId && record.id === currentSessionId) continue;
    const didRemove = await terminateAdminSession(record.id);
    if (didRemove) {
      removed += 1;
    }
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
