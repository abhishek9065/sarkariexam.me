import RedisCache from './redis.js';

export type AuthAbuseScope = 'admin_login' | 'admin_forgot_password' | 'admin_reset_password' | 'admin_step_up';

type AbuseRecord = {
  count: number;
  blockedUntil?: number;
  lastFailureAt: number;
};

const FREE_ATTEMPTS = 3;
const BASE_DELAY_SECONDS = 30;
const MAX_DELAY_SECONDS = 30 * 60;
const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

const normalizeEmail = (email?: string): string | null => {
  if (!email) return null;
  const value = email.trim().toLowerCase();
  return value ? value : null;
};

const buildAbuseKey = (scope: AuthAbuseScope, kind: 'ip' | 'email', value: string) =>
  `auth:abuse:${scope}:${kind}:${value}`;

const computeBackoffSeconds = (count: number): number => {
  if (count <= FREE_ATTEMPTS) return 0;
  const exponent = count - FREE_ATTEMPTS - 1;
  return Math.min(MAX_DELAY_SECONDS, BASE_DELAY_SECONDS * Math.pow(2, exponent));
};

const computeTtlSeconds = (blockedUntilMs?: number): number => {
  if (!blockedUntilMs) return DEFAULT_TTL_SECONDS;
  const secondsUntilBlockEnds = Math.max(0, Math.ceil((blockedUntilMs - Date.now()) / 1000));
  return Math.max(DEFAULT_TTL_SECONDS, secondsUntilBlockEnds + 60 * 60);
};

const readRecord = async (key: string): Promise<AbuseRecord | null> => {
  const record = await RedisCache.get(key);
  if (!record) return null;
  if (typeof record !== 'object') return null;
  return {
    count: Number((record as any).count ?? 0),
    blockedUntil: typeof (record as any).blockedUntil === 'number' ? (record as any).blockedUntil : undefined,
    lastFailureAt: Number((record as any).lastFailureAt ?? Date.now()),
  };
};

export const getAuthAbuseStatus = async (input: {
  scope: AuthAbuseScope;
  ip: string;
  email?: string;
}): Promise<{ blocked: boolean; retryAfterSeconds: number; count: number }> => {
  const email = normalizeEmail(input.email);
  const keys = [
    buildAbuseKey(input.scope, 'ip', input.ip),
    ...(email ? [buildAbuseKey(input.scope, 'email', email)] : []),
  ];
  const records = await Promise.all(keys.map((key) => readRecord(key)));
  const now = Date.now();
  const activeBlocks = records
    .map((record) => (record?.blockedUntil && record.blockedUntil > now ? record.blockedUntil : 0))
    .filter(Boolean);

  const retryAfterSeconds = activeBlocks.length > 0
    ? Math.max(1, Math.ceil((Math.max(...activeBlocks) - now) / 1000))
    : 0;

  return {
    blocked: retryAfterSeconds > 0,
    retryAfterSeconds,
    count: Math.max(...records.map((record) => record?.count ?? 0), 0),
  };
};

const incrementRecord = async (key: string): Promise<{ count: number; retryAfterSeconds: number }> => {
  const current = await readRecord(key);
  const count = (current?.count ?? 0) + 1;
  const now = Date.now();
  const backoffSeconds = computeBackoffSeconds(count);
  const blockedUntil = backoffSeconds > 0
    ? Math.max(current?.blockedUntil ?? 0, now + backoffSeconds * 1000)
    : current?.blockedUntil;

  await RedisCache.set(key, {
    count,
    blockedUntil,
    lastFailureAt: now,
  }, computeTtlSeconds(blockedUntil));

  const retryAfterSeconds = blockedUntil && blockedUntil > now
    ? Math.ceil((blockedUntil - now) / 1000)
    : 0;

  return { count, retryAfterSeconds };
};

export const recordAuthAbuseFailure = async (input: {
  scope: AuthAbuseScope;
  ip: string;
  email?: string;
}): Promise<{ count: number; retryAfterSeconds: number }> => {
  const email = normalizeEmail(input.email);
  const keys = [
    buildAbuseKey(input.scope, 'ip', input.ip),
    ...(email ? [buildAbuseKey(input.scope, 'email', email)] : []),
  ];
  const updates = await Promise.all(keys.map((key) => incrementRecord(key)));
  return updates.reduce(
    (acc, current) => ({
      count: Math.max(acc.count, current.count),
      retryAfterSeconds: Math.max(acc.retryAfterSeconds, current.retryAfterSeconds),
    }),
    { count: 0, retryAfterSeconds: 0 }
  );
};

export const clearAuthAbuseFailures = async (input: {
  scope: AuthAbuseScope;
  ip: string;
  email?: string;
}): Promise<void> => {
  const email = normalizeEmail(input.email);
  const keys = [
    buildAbuseKey(input.scope, 'ip', input.ip),
    ...(email ? [buildAbuseKey(input.scope, 'email', email)] : []),
  ];
  await Promise.all(keys.map((key) => RedisCache.del(key)));
};
