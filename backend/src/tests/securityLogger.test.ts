import { describe, expect, it, vi } from 'vitest';

vi.mock('../config.js', () => ({
  config: {
    securityLogPersistenceEnabled: false,
    securityLogRetentionHours: 24,
    securityLogDbRetentionDays: 30,
    securityLogCleanupIntervalMinutes: 60,
  },
}));

vi.mock('../services/cosmosdb.js', () => ({
  getCollectionAsync: vi.fn(),
}));

const { SecurityLogger } = await import('../services/securityLogger.js');

describe('SecurityLogger filtering', () => {
  it('filters paged logs by event type and endpoint', async () => {
    const marker = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    SecurityLogger.log({
      ip_address: '10.10.10.10',
      event_type: 'admin_login_failure',
      endpoint: `/api/auth/login?marker=${marker}`,
      metadata: { marker },
    });
    SecurityLogger.log({
      ip_address: '10.10.10.11',
      event_type: 'admin_step_up_failed',
      endpoint: `/api/auth/admin/step-up?marker=${marker}`,
      metadata: { marker },
    });

    const filtered = await SecurityLogger.getRecentLogsPaged(20, 0, {
      eventType: 'admin_step_up_failed',
      endpoint: marker,
    });

    expect(['memory', 'database']).toContain(filtered.source);
    expect(filtered.total).toBeGreaterThanOrEqual(1);
    expect(filtered.data.every((entry) => entry.event_type === 'admin_step_up_failed')).toBe(true);
    expect(filtered.data.every((entry) => entry.endpoint.includes(marker))).toBe(true);
  });

  it('supports ip filtering, pagination, and date ranges', async () => {
    const marker = `ip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ip = `203.0.113.${Math.floor(Math.random() * 200) + 10}`;

    SecurityLogger.log({
      ip_address: ip,
      event_type: 'admin_login_failure',
      endpoint: `/api/auth/login?marker=${marker}`,
      metadata: { marker, seq: 1 },
    });
    SecurityLogger.log({
      ip_address: ip,
      event_type: 'admin_step_up_failed',
      endpoint: `/api/auth/admin/step-up?marker=${marker}`,
      metadata: { marker, seq: 2 },
    });

    const pageOne = await SecurityLogger.getRecentLogsPaged(1, 0, {
      ipAddress: ip,
      endpoint: marker,
    });
    const pageTwo = await SecurityLogger.getRecentLogsPaged(1, 1, {
      ipAddress: ip,
      endpoint: marker,
    });

    expect(pageOne.total).toBe(2);
    expect(pageOne.data).toHaveLength(1);
    expect(pageTwo.data).toHaveLength(1);
    expect(pageOne.data[0]?.id).not.toBe(pageTwo.data[0]?.id);

    const futureOnly = await SecurityLogger.getRecentLogsPaged(10, 0, {
      endpoint: marker,
      start: new Date(Date.now() + 60_000),
    });
    expect(futureOnly.total).toBe(0);
    expect(futureOnly.data).toHaveLength(0);
  });
});
