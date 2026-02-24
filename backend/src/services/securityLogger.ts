import { ObjectId } from 'mongodb';

import { config } from '../config.js';

import { getCollectionAsync } from './cosmosdb.js';

/**
 * Security Logger Service
 * Logs security events in-memory and optionally persists to MongoDB.
 */

export interface SecurityEvent {
    ip_address: string;
    event_type: 'rate_limit'
      | 'auth_failure'
      | 'suspicious_activity'
      | 'admin_setup_failure'
      | 'admin_setup_success'
      | 'admin_setup_error'
      | 'admin_login_failure'
      | 'admin_login_success'
      | 'admin_backup_code_generated'
      | 'admin_backup_code_used'
      | 'admin_session_terminated'
      | 'admin_step_up_success'
      | 'admin_step_up_failed'
      | 'admin_approval_requested'
      | 'admin_break_glass_used'
      | 'admin_approval_approved'
      | 'admin_approval_rejected'
      | 'admin_approval_executed'
      | 'admin_security_alert'
      | 'admin_login_new_device'
      | 'admin_password_reset_requested'
      | 'admin_password_reset_failed'
      | 'admin_password_reset_completed';
    endpoint: string;
    metadata?: any;
}

interface StoredEvent extends SecurityEvent {
    id: number;
    created_at: Date;
}

interface SecurityLogDoc extends SecurityEvent {
    id: number;
    created_at: Date;
}

export interface SecurityLogFilters {
    eventType?: string;
    ipAddress?: string;
    endpoint?: string;
    start?: Date;
    end?: Date;
}

// In-memory store for security logs
const securityLogs: StoredEvent[] = [];
const MAX_LOGS = 1000;
let eventCounter = 0;
const securityLogRetentionMs = config.securityLogRetentionHours * 60 * 60 * 1000;
const securityLogDbRetentionMs = config.securityLogDbRetentionDays * 24 * 60 * 60 * 1000;

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toCaseInsensitiveRegex = (value: string) => ({ $regex: escapeRegex(value), $options: 'i' });

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

const buildDbQuery = (filters: SecurityLogFilters): Record<string, any> => {
    const query: Record<string, any> = {};
    const eventType = filters.eventType?.trim();
    const ipAddress = filters.ipAddress?.trim();
    const endpoint = filters.endpoint?.trim();

    if (eventType) {
        query.event_type = eventType;
    }
    if (ipAddress) {
        query.ip_address = toCaseInsensitiveRegex(ipAddress);
    }
    if (endpoint) {
        query.endpoint = toCaseInsensitiveRegex(endpoint);
    }
    if (filters.start || filters.end) {
        query.created_at = {};
        if (filters.start) query.created_at.$gte = filters.start;
        if (filters.end) query.created_at.$lte = filters.end;
    }

    return query;
};

const mapDocToStoredEvent = (doc: SecurityLogDoc & { _id?: ObjectId }): StoredEvent => ({
    id: Number(doc.id ?? 0),
    ip_address: doc.ip_address,
    event_type: doc.event_type,
    endpoint: doc.endpoint,
    metadata: doc.metadata,
    created_at: new Date(doc.created_at),
});

const persistSecurityEvent = async (event: StoredEvent): Promise<void> => {
    if (!config.securityLogPersistenceEnabled) return;
    try {
        const collection = await getCollectionAsync<SecurityLogDoc>('security_logs');
        await collection.insertOne({
            id: event.id,
            ip_address: event.ip_address,
            event_type: event.event_type,
            endpoint: event.endpoint,
            metadata: event.metadata,
            created_at: event.created_at,
        } as SecurityLogDoc);
    } catch (error) {
        console.warn('[SecurityLogger] Failed to persist event:', error);
    }
};

export class SecurityLogger {
    static log(event: SecurityEvent): void {
        try {
            const storedEvent: StoredEvent = {
                ...event,
                id: ++eventCounter,
                created_at: new Date()
            };

            securityLogs.unshift(storedEvent);

            // Keep only last MAX_LOGS entries
            if (securityLogs.length > MAX_LOGS) {
                securityLogs.pop();
            }

            void persistSecurityEvent(storedEvent);

            // Also console log for visibility
            console.log(`[Security] ${event.event_type}: ${event.ip_address} -> ${event.endpoint}`);
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
                const collection = await getCollectionAsync<SecurityLogDoc>('security_logs');
                const query = buildDbQuery(filters);
                const [docs, total] = await Promise.all([
                    collection
                        .find(query)
                        .sort({ created_at: -1 })
                        .skip(normalizedOffset)
                        .limit(normalizedLimit)
                        .toArray(),
                    collection.countDocuments(query),
                ]);
                return {
                    data: docs.map((doc) => mapDocToStoredEvent(doc as SecurityLogDoc)),
                    total,
                    source: 'database',
                };
            } catch (error) {
                console.warn('[SecurityLogger] Failed to query persisted logs, falling back to memory:', error);
            }
        }

        const filtered = applyMemoryFilters(securityLogs, filters);
        return {
            data: filtered.slice(normalizedOffset, normalizedOffset + normalizedLimit),
            total: filtered.length,
            source: 'memory',
        };
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
            const collection = await getCollectionAsync<SecurityLogDoc>('security_logs');
            const cutoff = new Date(Date.now() - olderThanMs);
            await collection.deleteMany({
                created_at: { $lt: cutoff },
            });
        } catch (error) {
            console.warn('[SecurityLogger] Failed to cleanup persisted logs:', error);
        }
    }
}

// Auto-cleanup old logs
const securityLogCleanupTimer = setInterval(() => {
    SecurityLogger.clearOldLogs(securityLogRetentionMs);
    void SecurityLogger.clearOldLogsFromDb(securityLogDbRetentionMs);
}, config.securityLogCleanupIntervalMinutes * 60 * 1000);
securityLogCleanupTimer.unref?.();
