import bcrypt from 'bcryptjs';
import { ObjectId, WithId, Document } from 'mongodb';

import { getCollection, getCollectionAsync } from '../services/cosmosdb.js';

/**
 * User document interface for MongoDB
 */
interface UserDoc extends Document {
    _id: ObjectId;
    email: string;
    username: string;
    passwordHash: string;
    passwordHistory?: Array<{ hash: string; changedAt: Date }>;
    role: 'admin' | 'editor' | 'reviewer' | 'viewer' | 'contributor' | 'user';
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLogin?: Date;
    twoFactorEnabled?: boolean;
    twoFactorSecret?: string | null;
    twoFactorTempSecret?: string | null;
    twoFactorVerifiedAt?: Date | null;
    twoFactorBackupCodes?: Array<{ codeHash: string; usedAt?: Date | null }>;
    twoFactorBackupCodesUpdatedAt?: Date | null;
}

export interface User {
    id: string;
    email: string;
    username: string;
    role: 'admin' | 'editor' | 'reviewer' | 'viewer' | 'contributor' | 'user';
    isActive: boolean;
    createdAt: string;
    lastLogin?: string;
    twoFactorEnabled?: boolean;
}

export interface UserAuth extends User {
    twoFactorSecret?: string;
    twoFactorTempSecret?: string;
    twoFactorVerifiedAt?: string;
    twoFactorBackupCodes?: Array<{ codeHash: string; usedAt?: string | null }>;
    twoFactorBackupCodesUpdatedAt?: string | null;
}

/**
 * MongoDB-based User Model
 */
export class UserModelMongo {
    private static get collection() {
        return getCollection<UserDoc>('users');
    }

    /**
     * Find user by email
     */
    static async findByEmail(email: string): Promise<User | null> {
        try {
            const doc = await this.collection.findOne({ email: email.toLowerCase() });
            return doc ? this.docToUser(doc) : null;
        } catch (error) {
            console.error('[MongoDB] findByEmail error:', error);
            return null;
        }
    }

    /**
     * Find user by ID
     */
    static async findById(id: string): Promise<User | null> {
        try {
            if (!ObjectId.isValid(id)) return null;
            const doc = await this.collection.findOne({ _id: new ObjectId(id) });
            return doc ? this.docToUser(doc) : null;
        } catch (error) {
            console.error('[MongoDB] findById error:', error);
            return null;
        }
    }

    /**
     * Find user by ID with 2FA secrets (auth-only).
     */
    static async findByIdWithSecrets(id: string): Promise<UserAuth | null> {
        try {
            if (!ObjectId.isValid(id)) return null;
            const doc = await this.collection.findOne({ _id: new ObjectId(id) });
            return doc ? this.docToUserAuth(doc) : null;
        } catch (error) {
            console.error('[MongoDB] findByIdWithSecrets error:', error);
            return null;
        }
    }

    /**
     * Create new user
     */
    static async create(data: {
        email: string;
        username: string;
        password: string;
        role?: 'admin' | 'editor' | 'reviewer' | 'viewer' | 'contributor' | 'user';
    }): Promise<User> {
        try {
            const passwordHash = await bcrypt.hash(data.password, 10);
            const now = new Date();

            const doc: Omit<UserDoc, '_id'> = {
                email: data.email.toLowerCase(),
                username: data.username,
                passwordHash,
                passwordHistory: [],
                role: data.role || 'user',
                isActive: true,
                createdAt: now,
                updatedAt: now,
                twoFactorEnabled: false,
            };

            const result = await this.collection.insertOne(doc as UserDoc);
            const newUser = await this.findById(result.insertedId.toString());
            if (!newUser) throw new Error('Failed to retrieve created user');
            return newUser;
        } catch (error) {
            console.error('[MongoDB] create user error:', error);
            throw error;
        }
    }

    /**
     * Verify password and get user
     */
    static async verifyPassword(email: string, password: string): Promise<User | null> {
        try {
            const doc = await this.collection.findOne({
                email: email.toLowerCase(),
                isActive: true
            });

            if (!doc) {
                console.warn(`[Auth] User not found or inactive: ${email}`);
                return null;
            }

            const isValid = await bcrypt.compare(password, doc.passwordHash);
            if (!isValid) {
                console.warn(`[Auth] Invalid password attempt for: ${email}`);
                return null;
            }

            // Update last login with error handling
            try {
                await this.collection.updateOne(
                    { _id: doc._id },
                    { $set: { lastLogin: new Date() } }
                );
            } catch (updateError) {
                console.error('[Auth] Failed to update last login:', updateError);
                // Continue with login even if lastLogin update fails
            }

            return this.docToUser(doc);
        } catch (error) {
            console.error('[MongoDB] verifyPassword error:', error);
            return null;
        }
    }

    /**
     * Update user
     */
    static async update(id: string, data: Partial<{
        username: string;
        email: string;
        password: string;
        role: 'admin' | 'editor' | 'reviewer' | 'viewer' | 'contributor' | 'user';
        isActive: boolean;
        twoFactorEnabled: boolean;
        twoFactorSecret: string | null;
        twoFactorTempSecret: string | null;
        twoFactorVerifiedAt: Date | null;
        twoFactorBackupCodes: Array<{ codeHash: string; usedAt?: Date | null }>;
        twoFactorBackupCodesUpdatedAt: Date | null;
    }>): Promise<User | null> {
        if (!ObjectId.isValid(id)) return null;

        try {
            const updateData: Partial<UserDoc> = { updatedAt: new Date() };
            const objectId = new ObjectId(id);
            let existingDoc: WithId<UserDoc> | null = null;
            if (data.password) {
                existingDoc = await this.collection.findOne({ _id: objectId });
                if (!existingDoc) return null;
            }

            if (data.username) updateData.username = data.username;
            if (data.email) updateData.email = data.email.toLowerCase();
            if (data.password) {
                const nextHash = await bcrypt.hash(data.password, 10);
                const existingHistory = existingDoc?.passwordHistory ?? [];
                const nextHistory = [
                    { hash: existingDoc?.passwordHash as string, changedAt: new Date() },
                    ...existingHistory,
                ].slice(0, 10);
                updateData.passwordHash = nextHash;
                updateData.passwordHistory = nextHistory;
            }
            if (data.role) updateData.role = data.role;
            if (data.isActive !== undefined) updateData.isActive = data.isActive;
            if (data.twoFactorEnabled !== undefined) updateData.twoFactorEnabled = data.twoFactorEnabled;
            if (data.twoFactorSecret !== undefined) updateData.twoFactorSecret = data.twoFactorSecret ?? null;
            if (data.twoFactorTempSecret !== undefined) updateData.twoFactorTempSecret = data.twoFactorTempSecret ?? null;
            if (data.twoFactorVerifiedAt !== undefined) updateData.twoFactorVerifiedAt = data.twoFactorVerifiedAt ?? null;
            if (data.twoFactorBackupCodes !== undefined) updateData.twoFactorBackupCodes = data.twoFactorBackupCodes;
            if (data.twoFactorBackupCodesUpdatedAt !== undefined) {
                updateData.twoFactorBackupCodesUpdatedAt = data.twoFactorBackupCodesUpdatedAt ?? null;
            }

            await this.collection.updateOne(
                { _id: objectId },
                { $set: updateData }
            );

            return this.findById(id);
        } catch (error) {
            console.error('[MongoDB] update user error:', error);
            return null;
        }
    }

    /**
     * Delete user
     */
    static async delete(id: string): Promise<boolean> {
        if (!ObjectId.isValid(id)) return false;
        try {
            const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
            return result.deletedCount > 0;
        } catch (error) {
            console.error('[MongoDB] delete user error:', error);
            return false;
        }
    }

    /**
     * Get all users (admin only) with optional filtering
     */
    static async findAll(filters?: {
        role?: 'admin' | 'editor' | 'reviewer' | 'viewer' | 'contributor' | 'user';
        isActive?: boolean;
        skip?: number;
        limit?: number;
    }): Promise<User[]> {
        try {
            const { role, isActive, skip = 0, limit = 20 } = filters || {};
            const query: any = {};

            if (role) query.role = role;
            if (isActive !== undefined) query.isActive = isActive;

            const docs = await this.collection
                .find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray();
            return docs.map(this.docToUser);
        } catch (error) {
            console.error('[MongoDB] findAll users error:', error);
            return [];
        }
    }

    /**
     * Convert document to User type
     */
    private static docToUser(doc: WithId<UserDoc>): User {
        return {
            id: doc._id.toString(),
            email: doc.email,
            username: doc.username,
            role: doc.role,
            isActive: doc.isActive,
            createdAt: doc.createdAt?.toISOString(),
            lastLogin: doc.lastLogin?.toISOString(),
            twoFactorEnabled: doc.twoFactorEnabled ?? false,
        };
    }

    static async verifyPasswordById(id: string, password: string): Promise<boolean> {
        if (!ObjectId.isValid(id)) return false;
        try {
            const doc = await this.collection.findOne({ _id: new ObjectId(id), isActive: true });
            if (!doc) return false;
            return bcrypt.compare(password, doc.passwordHash);
        } catch (error) {
            console.error('[MongoDB] verifyPasswordById error:', error);
            return false;
        }
    }

    static async isPasswordReused(id: string, password: string, historyDepth = 5): Promise<boolean> {
        if (!ObjectId.isValid(id)) return false;
        try {
            const doc = await this.collection.findOne({ _id: new ObjectId(id) });
            if (!doc) return false;

            const matchesCurrent = await bcrypt.compare(password, doc.passwordHash);
            if (matchesCurrent) return true;

            const history = (doc.passwordHistory ?? []).slice(0, Math.max(1, historyDepth));
            for (const entry of history) {
                const reused = await bcrypt.compare(password, entry.hash);
                if (reused) return true;
            }
            return false;
        } catch (error) {
            console.error('[MongoDB] isPasswordReused error:', error);
            return false;
        }
    }

    static async hasAdminPortalUser(): Promise<boolean> {
        try {
            const collection = await getCollectionAsync<UserDoc>('users');
            const doc = await collection.findOne(
                { role: { $in: ['admin', 'editor', 'reviewer', 'viewer', 'contributor'] } },
                { projection: { _id: 1 } }
            );
            return Boolean(doc);
        } catch (error) {
            console.error('[MongoDB] hasAdminPortalUser error:', error);
            throw error;
        }
    }

    private static docToUserAuth(doc: WithId<UserDoc>): UserAuth {
        return {
            id: doc._id.toString(),
            email: doc.email,
            username: doc.username,
            role: doc.role,
            isActive: doc.isActive,
            createdAt: doc.createdAt?.toISOString(),
            lastLogin: doc.lastLogin?.toISOString(),
            twoFactorEnabled: doc.twoFactorEnabled ?? false,
            twoFactorSecret: doc.twoFactorSecret,
            twoFactorTempSecret: doc.twoFactorTempSecret,
            twoFactorVerifiedAt: doc.twoFactorVerifiedAt?.toISOString(),
            twoFactorBackupCodes: doc.twoFactorBackupCodes?.map((item) => ({
                codeHash: item.codeHash,
                usedAt: item.usedAt ? item.usedAt.toISOString() : null,
            })),
            twoFactorBackupCodesUpdatedAt: doc.twoFactorBackupCodesUpdatedAt?.toISOString() ?? null,
        };
    }
}

export default UserModelMongo;
