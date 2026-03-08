import type { IncomingMessage, Server } from 'http';

import jwt, { VerifyOptions } from 'jsonwebtoken';
import { WebSocketServer } from 'ws';

import { config } from '../config.js';
import { ADMIN_AUTH_COOKIE_NAME, AUTH_COOKIE_NAME, isTokenBlacklisted } from '../middleware/auth.js';
import { getClientIP } from '../middleware/security.js';
import { UserModelMongo } from '../models/users.mongo.js';
import type { JwtPayload } from '../types.js';

import { isAdminPortalRole } from './adminPermissions.js';
import { touchAdminSession, validateAdminSession } from './adminSessions.js';
import { getAnalyticsOverview } from './analyticsOverview.js';
import { hasEffectivePermission } from './rbac.js';
import { SecurityLogger } from './securityLogger.js';

const UPDATE_INTERVAL_MS = 30 * 1000;

type AnalyticsSocketAuthResult =
    | { ok: true; user: JwtPayload }
    | { ok: false; reason: string };

export async function authorizeAnalyticsSocket(
    token: string,
    req: IncomingMessage,
    clientIp: string
): Promise<AnalyticsSocketAuthResult> {
    if (await isTokenBlacklisted(token)) {
        return { ok: false, reason: 'Token has been revoked' };
    }

    let decoded: JwtPayload & { exp?: number };
    try {
        const verifyOptions: VerifyOptions = {};
        if (config.jwtIssuer) verifyOptions.issuer = config.jwtIssuer;
        if (config.jwtAudience) verifyOptions.audience = config.jwtAudience;
        decoded = jwt.verify(token, config.jwtSecret, verifyOptions) as JwtPayload & { exp?: number };
    } catch {
        return { ok: false, reason: 'Invalid token' };
    }

    if (decoded.twoFactorSetup) {
        return { ok: false, reason: 'Invalid token' };
    }

    if (decoded.userId) {
        const user = await UserModelMongo.findById(decoded.userId);
        if (!user || !user.isActive) {
            return { ok: false, reason: 'User account deactivated' };
        }
        decoded.role = user.role;
    }

    if (isAdminPortalRole(decoded.role) && decoded.sessionId) {
        const sessionValidation = await validateAdminSession(decoded.sessionId);
        if (!sessionValidation.valid) {
            return { ok: false, reason: 'Admin session expired' };
        }

        const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : null;
        const session = await touchAdminSession(
            decoded.sessionId,
            {
                userId: decoded.userId,
                email: decoded.email,
                ip: clientIp,
                userAgent: req.headers['user-agent']?.toString() || 'Unknown',
                expiresAt,
            },
            '/ws/analytics'
        );

        if (!session) {
            return { ok: false, reason: 'Admin session expired' };
        }
    }

    if (isAdminPortalRole(decoded.role) && config.adminRequire2FA && !decoded.twoFactorVerified) {
        return { ok: false, reason: 'Two-factor authentication required' };
    }

    if (!await hasEffectivePermission(decoded.role, 'analytics:read')) {
        return { ok: false, reason: 'Forbidden' };
    }

    return { ok: true, user: decoded };
}

export function startAnalyticsWebSocket(server: Server) {
    const wss = new WebSocketServer({ server, path: '/ws/analytics' });

    const getCookieValue = (cookieHeader: string | undefined, name: string): string | null => {
        if (!cookieHeader) return null;
        const parts = cookieHeader.split(';');
        for (const part of parts) {
            const [key, ...rest] = part.trim().split('=');
            if (key === name) {
                return decodeURIComponent(rest.join('='));
            }
        }
        return null;
    };

    wss.on('connection', async (socket, req) => {
        try {
            const url = new URL(req.url || '', 'http://localhost');
            const adminCookie = getCookieValue(req.headers.cookie, ADMIN_AUTH_COOKIE_NAME);
            const userCookie = getCookieValue(req.headers.cookie, AUTH_COOKIE_NAME);
            const token = adminCookie || userCookie;
            const daysParam = parseInt(url.searchParams.get('days') || '', 10);
            const days = Number.isFinite(daysParam) ? Math.min(90, Math.max(1, daysParam)) : 30;
            if (!token) {
                socket.close(1008, 'Token required');
                return;
            }

            const clientIp = getClientIP(req as any);
            if (config.adminEnforceHttps) {
                const forwardedProto = req.headers['x-forwarded-proto'];
                const isSecure = (req as any).secure || forwardedProto === 'https';
                if (!isSecure) {
                    SecurityLogger.log({
                        ip_address: clientIp,
                        event_type: 'suspicious_activity',
                        endpoint: '/ws/analytics',
                        metadata: { reason: 'admin_https_required' },
                    });
                    socket.close(1008, 'HTTPS required');
                    return;
                }
            }

            if (config.adminIpAllowlist.length > 0 && !config.adminIpAllowlist.includes(clientIp)) {
                SecurityLogger.log({
                    ip_address: clientIp,
                    event_type: 'suspicious_activity',
                    endpoint: '/ws/analytics',
                    metadata: { reason: 'admin_ip_block' },
                });
                socket.close(1008, 'Admin access restricted');
                return;
            }

            const authResult = await authorizeAnalyticsSocket(token, req, clientIp);
            if ('reason' in authResult) {
                socket.close(1008, authResult.reason);
                return;
            }

            let interval: ReturnType<typeof setInterval> | null = null;

            const sendUpdate = async (): Promise<boolean> => {
                try {
                    const refreshAuth = await authorizeAnalyticsSocket(token, req, clientIp);
                    if ('reason' in refreshAuth) {
                        if (interval) clearInterval(interval);
                        if (socket.readyState === socket.OPEN) {
                            socket.close(1008, refreshAuth.reason);
                        }
                        return false;
                    }

                    const { data, cached } = await getAnalyticsOverview(days);
                    if (socket.readyState === socket.OPEN) {
                        socket.send(JSON.stringify({ type: 'analytics:update', data, cached }));
                    }
                    return true;
                } catch (error) {
                    console.error('[Analytics WS] Update failed:', error);
                    return false;
                }
            };

            const keepOpen = await sendUpdate();
            if (!keepOpen) {
                return;
            }

            interval = setInterval(() => {
                void sendUpdate();
            }, UPDATE_INTERVAL_MS);

            socket.on('close', () => {
                if (interval) clearInterval(interval);
            });
            socket.on('error', () => {
                if (interval) clearInterval(interval);
            });
        } catch (error) {
            console.error('[Analytics WS] Connection error:', error);
            socket.close(1011, 'Internal error');
        }
    });

    return wss;
}
