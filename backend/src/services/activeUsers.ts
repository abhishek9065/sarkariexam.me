import type { Request } from 'express';
import type { UserRole } from '../types.js';

type ActivityRecord = {
    lastSeen: number;
    isAuthenticated: boolean;
    role?: UserRole;
};

const activeUsers = new Map<string, ActivityRecord>();
const MAX_ENTRIES = 50000;

function getClientKey(req: Request): string | null {
    if (req.user?.userId) {
        return `user:${req.user.userId}`;
    }

    const forwarded = req.headers['x-forwarded-for'];
    let ip = req.ip;

    if (typeof forwarded === 'string' && forwarded.trim()) {
        ip = forwarded.split(',')[0].trim();
    } else if (Array.isArray(forwarded) && forwarded.length > 0) {
        ip = forwarded[0];
    }

    if (!ip) {
        return null;
    }

    return `ip:${ip}`;
}

function pruneOld(cutoff: number): void {
    for (const [key, entry] of activeUsers) {
        if (entry.lastSeen < cutoff) {
            activeUsers.delete(key);
        }
    }

    if (activeUsers.size > MAX_ENTRIES) {
        const sorted = [...activeUsers.entries()].sort((a, b) => a[1].lastSeen - b[1].lastSeen);
        const removeCount = Math.ceil(activeUsers.size * 0.1);
        for (let i = 0; i < removeCount; i += 1) {
            activeUsers.delete(sorted[i][0]);
        }
    }
}

export function recordActiveUser(req: Request): void {
    const key = getClientKey(req);
    if (!key) return;

    activeUsers.set(key, {
        lastSeen: Date.now(),
        isAuthenticated: Boolean(req.user?.userId),
        role: req.user?.role,
    });

    if (activeUsers.size > MAX_ENTRIES) {
        pruneOld(Date.now() - 15 * 60 * 1000);
    }
}

export function getActiveUsersStats(windowMinutes: number = 15) {
    const now = Date.now();
    const cutoff = now - windowMinutes * 60 * 1000;
    pruneOld(cutoff);

    let total = 0;
    let authenticated = 0;
    let anonymous = 0;
    let admins = 0;

    for (const entry of activeUsers.values()) {
        if (entry.lastSeen < cutoff) continue;
        total += 1;
        if (entry.isAuthenticated) {
            authenticated += 1;
            if (entry.role === 'admin') {
                admins += 1;
            }
        } else {
            anonymous += 1;
        }
    }

    return {
        windowMinutes,
        since: new Date(cutoff).toISOString(),
        total,
        authenticated,
        anonymous,
        admins,
    };
}
