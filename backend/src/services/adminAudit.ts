import { getCollection } from './cosmosdb.js';

export interface AdminAuditLog {
    id: string;
    action: string;
    announcementId?: string;
    title?: string;
    userId?: string;
    note?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

interface AdminAuditDoc {
    action: string;
    announcementId?: string;
    title?: string;
    userId?: string;
    note?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

const collection = () => getCollection<AdminAuditDoc>('admin_audit_logs');

export async function recordAdminAudit(entry: {
    action: string;
    announcementId?: string;
    title?: string;
    userId?: string;
    note?: string;
    metadata?: Record<string, unknown>;
}): Promise<void> {
    try {
        await collection().insertOne({
            ...entry,
            createdAt: new Date(),
        } as AdminAuditDoc);
    } catch (error) {
        console.error('[AdminAudit] Failed to record audit log:', error);
    }
}

type AuditQueryOptions = {
    limit?: number;
    offset?: number;
    userId?: string;
    action?: string;
    start?: Date;
    end?: Date;
};

const buildAuditQuery = (options: AuditQueryOptions) => {
    const query: Record<string, any> = {};

    if (options.userId) {
        query.userId = options.userId;
    }

    if (options.action) {
        query.action = options.action;
    }

    if (options.start || options.end) {
        query.createdAt = {};
        if (options.start) {
            query.createdAt.$gte = options.start;
        }
        if (options.end) {
            query.createdAt.$lte = options.end;
        }
    }

    return query;
};

const mapAuditDocs = (docs: any[]): AdminAuditLog[] => docs.map((doc: any) => ({
    id: doc._id?.toString?.() || doc._id,
    action: doc.action,
    announcementId: doc.announcementId,
    title: doc.title,
    userId: doc.userId,
    note: doc.note,
    metadata: doc.metadata,
    createdAt: doc.createdAt,
}));

export async function getAdminAuditLogsPaged(options: AuditQueryOptions = {}): Promise<{ data: AdminAuditLog[]; total: number }> {
    const query = buildAuditQuery(options);
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    const [docs, total] = await Promise.all([
        collection()
            .find(query)
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .toArray(),
        collection().countDocuments(query),
    ]);

    return {
        data: mapAuditDocs(docs),
        total,
    };
}

export async function getAdminAuditLogs(input: number | AuditQueryOptions = 50): Promise<AdminAuditLog[]> {
    const options = typeof input === 'number' ? { limit: input } : input;
    const result = await getAdminAuditLogsPaged(options);
    return result.data;
}
