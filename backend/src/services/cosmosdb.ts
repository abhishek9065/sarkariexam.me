import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

/**
 * Azure Cosmos DB Service (MongoDB API)
 * Handles connection and provides database/collection access
 */

let client: MongoClient | null = null;
let db: Db | null = null;

const getConnectionString = (): string | undefined =>
    process.env.COSMOS_CONNECTION_STRING || process.env.MONGODB_URI;

const getDatabaseName = (): string =>
    process.env.COSMOS_DATABASE_NAME || 'sarkari_db';

/**
 * Initialize MongoDB/Cosmos DB connection
 */
export async function connectToDatabase(): Promise<Db> {
    if (db) return db;

    const connectionString = getConnectionString();
    if (!connectionString) {
        throw new Error('COSMOS_CONNECTION_STRING or MONGODB_URI is not configured');
    }

    try {
        console.log('[CosmosDB] Connecting to database...');

        client = new MongoClient(connectionString, {
            // Cosmos DB specific settings
            retryWrites: false, // Cosmos DB doesn't support retryWrites
            maxPoolSize: 10,
            minPoolSize: 1,
            connectTimeoutMS: 30000,
            socketTimeoutMS: 360000,
        });

        await client.connect();
        const databaseName = getDatabaseName();
        db = client.db(databaseName);

        console.log('[CosmosDB] Connected successfully to:', databaseName);

        // Create indexes
        await createIndexes();

        return db;
    } catch (error) {
        console.error('[CosmosDB] Connection failed:', error);
        throw error;
    }
}

/**
 * Get database instance
 */
export function getDatabase(): Db {
    if (!db) {
        throw new Error('Database not connected. Call connectToDatabase() first.');
    }
    return db;
}

/**
 * Get a collection by name
 */
export function getCollection<T>(name: string): Collection<T> {
    return getDatabase().collection<T>(name);
}

/**
 * Create necessary indexes for performance
 */
async function createIndexes(): Promise<void> {
    try {
        const announcements = getDatabase().collection('announcements');
        const users = getDatabase().collection('users');
        const securityLogs = getDatabase().collection('security_logs');
        const bookmarks = getDatabase().collection('bookmarks');
        const subscriptions = getDatabase().collection('subscriptions');
        const pushSubscriptions = getDatabase().collection('push_subscriptions');
        const profiles = getDatabase().collection('user_profiles');
        const savedSearches = getDatabase().collection('saved_searches');
        const analyticsEvents = getDatabase().collection('analytics_events');
        const analyticsRollups = getDatabase().collection('analytics_rollups');
        const adminAuditLogs = getDatabase().collection('admin_audit_logs');
        const userNotifications = getDatabase().collection('user_notifications');

        // Announcements indexes
        await announcements.createIndex({ slug: 1 }, { unique: true });
        await announcements.createIndex({ category: 1 }); // Partition key simulation
        await announcements.createIndex({ type: 1 });
        await announcements.createIndex({ isActive: 1 });
        await announcements.createIndex({ status: 1 });
        await announcements.createIndex({ publishAt: 1 });
        await announcements.createIndex({ postedAt: -1 });
        await announcements.createIndex({ updatedAt: -1 });
        await announcements.createIndex({ viewCount: -1 });
        await announcements.createIndex({ deadline: 1 });
        // Note: Text indexes are not supported in Cosmos DB MongoDB API
        // Use regex search instead (already implemented in model)

        // Users indexes
        await users.createIndex({ email: 1 }, { unique: true });

        // Bookmarks indexes
        await bookmarks.createIndex({ userId: 1, announcementId: 1 }, { unique: true });

        // Subscriptions indexes
        await subscriptions.createIndex({ email: 1 }, { unique: true });
        await subscriptions.createIndex({ verificationToken: 1 });
        await subscriptions.createIndex({ unsubscribeToken: 1 });

        // Push subscriptions indexes
        await pushSubscriptions.createIndex({ endpoint: 1 }, { unique: true });

        // User profiles indexes
        await profiles.createIndex({ userId: 1 }, { unique: true });

        // Saved searches indexes
        await savedSearches.createIndex({ userId: 1, createdAt: -1 });

        // Security logs indexes
        await securityLogs.createIndex({ createdAt: -1 });
        await securityLogs.createIndex({ ipAddress: 1 });

        // Analytics indexes
        await analyticsEvents.createIndex({ createdAt: -1 });
        await analyticsEvents.createIndex({ type: 1, createdAt: -1 });
        await analyticsEvents.createIndex({ announcementId: 1 });
        await analyticsRollups.createIndex({ date: 1 }, { unique: true });

        // Admin audit logs
        await adminAuditLogs.createIndex({ createdAt: -1 });
        await adminAuditLogs.createIndex({ action: 1, createdAt: -1 });
        await adminAuditLogs.createIndex({ announcementId: 1 });

        // User notifications
        await userNotifications.createIndex({ userId: 1, createdAt: -1 });
        await userNotifications.createIndex({ userId: 1, announcementId: 1, source: 1 }, { unique: true });

        console.log('[CosmosDB] Indexes created successfully');
    } catch (error) {
        console.error('[CosmosDB] Index creation error:', error);
        // Don't fail on index errors (might already exist)
    }
}

/**
 * Close the database connection
 */
export async function closeConnection(): Promise<void> {
    if (client) {
        await client.close();
        client = null;
        db = null;
        console.log('[CosmosDB] Connection closed');
    }
}

/**
 * Health check for database
 */
export async function healthCheck(): Promise<boolean> {
    try {
        if (!db) return false;
        await db.command({ ping: 1 });
        return true;
    } catch {
        return false;
    }
}

/**
 * Helper to convert string ID to ObjectId
 */
export function toObjectId(id: string): ObjectId {
    return new ObjectId(id);
}

/**
 * Helper to check if string is valid ObjectId
 */
export function isValidObjectId(id: string): boolean {
    return ObjectId.isValid(id);
}

export default {
    connectToDatabase,
    getDatabase,
    getCollection,
    closeConnection,
    healthCheck,
    toObjectId,
    isValidObjectId,
};
