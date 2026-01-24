import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import { config } from '../config.js';
import { getAnalyticsOverview } from './analyticsOverview.js';
import { hasPermission } from './rbac.js';

const UPDATE_INTERVAL_MS = 30 * 1000;

export function startAnalyticsWebSocket(server: Server) {
    const wss = new WebSocketServer({ server, path: '/ws/analytics' });

    wss.on('connection', async (socket, req) => {
        try {
            const url = new URL(req.url || '', 'http://localhost');
            const token = url.searchParams.get('token');
            const daysParam = parseInt(url.searchParams.get('days') || '', 10);
            const days = Number.isFinite(daysParam) ? Math.min(90, Math.max(1, daysParam)) : 30;
            if (!token) {
                socket.close(1008, 'Token required');
                return;
            }

            let decoded: any;
            try {
                decoded = jwt.verify(token, config.jwtSecret) as any;
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
