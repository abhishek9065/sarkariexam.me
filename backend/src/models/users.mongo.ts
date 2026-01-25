import bcrypt from 'bcryptjs';
import { ObjectId, WithId, Document } from 'mongodb';

import { getCollection } from '../services/cosmosdb.js';

/**
 * User document interface for MongoDB
 */
interface UserDoc extends Document {
    _id: ObjectId;
    email: string;
    username: string;
    passwordHash: string;
    role: 'admin' | 'editor' | 'reviewer' | 'viewer' | 'user';
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLogin?: Date;
}

export interface User {
    id: string;
    email: string;
    username: string;
    role: 'admin' | 'editor' | 'reviewer' | 'viewer' | 'user';
    isActive: boolean;
    createdAt: string;
    lastLogin?: string;
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
     * Create new user
     */
    static async create(data: {
        email: string;
        username: string;
        password: string;
        role?: 'admin' | 'editor' | 'reviewer' | 'viewer' | 'user';
    }): Promise<User> {
        try {
            const passwordHash = await bcrypt.hash(data.password, 10);
            const now = new Date();

            const doc: Omit<UserDoc, '_id'> = {
                email: data.email.toLowerCase(),
                username: data.username,
                passwordHash,
                role: data.role || 'user',
                isActive: true,
                createdAt: now,
                updatedAt: now,
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

            if (!doc) return null;

            const isValid = await bcrypt.compare(password, doc.passwordHash);
            if (!isValid) return null;

            // Update last login
            await this.collection.updateOne(
                { _id: doc._id },
                { $set: { lastLogin: new Date() } }
            );

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
        role: 'admin' | 'editor' | 'reviewer' | 'viewer' | 'user';
        isActive: boolean;
    }>): Promise<User | null> {
        if (!ObjectId.isValid(id)) return null;

        try {
            const updateData: Partial<UserDoc> = { updatedAt: new Date() };

            if (data.username) updateData.username = data.username;
            if (data.email) updateData.email = data.email.toLowerCase();
            if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 10);
            if (data.role) updateData.role = data.role;
            if (data.isActive !== undefined) updateData.isActive = data.isActive;

            await this.collection.updateOne(
                { _id: new ObjectId(id) },
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
     * Get all users (admin only)
     */
    static async findAll(skip: number = 0, limit: number = 20): Promise<User[]> {
        try {
            const docs = await this.collection
                .find({})
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
        };
    }
}

export default UserModelMongo;
