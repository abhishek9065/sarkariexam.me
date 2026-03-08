import type { Request } from 'express';
import { describe, expect, it } from 'vitest';

import { getClientIP } from '../middleware/security.js';

const buildRequest = (overrides: {
  realIp?: string;
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string | null };
}): Request => {
  return {
    headers: {},
    socket: { remoteAddress: null } as unknown as Request['socket'],
    ...overrides,
  } as Request;
};

describe('getClientIP', () => {
  it('prefers the validated realIp set earlier in the middleware chain', () => {
    const req = buildRequest({
      realIp: '203.0.113.10',
      ip: '10.0.0.10',
      socket: { remoteAddress: '10.0.0.10' },
    });

    expect(getClientIP(req)).toBe('203.0.113.10');
  });

  it('trusts proxy IP headers only when the immediate peer is an internal proxy', () => {
    const req = buildRequest({
      headers: { 'x-real-ip': '198.51.100.25', 'x-forwarded-for': '198.51.100.25' },
      socket: { remoteAddress: '172.18.0.4' },
    });

    expect(getClientIP(req)).toBe('198.51.100.25');
  });

  it('ignores spoofed proxy headers from untrusted peers', () => {
    const req = buildRequest({
      headers: { 'x-real-ip': '198.51.100.25', 'x-forwarded-for': '198.51.100.25' },
      socket: { remoteAddress: '203.0.113.44' },
    });

    expect(getClientIP(req)).toBe('203.0.113.44');
  });
});
