import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const connectToDatabase = vi.fn();
const ensureDatabaseReady = vi.fn();
const healthCheck = vi.fn();
const isDatabaseConfigured = vi.fn();
const postgresHealthCheck = vi.fn();

vi.mock('../services/cosmosdb.js', () => ({
  closeConnection: vi.fn(),
  connectToDatabase,
  ensureDatabaseReady,
  getCollection: vi.fn(() => ({
    aggregate: vi.fn(),
    createIndex: vi.fn(),
    deleteOne: vi.fn(),
    distinct: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    insertOne: vi.fn(),
    updateOne: vi.fn(),
  })),
  getCollectionAsync: vi.fn(),
  getDatabase: vi.fn(),
  healthCheck,
  isDatabaseConfigured,
  isDatabaseConnected: vi.fn(),
  isValidObjectId: vi.fn(() => true),
  toObjectId: vi.fn((id: string) => id),
}));

vi.mock('../services/postgres/prisma.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/postgres/prisma.js')>();
  return {
    ...actual,
    postgresHealthCheck,
  };
});

describe('server security pipeline', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalEnforceApiOrigin = process.env.ENFORCE_API_ORIGIN;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'unit-prod-secret-2026';
    process.env.POSTGRES_PRISMA_URL = 'postgresql://postgres:postgres@localhost:5432/sarkari_test?schema=public';
    process.env.ENFORCE_API_ORIGIN = 'true';
    isDatabaseConfigured.mockReturnValue(false);
    healthCheck.mockResolvedValue(true);
    postgresHealthCheck.mockResolvedValue(true);
    vi.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.ENFORCE_API_ORIGIN = originalEnforceApiOrigin;
  });

  it('blocks mutating /api requests without Origin when strict origin mode is enabled', async () => {
    const { app } = await import('../server.js');

    const response = await request(app)
      .post('/api/nonexistent')
      .send({ hello: 'world' });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('ORIGIN_REQUIRED');
  });

  it('allows mutating /api requests with Origin to pass origin guard', async () => {
    const { app } = await import('../server.js');

    const response = await request(app)
      .post('/api/nonexistent')
      .set('Origin', 'https://sarkariexams.me')
      .send({ hello: 'world' });

    expect(response.status).toBe(403);
    expect(response.body.code).not.toBe('ORIGIN_REQUIRED');
  });
});
