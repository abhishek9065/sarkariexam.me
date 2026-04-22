import crypto from 'crypto';

import { config } from '../config.js';

import RedisCache from './redis.js';

const TOKEN_KEY_PREFIX = 'auth:password-recovery:token';
const USER_KEY_PREFIX = 'auth:password-recovery:user';

export type PasswordRecoveryTokenPayload = {
  userId: string;
  email: string;
  createdAt: string;
  requestIp?: string;
  attempts: number;
};

const tokenKeyFromHash = (hash: string) => `${TOKEN_KEY_PREFIX}:${hash}`;
const userKey = (userId: string) => `${USER_KEY_PREFIX}:${userId}`;

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const createToken = () => crypto.randomBytes(32).toString('base64url');

const normalizePayload = (raw: unknown): PasswordRecoveryTokenPayload | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const value = raw as Record<string, unknown>;
  if (typeof value.userId !== 'string' || !value.userId.trim()) return null;
  if (typeof value.email !== 'string' || !value.email.trim()) return null;
  if (typeof value.createdAt !== 'string' || !value.createdAt.trim()) return null;

  const attempts = Number(value.attempts ?? 0);

  return {
    userId: value.userId,
    email: value.email,
    createdAt: value.createdAt,
    requestIp: typeof value.requestIp === 'string' ? value.requestIp : undefined,
    attempts: Number.isFinite(attempts) ? attempts : 0,
  };
};

export const issuePasswordRecoveryToken = async (params: {
  userId: string;
  email: string;
  requestIp?: string;
}): Promise<string> => {
  const token = createToken();
  const hash = hashToken(token);

  const payload: PasswordRecoveryTokenPayload = {
    userId: params.userId,
    email: params.email.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
    requestIp: params.requestIp,
    attempts: 0,
  };

  const previousHash = await RedisCache.get(userKey(params.userId));
  if (typeof previousHash === 'string' && previousHash.trim()) {
    await RedisCache.del(tokenKeyFromHash(previousHash));
  }

  await RedisCache.set(tokenKeyFromHash(hash), payload, config.passwordRecoveryTokenTtlSeconds);
  await RedisCache.set(userKey(params.userId), hash, config.passwordRecoveryTokenTtlSeconds);

  return token;
};

export const getPasswordRecoveryToken = async (token: string): Promise<PasswordRecoveryTokenPayload | null> => {
  if (!token?.trim()) return null;

  const payload = normalizePayload(await RedisCache.get(tokenKeyFromHash(hashToken(token))));
  if (!payload) return null;

  if (payload.attempts >= config.passwordRecoveryMaxAttempts) {
    await RedisCache.del(tokenKeyFromHash(hashToken(token)));
    await RedisCache.del(userKey(payload.userId));
    return null;
  }

  return payload;
};

export const consumePasswordRecoveryToken = async (token: string): Promise<PasswordRecoveryTokenPayload | null> => {
  if (!token?.trim()) return null;

  const hash = hashToken(token);
  const key = tokenKeyFromHash(hash);
  const payload = normalizePayload(await RedisCache.get(key));
  if (!payload) return null;

  await RedisCache.del(key);
  await RedisCache.del(userKey(payload.userId));
  return payload;
};

export const markPasswordRecoveryAttempt = async (token: string): Promise<number> => {
  if (!token?.trim()) return 0;

  const hash = hashToken(token);
  const key = tokenKeyFromHash(hash);
  const payload = normalizePayload(await RedisCache.get(key));
  if (!payload) return 0;

  const nextAttempts = payload.attempts + 1;

  if (nextAttempts >= config.passwordRecoveryMaxAttempts) {
    await RedisCache.del(key);
    await RedisCache.del(userKey(payload.userId));
    return nextAttempts;
  }

  await RedisCache.set(
    key,
    {
      ...payload,
      attempts: nextAttempts,
    },
    config.passwordRecoveryTokenTtlSeconds,
  );
  await RedisCache.set(userKey(payload.userId), hash, config.passwordRecoveryTokenTtlSeconds);

  return nextAttempts;
};

export const revokePasswordRecoveryTokenForUser = async (userId: string): Promise<void> => {
  if (!userId?.trim()) return;

  const key = userKey(userId);
  const hash = await RedisCache.get(key);
  if (typeof hash === 'string' && hash.trim()) {
    await RedisCache.del(tokenKeyFromHash(hash));
  }

  await RedisCache.del(key);
};
