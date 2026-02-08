import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import { config } from '../config.js';
import RedisCache from './redis.js';

export const ADMIN_STEP_UP_HEADER = 'x-admin-step-up-token';

export interface AdminStepUpTokenPayload {
  userId: string;
  email: string;
  role: string;
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

export const issueAdminStepUpToken = async (payload: {
  userId: string;
  email: string;
  role: string;
}) => {
  const jti = crypto.randomUUID();
  const tokenPayload: Omit<AdminStepUpTokenPayload, 'iat' | 'exp'> = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    stepUp: true,
    purpose: 'admin_sensitive_action',
    jti,
  };
  const token = jwt.sign(tokenPayload, config.jwtSecret, buildSignOptions());
  const expiresAt = new Date(Date.now() + config.adminStepUpTtlSeconds * 1000).toISOString();
  await RedisCache.set(getStepUpGrantKey(jti), {
    userId: payload.userId,
    issuedAt: Date.now(),
  }, config.adminStepUpTtlSeconds + 60);
  return { token, expiresAt };
};

export const validateAdminStepUpToken = async (
  token: string,
  expectedUserId: string
): Promise<{ valid: boolean; reason?: string; payload?: AdminStepUpTokenPayload }> => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, buildVerifyOptions()) as AdminStepUpTokenPayload;
    if (!decoded?.stepUp || decoded.purpose !== 'admin_sensitive_action' || !decoded.jti) {
      return { valid: false, reason: 'invalid_step_up_token' };
    }
    if (decoded.userId !== expectedUserId) {
      return { valid: false, reason: 'step_up_user_mismatch' };
    }
    const record = await RedisCache.get(getStepUpGrantKey(decoded.jti));
    if (!record || record.userId !== expectedUserId) {
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
  await RedisCache.del(getStepUpGrantKey(jti));
};
