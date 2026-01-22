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

export async function getAdminAuditLogs(limit: number = 50): Promise<AdminAuditLog[]> {
    const docs = await collection()
        .find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

    return docs.map((doc: any) => ({
        id: doc._id?.toString?.() || doc._id,
        action: doc.action,
        announcementId: doc.announcementId,
        title: doc.title,
        userId: doc.userId,
        note: doc.note,
        metadata: doc.metadata,
        createdAt: doc.createdAt,
    }));
}
