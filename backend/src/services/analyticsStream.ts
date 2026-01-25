import type { Server } from 'http';

import jwt, { VerifyOptions } from 'jsonwebtoken';
import { WebSocketServer } from 'ws';

import { config } from '../config.js';
import { AUTH_COOKIE_NAME } from '../middleware/auth.js';
import { getClientIP } from '../middleware/security.js';

import { getAnalyticsOverview } from './analyticsOverview.js';
import { hasPermission } from './rbac.js';
import { SecurityLogger } from './securityLogger.js';

const UPDATE_INTERVAL_MS = 30 * 1000;

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
            const tokenParam = url.searchParams.get('token');
            const cookieToken = getCookieValue(req.headers.cookie, AUTH_COOKIE_NAME);
            const token = tokenParam || cookieToken;
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

            let decoded: any;
            try {
                const verifyOptions: VerifyOptions = {};
                if (config.jwtIssuer) verifyOptions.issuer = config.jwtIssuer;
                if (config.jwtAudience) verifyOptions.audience = config.jwtAudience;
                decoded = jwt.verify(token, config.jwtSecret, verifyOptions) as any;
            } catch {
                socket.close(1008, 'Invalid token');
                return;
            }

            if (!hasPermission(decoded?.role, 'analytics:read')) {
                socket.close(1008, 'Forbidden');
                return;
            }

            const sendUpdate = async () => {
                try {
                    const { data, cached } = await getAnalyticsOverview(days);
                    if (socket.readyState === socket.OPEN) {
                        socket.send(JSON.stringify({ type: 'analytics:update', data, cached }));
                    }
                } catch (error) {
                    console.error('[Analytics WS] Update failed:', error);
                }
            };

            await sendUpdate();
            const interval = setInterval(sendUpdate, UPDATE_INTERVAL_MS);

            socket.on('close', () => clearInterval(interval));
            socket.on('error', () => clearInterval(interval));
        } catch (error) {
            console.error('[Analytics WS] Connection error:', error);
            socket.close(1011, 'Internal error');
        }
    });

    return wss;
}
