import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

/**
 * Azure Cosmos DB Service (MongoDB API)
 * Handles connection and provides database/collection access
 */

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnecting = false;
let connectionRetries = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

const getConnectionString = (): string | undefined =>
    process.env.COSMOS_CONNECTION_STRING || process.env.MONGODB_URI;

const getDatabaseName = (): string =>
    process.env.COSMOS_DATABASE_NAME || 'sarkari_db';

/**
 * Sleep utility for delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Initialize MongoDB/Cosmos DB connection with retry logic
 */
export async function connectToDatabase(): Promise<Db> {
    if (db) return db;
    
    // Prevent multiple concurrent connection attempts
    if (isConnecting) {
        while (isConnecting) {
            await sleep(100);
        }
        if (db) return db;
    }

    isConnecting = true;

    const connectionString = getConnectionString();
    if (!connectionString) {
        isConnecting = false;
        throw new Error('COSMOS_CONNECTION_STRING or MONGODB_URI is not configured');
    }

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`[CosmosDB] Connection attempt ${attempt}/${MAX_RETRIES}...`);

            client = new MongoClient(connectionString, {
                // Cosmos DB specific settings
                retryWrites: false, // Cosmos DB doesn't support retryWrites
                maxPoolSize: 10,
                minPoolSize: 1,
                connectTimeoutMS: 30000,
                socketTimeoutMS: 360000,
                serverSelectionTimeoutMS: 10000,
                heartbeatFrequencyMS: 30000,
            });

            await client.connect();
            const databaseName = getDatabaseName();
            db = client.db(databaseName);

            // Test the connection
            await db.admin().ping();

            console.log('[CosmosDB] Connected successfully to:', databaseName);
            connectionRetries = 0;
            isConnecting = false;

            // Create indexes
            try {
                await createIndexes();
            } catch (indexError) {
                console.warn('[CosmosDB] Index creation failed:', indexError);
                // Don't fail connection for index issues
            }

            // Setup connection monitoring
            client.on('close', () => {
                console.warn('[CosmosDB] Connection closed');
                db = null;
                client = null;
            });

            client.on('error', (error) => {
                console.error('[CosmosDB] Connection error:', error);
                db = null;
                client = null;
            });

            return db;
        } catch (error) {
            console.error(`[CosmosDB] Connection attempt ${attempt} failed:`, error);
            connectionRetries = attempt;
            
            // Clean up failed connection
            if (client) {
                try {
                    await client.close();
                } catch {
                    // Ignore close errors
                }
                client = null;
            }
            db = null;

            if (attempt === MAX_RETRIES) {
                isConnecting = false;
                throw new Error(`Failed to connect to database after ${MAX_RETRIES} attempts: ${error}`);
            }

            // Wait before retry
            console.log(`[CosmosDB] Retrying in ${RETRY_DELAY}ms...`);
            await sleep(RETRY_DELAY * attempt); // Exponential backoff
        }
    }

    isConnecting = false;
    throw new Error('Unexpected error in connection loop');
}

/**
 * Get database instance with automatic reconnection
 */
export async function getDatabase(): Promise<Db> {
    if (!db) {
        console.warn('[CosmosDB] Database not connected, attempting reconnection...');
        return await connectToDatabase();
    }
    
    // Test connection health periodically
    try {
        await db.admin().ping();
        return db;
    } catch (error) {
        console.warn('[CosmosDB] Database connection unhealthy, reconnecting...', error);
        db = null;
        client = null;
        return await connectToDatabase();
    }
}

/**
 * Get a collection by name with connection validation
 */
export function getCollection<T>(name: string): Collection<T> {
    if (!db) {
        throw new Error('Database not connected. Call connectToDatabase() first.');
    }
    return db.collection<T>(name);
}

/**
 * Async collection getter with auto-reconnection
 */
export async function getCollectionAsync<T>(name: string): Promise<Collection<T>> {
    const database = await getDatabase();
    return database.collection<T>(name);
}

/**
 * Create necessary indexes for performance
 */
async function createIndexes(): Promise<void> {
    try {
        const database = await getDatabase();
        const announcements = database.collection('announcements');
        const users = database.collection('users');
        const securityLogs = database.collection('security_logs');
        const bookmarks = database.collection('bookmarks');
        const subscriptions = database.collection('subscriptions');
        const pushSubscriptions = database.collection('push_subscriptions');
        const profiles = database.collection('user_profiles');
        const savedSearches = database.collection('saved_searches');
        const analyticsEvents = database.collection('analytics_events');
        const analyticsRollups = database.collection('analytics_rollups');
        const adminAuditLogs = database.collection('admin_audit_logs');
        const userNotifications = database.collection('user_notifications');
        const communityForums = database.collection('community_forums');
        const communityQa = database.collection('community_qa');
        const communityGroups = database.collection('community_groups');
        const communityFlags = database.collection('community_flags');
        const errorReports = database.collection('error_reports');

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

        // Community collections
        await communityForums.createIndex({ createdAt: -1 });
        await communityQa.createIndex({ createdAt: -1 });
        await communityGroups.createIndex({ createdAt: -1 });
        await communityFlags.createIndex({ createdAt: -1 });
        await communityFlags.createIndex({ status: 1, createdAt: -1 });

        // Error reports
        await errorReports.createIndex({ createdAt: -1 });
        await errorReports.createIndex({ errorId: 1, createdAt: -1 });

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
