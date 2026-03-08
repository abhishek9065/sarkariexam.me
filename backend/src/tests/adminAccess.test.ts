import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getCollectionAsyncMock,
  findByUserIdsMock,
  listAdminSessionsMock,
} = vi.hoisted(() => ({
  getCollectionAsyncMock: vi.fn(),
  findByUserIdsMock: vi.fn(),
  listAdminSessionsMock: vi.fn(),
}));

vi.mock('../services/cosmosdb.js', () => ({
  getCollection: vi.fn(),
  getCollectionAsync: getCollectionAsyncMock,
}));

vi.mock('../models/adminAccounts.mongo.js', () => ({
  AdminAccountsModelMongo: {
    findByUserIds: findByUserIdsMock,
  },
}));

vi.mock('../services/adminSessions.js', () => ({
  listAdminSessions: listAdminSessionsMock,
}));

vi.mock('../services/email.js', () => ({
  sendAdminPasswordResetEmail: vi.fn(),
}));

vi.mock('../services/redis.js', () => ({
  default: {
    set: vi.fn(),
  },
}));

import { listAdminAccessUsers } from '../services/adminAccess.js';
import { buildAdminResetUrl } from '../services/adminAccess.js';

describe('admin access roster', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCollectionAsyncMock.mockResolvedValue({
      find: () => ({
        sort: () => ({
          limit: () => ({
            toArray: async () => [
              {
                _id: { toString: () => 'admin-1' },
                email: 'admin@sarkariexams.me',
                username: 'admin',
                role: 'admin',
                isActive: true,
                lastLogin: new Date('2026-03-08T10:00:00.000Z'),
                twoFactorEnabled: true,
                twoFactorBackupCodes: [{ codeHash: 'hash-1' }, { codeHash: 'hash-2', usedAt: new Date('2026-03-08T09:00:00.000Z') }],
              },
            ],
          }),
        }),
      }),
    });
  });

  it('returns roster rows even when metadata and session lookups fail', async () => {
    findByUserIdsMock.mockRejectedValue(new Error('admin_accounts unavailable'));
    listAdminSessionsMock.mockRejectedValue(new Error('redis unavailable'));

    const result = await listAdminAccessUsers();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'admin-1',
      email: 'admin@sarkariexams.me',
      role: 'admin',
      isActive: true,
      invitationState: 'accepted',
      activeSessionCount: 0,
      backupCodesAvailable: 1,
      backupCodesTotal: 2,
    });
  });

  it('builds admin reset links with the token in the fragment, not the query string', () => {
    const url = new URL(buildAdminResetUrl('admin@sarkariexams.me', 'reset-token-123'));

    expect(url.pathname).toBe('/admin-vnext/login');
    expect(url.searchParams.get('mode')).toBe('reset-password');
    expect(url.searchParams.get('email')).toBe('admin@sarkariexams.me');
    expect(url.searchParams.get('token')).toBeNull();
    expect(new URLSearchParams(url.hash.slice(1)).get('token')).toBe('reset-token-123');
  });
});
