import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    findByIdMock,
    isTokenBlacklistedMock,
    validateAdminSessionMock,
    touchAdminSessionMock,
    hasEffectivePermissionMock,
} = vi.hoisted(() => ({
    findByIdMock: vi.fn(),
    isTokenBlacklistedMock: vi.fn(),
    validateAdminSessionMock: vi.fn(),
    touchAdminSessionMock: vi.fn(),
    hasEffectivePermissionMock: vi.fn(),
}));

vi.mock('../config.js', () => ({
    config: {
        jwtSecret: 'test-secret',
        jwtIssuer: '',
        jwtAudience: '',
        adminRequire2FA: true,
    },
}));

vi.mock('../middleware/auth.js', () => ({
    AUTH_COOKIE_NAME: 'auth_token',
    ADMIN_AUTH_COOKIE_NAME: 'admin_auth_token',
    isTokenBlacklisted: isTokenBlacklistedMock,
}));

vi.mock('../models/users.mongo.js', () => ({
    UserModelMongo: {
        findById: findByIdMock,
    },
}));

vi.mock('../services/adminSessions.js', () => ({
    validateAdminSession: validateAdminSessionMock,
    touchAdminSession: touchAdminSessionMock,
}));

vi.mock('../services/rbac.js', () => ({
    hasEffectivePermission: hasEffectivePermissionMock,
}));

import { authorizeAnalyticsSocket } from '../services/analyticsStream.js';

describe('authorizeAnalyticsSocket', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isTokenBlacklistedMock.mockResolvedValue(false);
        findByIdMock.mockResolvedValue({
            id: 'user-1',
            email: 'viewer@example.com',
            role: 'viewer',
            isActive: true,
        });
        validateAdminSessionMock.mockResolvedValue({ valid: true });
        touchAdminSessionMock.mockResolvedValue({ id: 'session-1' });
        hasEffectivePermissionMock.mockResolvedValue(true);
    });

    const issueToken = (overrides: Record<string, unknown> = {}) => jwt.sign({
        userId: 'user-1',
        email: 'viewer@example.com',
        role: 'viewer',
        sessionId: 'session-1',
        twoFactorVerified: true,
        ...overrides,
    }, 'test-secret', { expiresIn: '1h' });

    it('rejects revoked tokens before opening the socket', async () => {
        isTokenBlacklistedMock.mockResolvedValue(true);

        const result = await authorizeAnalyticsSocket(
            issueToken(),
            { headers: {} } as any,
            '127.0.0.1'
        );

        expect(result).toEqual({ ok: false, reason: 'Token has been revoked' });
        expect(findByIdMock).not.toHaveBeenCalled();
    });

    it('rejects deactivated accounts even with a valid JWT', async () => {
        findByIdMock.mockResolvedValue({ isActive: false, role: 'viewer' });

        const result = await authorizeAnalyticsSocket(
            issueToken(),
            { headers: {} } as any,
            '127.0.0.1'
        );

        expect(result).toEqual({ ok: false, reason: 'User account deactivated' });
    });

    it('enforces current admin sessions for admin portal roles', async () => {
        validateAdminSessionMock.mockResolvedValue({ valid: false, reason: 'session_not_found' });

        const result = await authorizeAnalyticsSocket(
            issueToken(),
            { headers: { 'user-agent': 'Vitest' } } as any,
            '127.0.0.1'
        );

        expect(result).toEqual({ ok: false, reason: 'Admin session expired' });
        expect(touchAdminSessionMock).not.toHaveBeenCalled();
    });

    it('requires 2FA for any admin portal role when policy is enabled', async () => {
        const result = await authorizeAnalyticsSocket(
            issueToken({ twoFactorVerified: false }),
            { headers: { 'user-agent': 'Vitest' } } as any,
            '127.0.0.1'
        );

        expect(result).toEqual({ ok: false, reason: 'Two-factor authentication required' });
    });

    it('uses the latest database role and touches the session on success', async () => {
        findByIdMock.mockResolvedValue({
            id: 'user-1',
            email: 'editor@example.com',
            role: 'editor',
            isActive: true,
        });

        const result = await authorizeAnalyticsSocket(
            issueToken(),
            { headers: { 'user-agent': 'Vitest Browser' } } as any,
            '203.0.113.42'
        );

        expect(result.ok).toBe(true);
        expect(result.ok && result.user.role).toBe('editor');
        expect(validateAdminSessionMock).toHaveBeenCalledWith('session-1');
        expect(touchAdminSessionMock).toHaveBeenCalledWith(
            'session-1',
            expect.objectContaining({
                ip: '203.0.113.42',
                userAgent: 'Vitest Browser',
            }),
            '/ws/analytics'
        );
        expect(hasEffectivePermissionMock).toHaveBeenCalledWith('editor', 'analytics:read');
    });
});
