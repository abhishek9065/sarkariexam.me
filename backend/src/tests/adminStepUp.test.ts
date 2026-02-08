import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it } from 'vitest';

import { config } from '../config.js';
import { issueAdminStepUpToken, validateAdminStepUpToken } from '../services/adminStepUp.js';
import RedisCache from '../services/redis.js';

const buildSignOptions = (expiresIn: jwt.SignOptions['expiresIn']): jwt.SignOptions => {
  const signOptions: jwt.SignOptions = { expiresIn };
  if (config.jwtIssuer) signOptions.issuer = config.jwtIssuer;
  if (config.jwtAudience) signOptions.audience = config.jwtAudience;
  return signOptions;
};

describe('Admin step-up tokens', () => {
  beforeEach(async () => {
    await RedisCache.invalidatePattern('auth:admin_step_up:');
  });

  it('validates issued step-up tokens', async () => {
    const issued = await issueAdminStepUpToken({
      userId: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
    });

    const result = await validateAdminStepUpToken(issued.token, 'admin-1');

    expect(result.valid).toBe(true);
    expect(result.payload?.userId).toBe('admin-1');
    expect(result.payload?.purpose).toBe('admin_sensitive_action');
  });

  it('rejects invalid token payloads', async () => {
    const token = jwt.sign(
      {
        userId: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
        stepUp: false,
        purpose: 'admin_sensitive_action',
        jti: 'invalid-jti',
      },
      config.jwtSecret,
      buildSignOptions('5m')
    );

    const result = await validateAdminStepUpToken(token, 'admin-1');

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('invalid_step_up_token');
  });

  it('rejects expired step-up tokens', async () => {
    const token = jwt.sign(
      {
        userId: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
        stepUp: true,
        purpose: 'admin_sensitive_action',
        jti: 'expired-jti',
      },
      config.jwtSecret,
      buildSignOptions(-1)
    );

    const result = await validateAdminStepUpToken(token, 'admin-1');

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('step_up_expired');
  });

  it('rejects tokens for another user', async () => {
    const issued = await issueAdminStepUpToken({
      userId: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
    });

    const result = await validateAdminStepUpToken(issued.token, 'admin-2');

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('step_up_user_mismatch');
  });
});
