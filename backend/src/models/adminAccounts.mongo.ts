import type { Document, ObjectId, WithId } from 'mongodb';

import { getCollection } from '../services/cosmosdb.js';

export type AdminAccountRole = 'admin' | 'editor' | 'reviewer' | 'viewer' | 'contributor';
export type AdminAccountStatus = 'active' | 'suspended';

interface AdminAccountDoc extends Document {
    _id: ObjectId;
    userId: string;
    email: string;
    role: AdminAccountRole;
    status: AdminAccountStatus;
    twoFactorEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date | null;
    metadata?: Record<string, unknown>;
}

export interface AdminAccount {
    id: string;
    userId: string;
    email: string;
    role: AdminAccountRole;
    status: AdminAccountStatus;
    twoFactorEnabled: boolean;
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string | null;
    metadata?: Record<string, unknown>;
}

const ADMIN_ROLES: AdminAccountRole[] = ['admin', 'editor', 'reviewer', 'viewer', 'contributor'];

export class AdminAccountsModelMongo {
    private static get collection() {
        return getCollection<AdminAccountDoc>('admin_accounts');
    }

    static async list(limit = 100): Promise<AdminAccount[]> {
        const docs = await this.collection.find({}).sort({ updatedAt: -1 }).limit(limit).toArray();
        return docs.map(this.docToAdminAccount);
    }

    static async upsertFromUser(user: {
        id: string;
        email: string;
        role: string;
        twoFactorEnabled?: boolean;
        isActive?: boolean;
        createdAt?: string;
        lastLogin?: string;
    }): Promise<void> {
        if (!ADMIN_ROLES.includes(user.role as AdminAccountRole)) return;

        const now = new Date();
        await this.collection.updateOne(
            { userId: user.id },
            {
                $set: {
                    email: user.email.toLowerCase(),
                    role: user.role as AdminAccountRole,
                    status: user.isActive === false ? 'suspended' : 'active',
                    twoFactorEnabled: Boolean(user.twoFactorEnabled),
                    updatedAt: now,
                    lastLoginAt: user.lastLogin ? new Date(user.lastLogin) : null,
                },
                $setOnInsert: {
                    userId: user.id,
                    createdAt: user.createdAt ? new Date(user.createdAt) : now,
                    metadata: {
                        source: 'users-backfill',
                    },
                },
            },
            { upsert: true }
        );
    }

    static async ensureIndexes(): Promise<void> {
        await this.collection.createIndex({ userId: 1 }, { unique: true });
        await this.collection.createIndex({ email: 1 }, { unique: true });
        await this.collection.createIndex({ role: 1, status: 1 });
        await this.collection.createIndex({ status: 1, updatedAt: -1 });
    }

    private static docToAdminAccount(doc: WithId<AdminAccountDoc>): AdminAccount {
        return {
            id: doc._id.toString(),
            userId: doc.userId,
            email: doc.email,
            role: doc.role,
            status: doc.status,
            twoFactorEnabled: doc.twoFactorEnabled,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
            lastLoginAt: doc.lastLoginAt ? doc.lastLoginAt.toISOString() : null,
            metadata: doc.metadata,
        };
    }
}
