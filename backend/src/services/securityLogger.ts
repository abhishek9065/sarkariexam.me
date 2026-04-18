import { config } from '../config.js';
import { sanitizeForLog } from '../utils/logSanitizer.js';
import { prismaApp } from './postgres/prisma.js';

/**
 * Security Logger Service
 * Logs security events in-memory (latest) and persists to PostgreSQL.
 */

export interface SecurityEvent {
    ip_address: string;
    event_type: 'rate_limit'
      | 'auth_failure'
      | 'suspicious_activity';
    endpoint: string;
    metadata?: any;
    incidentStatus?: 'new' | 'investigating' | 'resolved';
    assigneeEmail?: string | null;
    note?: string | null;
}

interface StoredEvent extends SecurityEvent {
    id: string; // Changed to string (CUID) to match Postgres
    created_at: Date;
}

export interface SecurityLogFilters {
    eventType?: string;
    ipAddress?: string;
    endpoint?: string;
    start?: Date;
    end?: Date;
}

// In-memory store for recent security logs
const securityLogs: StoredEvent[] = [];
const MAX_MEMORY_LOGS = 500;
const securityLogRetentionMs = config.securityLogRetentionHours * 60 * 60 * 1000;
const securityLogDbRetentionMs = config.securityLogDbRetentionDays * 24 * 60 * 60 * 1000;

const applyMemoryFilters = (logs: StoredEvent[], filters: SecurityLogFilters): StoredEvent[] => {
    const eventType = filters.eventType?.trim();
    const ipAddress = filters.ipAddress?.trim().toLowerCase();
    const endpoint = filters.endpoint?.trim().toLowerCase();
    const startMs = filters.start?.getTime();
    const endMs = filters.end?.getTime();

    return logs.filter((log) => {
        if (eventType && log.event_type !== eventType) return false;
        if (ipAddress && !String(log.ip_address || '').toLowerCase().includes(ipAddress)) return false;
        if (endpoint && !String(log.endpoint || '').toLowerCase().includes(endpoint)) return false;
        const createdAtMs = log.created_at.getTime();
        if (Number.isFinite(startMs) && createdAtMs < (startMs as number)) return false;
        if (Number.isFinite(endMs) && createdAtMs > (endMs as number)) return false;
        return true;
    });
};

const persistSecurityEvent = async (event: SecurityEvent): Promise<string | null> => {
    if (!config.securityLogPersistenceEnabled) return null;
    try {
        const doc = await prismaApp.securityLog.create({
            data: {
                ipAddress: event.ip_address,
                eventType: event.event_type,
                endpoint: event.endpoint,
                metadata: event.metadata || {},
                incidentStatus: event.incidentStatus ?? 'new',
                assigneeEmail: event.assigneeEmail ?? null,
                note: event.note ?? null,
            },
        });
        return doc.id;
    } catch (error) {
        console.warn('[SecurityLogger] Failed to persist event to Postgres:', error);
        return null;
    }
};

export class SecurityLogger {
    static async log(event: SecurityEvent): Promise<void> {
        try {
            // Persist to DB first to get a real ID
            const dbId = await persistSecurityEvent(event);

            const storedEvent: StoredEvent = {
                ...event,
                id: dbId || `mem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                incidentStatus: event.incidentStatus ?? 'new',
                assigneeEmail: event.assigneeEmail ?? null,
                note: event.note ?? null,
                created_at: new Date()
            };

            securityLogs.unshift(storedEvent);

            // Keep only last MAX_LOGS entries in memory
            if (securityLogs.length > MAX_MEMORY_LOGS) {
                securityLogs.pop();
            }

            // Also console log for visibility
            console.log(
                `[Security] ${sanitizeForLog(event.event_type, 40)}: ${sanitizeForLog(event.ip_address, 64)} -> ${sanitizeForLog(event.endpoint, 200)}`
            );
        } catch (error) {
            console.error('Failed to log security event:', error);
        }
    }

    static getRecentLogs(limit = 50, offset = 0): StoredEvent[] {
        return securityLogs.slice(offset, offset + limit);
    }

    static getTotalLogs(): number {
        return securityLogs.length;
    }

    static async getRecentLogsPaged(limit = 50, offset = 0, filters: SecurityLogFilters = {}): Promise<{
        data: StoredEvent[];
        total: number;
        source: 'database' | 'memory';
    }> {
        const normalizedLimit = Math.max(1, limit);
        const normalizedOffset = Math.max(0, offset);

        if (config.securityLogPersistenceEnabled) {
            try {
                const where: any = {};
                if (filters.eventType) where.eventType = filters.eventType;
                if (filters.ipAddress) where.ipAddress = { contains: filters.ipAddress, mode: 'insensitive' };
                if (filters.endpoint) where.endpoint = { contains: filters.endpoint, mode: 'insensitive' };
                if (filters.start || filters.end) {
                    where.createdAt = {};
                    if (filters.start) where.createdAt.gte = filters.start;
                    if (filters.end) where.createdAt.lte = filters.end;
                }

                const [docs, total] = await Promise.all([
                    prismaApp.securityLog.findMany({
                        where,
                        orderBy: { createdAt: 'desc' },
                        skip: normalizedOffset,
                        take: normalizedLimit,
                    }),
                    prismaApp.securityLog.count({ where }),
                ]);

                return {
                    data: docs.map((doc: any) => ({
                        id: doc.id,
                        ip_address: doc.ipAddress,
                        event_type: doc.eventType,
                        endpoint: doc.endpoint,
                        metadata: doc.metadata,
                        incidentStatus: doc.incidentStatus,
                        assigneeEmail: doc.assigneeEmail,
                        note: doc.note,
                        created_at: doc.createdAt,
                    })),
                    total,
                    source: 'database',
                };
            } catch (error) {
                console.warn('[SecurityLogger] Failed to query Postgres logs, falling back to memory:', error);
            }
        }

        const filtered = applyMemoryFilters(securityLogs, filters);
        return {
            data: filtered.slice(normalizedOffset, normalizedOffset + normalizedLimit),
            total: filtered.length,
            source: 'memory',
        };
    }

    static async updateIncident(
        id: string,
        patch: {
            incidentStatus?: 'new' | 'investigating' | 'resolved';
            assigneeEmail?: string | null;
            note?: string | null;
        }
    ): Promise<StoredEvent | null> {
        const memoryEvent = securityLogs.find((item) => item.id === id);
        if (memoryEvent) {
            if (patch.incidentStatus !== undefined) memoryEvent.incidentStatus = patch.incidentStatus;
            if (patch.assigneeEmail !== undefined) memoryEvent.assigneeEmail = patch.assigneeEmail;
            if (patch.note !== undefined) memoryEvent.note = patch.note;
        }

        if (config.securityLogPersistenceEnabled && !id.startsWith('mem_')) {
            try {
                const updated = await prismaApp.securityLog.update({
                    where: { id },
                    data: {
                        ...(patch.incidentStatus !== undefined ? { incidentStatus: patch.incidentStatus } : {}),
                        ...(patch.assigneeEmail !== undefined ? { assigneeEmail: patch.assigneeEmail } : {}),
                        ...(patch.note !== undefined ? { note: patch.note } : {}),
                    },
                });
                return {
                    id: updated.id,
                    ip_address: updated.ipAddress,
                    event_type: updated.eventType,
                    endpoint: updated.endpoint,
                    metadata: updated.metadata,
                    incidentStatus: updated.incidentStatus,
                    assigneeEmail: updated.assigneeEmail,
                    note: updated.note,
                    created_at: updated.createdAt,
                };
            } catch (error) {
                console.warn('[SecurityLogger] Failed to update Postgres incident state:', error);
            }
        }

        return memoryEvent ?? null;
    }

    static clearOldLogs(olderThanMs: number = securityLogRetentionMs): void {
        const cutoff = new Date(Date.now() - olderThanMs);
        const index = securityLogs.findIndex(log => log.created_at < cutoff);
        if (index > -1) {
            securityLogs.splice(index);
        }
    }

    static async clearOldLogsFromDb(olderThanMs: number = securityLogDbRetentionMs): Promise<void> {
        if (!config.securityLogPersistenceEnabled) return;
        try {
            const cutoff = new Date(Date.now() - olderThanMs);
            await prismaApp.securityLog.deleteMany({
                where: {
                    createdAt: { lt: cutoff },
                },
            });
        } catch (error) {
            console.warn('[SecurityLogger] Failed to cleanup Postgres logs:', error);
        }
    }
}

// Auto-cleanup old logs
const securityLogCleanupTimer = setInterval(() => {
    SecurityLogger.clearOldLogs(securityLogRetentionMs);
    void SecurityLogger.clearOldLogsFromDb(securityLogDbRetentionMs);
}, config.securityLogCleanupIntervalMinutes * 60 * 1000);
securityLogCleanupTimer.unref?.();
