import { beforeEach, describe, expect, it } from 'vitest';

import {
  getSecurityMetricSnapshot,
  incrementAuthLoginFailure,
  incrementBruteForceBlockedResponse,
  incrementRateLimitTrigger,
  resetSecurityMetrics,
} from '../services/securityMetrics.js';

describe('securityMetrics service', () => {
  beforeEach(() => {
    resetSecurityMetrics();
  });

  it('tracks counters independently', () => {
    incrementRateLimitTrigger();
    incrementRateLimitTrigger();
    incrementAuthLoginFailure();
    incrementBruteForceBlockedResponse();

    const snapshot = getSecurityMetricSnapshot();

    expect(snapshot.rateLimitTriggers).toBe(2);
    expect(snapshot.authLoginFailures).toBe(1);
    expect(snapshot.bruteForceBlockedResponses).toBe(1);
  });

  it('returns a copy of the counters snapshot', () => {
    const snapshot = getSecurityMetricSnapshot();
    snapshot.rateLimitTriggers = 999;

    const fresh = getSecurityMetricSnapshot();
    expect(fresh.rateLimitTriggers).toBe(0);
  });
});
