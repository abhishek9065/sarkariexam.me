import { MongoMemoryServer } from 'mongodb-memory-server';
import { beforeAll, afterAll, afterEach } from 'vitest';

let mongoServer: MongoMemoryServer | null = null;
let skipMongoTests = false;

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.COSMOS_CONNECTION_STRING = '';
process.env.ADMIN_REQUIRE_2FA = 'false';

if (process.env.TEST_MONGODB_URI) {
    process.env.MONGODB_URI = process.env.TEST_MONGODB_URI;
} else {
    try {
        mongoServer = await MongoMemoryServer.create();
        process.env.MONGODB_URI = mongoServer.getUri();
    } catch (error) {
        skipMongoTests = true;
        process.env.SKIP_MONGO_TESTS = 'true';
        console.warn('[Tests] MongoMemoryServer failed to start. Set MONGODB_URI or install the VC++ Redistributable.', error);
    }
}

const dbService = await import('../src/services/cosmosdb.js');

beforeAll(async () => {
    if (skipMongoTests) return;
    await dbService.connectToDatabase();
});

afterEach(async () => {
    if (skipMongoTests) return;
    try {
        const db = await dbService.getDatabase();
        await db.dropDatabase();
    } catch {
        // Ignore cleanup errors
    }
});

afterAll(async () => {
    if (skipMongoTests) return;
    await dbService.closeConnection();
    if (mongoServer) {
        await mongoServer.stop();
    }
});
