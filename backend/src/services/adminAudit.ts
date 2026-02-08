import crypto from 'crypto';

import { ObjectId } from 'mongodb';

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

interface AdminAuditChainDoc {
    sequence: number;
    prevHash: string;
    hash: string;
    logId?: ObjectId;
    entry: {
        action: string;
        announcementId?: string;
        title?: string;
        userId?: string;
        note?: string;
        metadata?: Record<string, unknown>;
        createdAt: string;
    };
    createdAt: Date;
}

export interface AdminAuditIntegrityResult {
    valid: boolean;
    checked: number;
    headHash: string | null;
    tailHash: string | null;
    brokenAtSequence?: number;
    reason?: string;
}

const collection = () => getCollection<AdminAuditDoc>('admin_audit_logs');
const chainCollection = () => getCollection<AdminAuditChainDoc>('admin_audit_ledger');

const stableStringify = (value: any): string => {
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        const keys = Object.keys(value).sort();
        return `{${keys.map((key) => `"${key}":${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
};

const computeHash = (value: any): string =>
    crypto.createHash('sha256').update(stableStringify(value)).digest('hex');

const toLedgerEntry = (
    entry: {
        action: string;
        announcementId?: string;
        title?: string;
        userId?: string;
        note?: string;
        metadata?: Record<string, unknown>;
    },
    createdAt: Date
): AdminAuditChainDoc['entry'] => ({
    action: entry.action,
    announcementId: entry.announcementId,
    title: entry.title,
    userId: entry.userId,
    note: entry.note,
    metadata: entry.metadata,
    createdAt: createdAt.toISOString(),
});

export async function recordAdminAudit(entry: {
    action: string;
    announcementId?: string;
    title?: string;
    userId?: string;
    note?: string;
    metadata?: Record<string, unknown>;
}): Promise<void> {
    try {
        const createdAt = new Date();
        const insertResult = await collection().insertOne({
            ...entry,
            createdAt,
        } as AdminAuditDoc);

        try {
            const previous = await chainCollection()
                .find({})
                .sort({ sequence: -1 })
                .limit(1)
                .next();

            const sequence = (previous?.sequence ?? 0) + 1;
            const prevHash = previous?.hash ?? 'GENESIS';
            const ledgerEntry = toLedgerEntry(entry, createdAt);
            const hash = computeHash({
                sequence,
                prevHash,
                logId: insertResult.insertedId.toString(),
                entry: ledgerEntry,
            });

            await chainCollection().insertOne({
                sequence,
                prevHash,
                hash,
                logId: insertResult.insertedId,
                entry: ledgerEntry,
                createdAt,
            } as AdminAuditChainDoc);
        } catch (ledgerError) {
            console.error('[AdminAudit] Failed to append immutable ledger entry:', ledgerError);
        }
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

export async function verifyAdminAuditLedger(limit = 5000): Promise<AdminAuditIntegrityResult> {
    try {
        const docs = await chainCollection()
            .find({})
            .sort({ sequence: 1 })
            .limit(Math.max(1, Math.min(limit, 100_000)))
            .toArray();

        if (docs.length === 0) {
            return {
                valid: true,
                checked: 0,
                headHash: null,
                tailHash: null,
            };
        }

        let expectedPrevHash = 'GENESIS';
        let expectedSequence = docs[0].sequence;

        for (const doc of docs) {
            if (doc.sequence !== expectedSequence) {
                return {
                    valid: false,
                    checked: docs.length,
                    headHash: docs[0]?.hash ?? null,
                    tailHash: docs[docs.length - 1]?.hash ?? null,
                    brokenAtSequence: doc.sequence,
                    reason: `sequence_gap_expected_${expectedSequence}_received_${doc.sequence}`,
                };
            }

            if (doc.prevHash !== expectedPrevHash) {
                return {
                    valid: false,
                    checked: docs.length,
                    headHash: docs[0]?.hash ?? null,
                    tailHash: docs[docs.length - 1]?.hash ?? null,
                    brokenAtSequence: doc.sequence,
                    reason: 'prev_hash_mismatch',
                };
            }

            const recalculated = computeHash({
                sequence: doc.sequence,
                prevHash: doc.prevHash,
                logId: doc.logId?.toString() ?? '',
                entry: doc.entry,
            });

            if (recalculated !== doc.hash) {
                return {
                    valid: false,
                    checked: docs.length,
                    headHash: docs[0]?.hash ?? null,
                    tailHash: docs[docs.length - 1]?.hash ?? null,
                    brokenAtSequence: doc.sequence,
                    reason: 'hash_mismatch',
                };
            }

            expectedPrevHash = doc.hash;
            expectedSequence += 1;
        }

        return {
            valid: true,
            checked: docs.length,
            headHash: docs[0]?.hash ?? null,
            tailHash: docs[docs.length - 1]?.hash ?? null,
        };
    } catch (error) {
        console.error('[AdminAudit] Ledger verification failed:', error);
        return {
            valid: false,
            checked: 0,
            headHash: null,
            tailHash: null,
            reason: 'verification_failed',
        };
    }
}
