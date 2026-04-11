export interface SecurityMetricsSnapshot {
  rateLimitTriggers: number;
  authLoginFailures: number;
  bruteForceBlockedResponses: number;
}

const securityMetrics: SecurityMetricsSnapshot = {
  rateLimitTriggers: 0,
  authLoginFailures: 0,
  bruteForceBlockedResponses: 0,
};

export const incrementRateLimitTrigger = (): void => {
  securityMetrics.rateLimitTriggers += 1;
};

export const incrementAuthLoginFailure = (): void => {
  securityMetrics.authLoginFailures += 1;
};

export const incrementBruteForceBlockedResponse = (): void => {
  securityMetrics.bruteForceBlockedResponses += 1;
};

export const getSecurityMetricSnapshot = (): SecurityMetricsSnapshot => ({
  ...securityMetrics,
});

export const resetSecurityMetrics = (): void => {
  securityMetrics.rateLimitTriggers = 0;
  securityMetrics.authLoginFailures = 0;
  securityMetrics.bruteForceBlockedResponses = 0;
};
