import net from 'node:net';

import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { closeConnection, connectToDatabase, getDatabase } from '../src/services/cosmosdb.js';

dotenv.config();

let mongoServer: MongoMemoryServer | null = null;
let skipMongoTests = false;

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.DISABLE_DB_RECONNECT = process.env.DISABLE_DB_RECONNECT || 'false';
// Ensure tests do not accidentally use COSMOS_CONNECTION_STRING from .env.
process.env.COSMOS_CONNECTION_STRING = '';

// Relax rate limits during tests so integration test suites don't hit 429s.
process.env.RATE_LIMIT_MAX = '10000';
process.env.AUTH_RATE_LIMIT_MAX = '10000';

async function canConnect(port: number, host: string): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = net.createConnection({ port, host });
        socket.setTimeout(1000);
        socket.once('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.once('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        socket.once('error', () => {
            socket.destroy();
            resolve(false);
        });
    });
}

if (!process.env.MONGODB_URI && await canConnect(27017, '127.0.0.1')) {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/sarkari_test';
}

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
    process.env.DISABLE_DB_RECONNECT = 'false';
    await connectToDatabase();
});

afterEach(async () => {
    if (skipMongoTests) return;
    try {
        const database = await getDatabase();
        await database.dropDatabase();
    } catch {
        // Ignore cleanup errors.
    }
});

afterAll(async () => {
    if (skipMongoTests) return;

    // Avoid reconnect churn when suite teardown races with close events.
    process.env.DISABLE_DB_RECONNECT = 'true';
    await closeConnection();

    if (mongoServer) {
        try {
            await mongoServer.stop();
        } catch {
            // Ignore shutdown errors.
        }
    }
});
