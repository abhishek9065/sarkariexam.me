import { beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectToDatabase, closeConnection, getDatabase } from '../src/services/cosmosdb.js';

let mongoServer: MongoMemoryServer | null = null;

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    await connectToDatabase();
});

afterEach(async () => {
    try {
        const db = getDatabase();
        await db.dropDatabase();
    } catch {
        // Ignore cleanup errors
    }
});

afterAll(async () => {
    await closeConnection();
    if (mongoServer) {
        await mongoServer.stop();
    }
});
