/**
 * Security Logger Service
 * Logs security events in-memory (no database required)
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
      | 'admin_session_terminated';
    endpoint: string;
    metadata?: any;
}

interface StoredEvent extends SecurityEvent {
    id: number;
    created_at: Date;
}

// In-memory store for security logs
const securityLogs: StoredEvent[] = [];
const MAX_LOGS = 1000;
let eventCounter = 0;

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

    static clearOldLogs(olderThanMs: number = 24 * 60 * 60 * 1000): void {
        const cutoff = new Date(Date.now() - olderThanMs);
        const index = securityLogs.findIndex(log => log.created_at < cutoff);
        if (index > -1) {
            securityLogs.splice(index);
        }
    }
}

// Auto-cleanup old logs every hour
setInterval(() => SecurityLogger.clearOldLogs(), 60 * 60 * 1000);
