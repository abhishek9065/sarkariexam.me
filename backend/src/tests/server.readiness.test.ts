import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('server readiness', () => {
  beforeEach(() => {
    process.env.POSTGRES_PRISMA_URL = 'postgresql://postgres:postgres@localhost:5432/sarkari_test?schema=public';
    delete process.env.LEGACY_MONGO_REQUIRED;
    vi.resetModules();
    connectToDatabase.mockReset();
    ensureDatabaseReady.mockReset();
    healthCheck.mockReset();
    isDatabaseConfigured.mockReset();
    postgresHealthCheck.mockReset();
    postgresHealthCheck.mockResolvedValue(true);
  });

  it('skips optional legacy bridge checks in /api/health', async () => {
    isDatabaseConfigured.mockReturnValue(true);
    healthCheck.mockResolvedValue(false);

    const { app } = await import('../server.js');
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      db: {
        configured: true,
        required: false,
        status: 'not_required',
      },
      legacyBridge: {
        configured: true,
        required: false,
        status: 'not_required',
      },
    });
    expect(healthCheck).not.toHaveBeenCalled();
  });

  it('keeps /api/health healthy when required legacy bridge is unavailable', async () => {
    process.env.LEGACY_MONGO_REQUIRED = 'true';
    isDatabaseConfigured.mockReturnValue(true);
    healthCheck.mockResolvedValue(false);

    const { app } = await import('../server.js');
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      db: {
        configured: true,
        required: true,
        ok: false,
        status: 'degraded',
      },
    });
    expect(healthCheck).toHaveBeenCalledTimes(1);
  });

  it('keeps /api/health healthy when no database is configured', async () => {
    isDatabaseConfigured.mockReturnValue(false);

    const { app } = await import('../server.js');
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      db: {
        configured: false,
        required: false,
        status: 'not_configured',
      },
    });
    expect(healthCheck).not.toHaveBeenCalled();
  });

  it('returns 200 for /api/livez even when PostgreSQL checks fail', async () => {
    isDatabaseConfigured.mockReturnValue(true);
    postgresHealthCheck.mockResolvedValue(false);

    const { app } = await import('../server.js');
    const response = await request(app).get('/api/livez');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
    });
  });

  it('returns 503 for /api/readyz when PostgreSQL is unavailable', async () => {
    isDatabaseConfigured.mockReturnValue(false);
    postgresHealthCheck.mockResolvedValue(false);

    const { app } = await import('../server.js');
    const response = await request(app).get('/api/readyz');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      status: 'error',
      contentDb: {
        postgres: {
          configured: true,
          ok: false,
        },
      },
    });
  });

  it('does not block /api/admin routes on legacy bridge readiness anymore', async () => {
    isDatabaseConfigured.mockReturnValue(true);
    healthCheck.mockResolvedValue(true);
    ensureDatabaseReady.mockRejectedValue(new Error('database unavailable'));

    const { app } = await import('../server.js');
    const response = await request(app).get('/api/admin/announcements');

    expect(response.status).toBe(401);
    expect(response.body.code).not.toBe('LEGACY_DB_UNAVAILABLE');
    expect(ensureDatabaseReady).not.toHaveBeenCalled();
  });
});
