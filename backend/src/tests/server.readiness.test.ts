import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const connectToDatabase = vi.fn();
const ensureDatabaseReady = vi.fn();
const healthCheck = vi.fn();
const isDatabaseConfigured = vi.fn();

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

describe('server readiness', () => {
  beforeEach(() => {
    vi.resetModules();
    connectToDatabase.mockReset();
    ensureDatabaseReady.mockReset();
    healthCheck.mockReset();
    isDatabaseConfigured.mockReset();
  });

  it('returns 503 from /api/health when the database is configured but unavailable', async () => {
    isDatabaseConfigured.mockReturnValue(true);
    healthCheck.mockResolvedValue(false);

    const { app } = await import('../server.js');
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      status: 'error',
      db: {
        configured: true,
        ok: false,
      },
    });
  });

  it('returns 503 for db-backed API routes when the database cannot be readied', async () => {
    isDatabaseConfigured.mockReturnValue(true);
    healthCheck.mockResolvedValue(true);
    ensureDatabaseReady.mockRejectedValue(new Error('database unavailable'));

    const { app } = await import('../server.js');
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      error: 'Service unavailable',
    });
  });
});
