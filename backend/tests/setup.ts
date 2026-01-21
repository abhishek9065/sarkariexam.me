import { beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectToDatabase, closeConnection, getDatabase } from '../src/services/cosmosdb.js';

let mongoServer: MongoMemoryServer | null = null;
let skipMongoTests = false;

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

if (!process.env.MONGODB_URI) {
    try {
        mongoServer = await MongoMemoryServer.create();
        process.env.MONGODB_URI = mongoServer.getUri();
    } catch (error) {
        skipMongoTests = true;
        process.env.SKIP_MONGO_TESTS = 'true';
        console.warn('[Tests] MongoMemoryServer failed to start. Set MONGODB_URI or install the VC++ Redistributable.', error);
    }
}

beforeAll(async () => {
    if (skipMongoTests) return;
    await connectToDatabase();
});

afterEach(async () => {
    if (skipMongoTests) return;
    try {
        const db = getDatabase();
        await db.dropDatabase();
    } catch {
        // Ignore cleanup errors
    }
});

afterAll(async () => {
    if (skipMongoTests) return;
    await closeConnection();
    if (mongoServer) {
        await mongoServer.stop();
    }
});
