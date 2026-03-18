import crypto from 'crypto';

import jwt from 'jsonwebtoken';

import { config } from '../config.js';

import RedisCache from './redis.js';

export const ADMIN_STEP_UP_HEADER = 'x-admin-step-up-token';

export interface AdminStepUpTokenPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  stepUp: true;
  purpose: 'admin_sensitive_action';
  jti: string;
  iat?: number;
  exp?: number;
}

const buildVerifyOptions = () => {
  const verifyOptions: jwt.VerifyOptions = {};
  if (config.jwtIssuer) verifyOptions.issuer = config.jwtIssuer;
  if (config.jwtAudience) verifyOptions.audience = config.jwtAudience;
  return verifyOptions;
};

const buildSignOptions = (): jwt.SignOptions => {
  const signOptions: jwt.SignOptions = { expiresIn: config.adminStepUpTtlSeconds };
  if (config.jwtIssuer) signOptions.issuer = config.jwtIssuer;
  if (config.jwtAudience) signOptions.audience = config.jwtAudience;
  return signOptions;
};

const getStepUpGrantKey = (jti: string) => `auth:admin_step_up:${jti}`;
const getUserGrantIndexKey = (userId: string) => `auth:admin_step_up:user:${userId}`;
const getSessionGrantIndexKey = (sessionId: string) => `auth:admin_step_up:session:${sessionId}`;

type AdminStepUpGrantRecord = {
  userId: string;
  sessionId: string;
  issuedAt: number;
};

const readGrantIndex = async (key: string): Promise<string[]> => {
  const raw = await RedisCache.get(key);
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is string => typeof value === 'string' && value.length > 0);
};

const writeGrantIndex = async (key: string, values: string[]): Promise<void> => {
  const deduped = Array.from(new Set(values));
  if (deduped.length === 0) {
    await RedisCache.del(key);
    return;
  }
  await RedisCache.set(key, deduped, config.adminStepUpTtlSeconds + 60);
};

const addGrantToIndex = async (key: string, jti: string): Promise<void> => {
  const current = await readGrantIndex(key);
  if (current.includes(jti)) {
    await writeGrantIndex(key, current);
    return;
  }
  current.push(jti);
  await writeGrantIndex(key, current);
};

const removeGrantFromIndex = async (key: string, jti: string): Promise<void> => {
  const current = await readGrantIndex(key);
  if (current.length === 0) return;
  const next = current.filter((value) => value !== jti);
  if (next.length === current.length) {
    await writeGrantIndex(key, current);
    return;
  }
  await writeGrantIndex(key, next);
};

const revokeGrantByJti = async (jti: string): Promise<void> => {
  const grantKey = getStepUpGrantKey(jti);
  const record = await RedisCache.get(grantKey) as AdminStepUpGrantRecord | null;
  await RedisCache.del(grantKey);
  if (!record) return;
  await Promise.all([
    removeGrantFromIndex(getUserGrantIndexKey(record.userId), jti),
    removeGrantFromIndex(getSessionGrantIndexKey(record.sessionId), jti),
  ]);
};

export const issueAdminStepUpToken = async (payload: {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
}) => {
  const jti = crypto.randomUUID();
  const tokenPayload: Omit<AdminStepUpTokenPayload, 'iat' | 'exp'> = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    sessionId: payload.sessionId,
    stepUp: true,
    purpose: 'admin_sensitive_action',
    jti,
  };
  const token = jwt.sign(tokenPayload, config.jwtSecret, buildSignOptions());
  const expiresAt = new Date(Date.now() + config.adminStepUpTtlSeconds * 1000).toISOString();
  await RedisCache.set(getStepUpGrantKey(jti), {
    userId: payload.userId,
    sessionId: payload.sessionId,
    issuedAt: Date.now(),
  }, config.adminStepUpTtlSeconds + 60);
  await Promise.all([
    addGrantToIndex(getUserGrantIndexKey(payload.userId), jti),
    addGrantToIndex(getSessionGrantIndexKey(payload.sessionId), jti),
  ]);
  return { token, expiresAt };
};

export const validateAdminStepUpToken = async (
  token: string,
  expectedUserId: string,
  expectedSessionId: string
): Promise<{ valid: boolean; reason?: string; payload?: AdminStepUpTokenPayload }> => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, buildVerifyOptions()) as AdminStepUpTokenPayload;
    if (!decoded?.stepUp || decoded.purpose !== 'admin_sensitive_action' || !decoded.jti) {
      return { valid: false, reason: 'invalid_step_up_token' };
    }
    if (decoded.userId !== expectedUserId) {
      return { valid: false, reason: 'step_up_user_mismatch' };
    }
    if (!decoded.sessionId || decoded.sessionId !== expectedSessionId) {
      return { valid: false, reason: 'step_up_session_mismatch' };
    }
    const record = await RedisCache.get(getStepUpGrantKey(decoded.jti));
    if (!record || record.userId !== expectedUserId || record.sessionId !== expectedSessionId) {
      return { valid: false, reason: 'step_up_expired' };
    }
    return { valid: true, payload: decoded };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, reason: 'step_up_expired' };
    }
    return { valid: false, reason: 'invalid_step_up_token' };
  }
};

export const revokeAdminStepUpToken = async (jti: string): Promise<void> => {
  await revokeGrantByJti(jti);
};

export const revokeAdminStepUpGrantsForSession = async (sessionId?: string | null): Promise<void> => {
  if (!sessionId) return;
  const jtIs = await readGrantIndex(getSessionGrantIndexKey(sessionId));
  await Promise.all(Array.from(new Set(jtIs)).map((jti) => revokeGrantByJti(jti)));
};

export const revokeAdminStepUpGrantsForUser = async (userId?: string | null): Promise<void> => {
  if (!userId) return;
  const jtIs = await readGrantIndex(getUserGrantIndexKey(userId));
  await Promise.all(Array.from(new Set(jtIs)).map((jti) => revokeGrantByJti(jti)));
};
