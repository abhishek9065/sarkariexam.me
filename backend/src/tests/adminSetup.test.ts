import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UserModelMongo } from '../models/users.mongo.js';
import adminSetupRouter from '../routes/admin-setup.js';

vi.mock('../models/users.mongo.js');
vi.mock('../services/securityLogger.js', () => ({
  SecurityLogger: { log: vi.fn() },
}));
vi.mock('../config.js', () => ({
  config: {
    adminSetupKey: 'setup-admin-123',
    adminEmailAllowlist: [],
    adminDomainAllowlist: [],
  },
}));

const app = express();
app.use(express.json());
app.use('/auth/admin', adminSetupRouter);

describe('Admin setup routes', () => {
  const originalMongoUri = process.env.MONGODB_URI;
  const originalCosmos = process.env.COSMOS_CONNECTION_STRING;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
    process.env.COSMOS_CONNECTION_STRING = process.env.COSMOS_CONNECTION_STRING || '';
  });

  afterEach(() => {
    if (originalMongoUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = originalMongoUri;
    if (originalCosmos === undefined) delete process.env.COSMOS_CONNECTION_STRING;
    else process.env.COSMOS_CONNECTION_STRING = originalCosmos;
  });

  it('returns setup required when no admin portal users exist', async () => {
    vi.mocked(UserModelMongo.hasAdminPortalUser).mockResolvedValue(false);

    const response = await request(app).get('/auth/admin/setup-status');

    expect(response.status).toBe(200);
    expect(response.body.needsSetup).toBe(true);
  });

  it('returns setup completed when any portal role exists', async () => {
    vi.mocked(UserModelMongo.hasAdminPortalUser).mockResolvedValue(true);

    const response = await request(app).get('/auth/admin/setup-status');

    expect(response.status).toBe(200);
    expect(response.body.needsSetup).toBe(false);
  });

  it('creates first admin account with valid setup key', async () => {
    vi.mocked(UserModelMongo.hasAdminPortalUser).mockResolvedValue(false);
    vi.mocked(UserModelMongo.findByEmail).mockResolvedValue(null);
    vi.mocked(UserModelMongo.create).mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      username: 'Admin',
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString(),
      twoFactorEnabled: false,
    } as any);

    const response = await request(app)
      .post('/auth/admin/setup')
      .send({
        email: 'admin@example.com',
        password: 'Password#12345',
        name: 'Admin',
        setupKey: 'setup-admin-123',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe('admin@example.com');
    expect(UserModelMongo.create).toHaveBeenCalledWith(expect.objectContaining({
      role: 'admin',
      email: 'admin@example.com',
    }));
  });

  it('blocks setup when a portal account already exists', async () => {
    vi.mocked(UserModelMongo.hasAdminPortalUser).mockResolvedValue(true);

    const response = await request(app)
      .post('/auth/admin/setup')
      .send({
        email: 'another-admin@example.com',
        password: 'Password#12345',
        name: 'Another Admin',
        setupKey: 'setup-admin-123',
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Admin setup already completed');
  });

  it('returns service unavailable when database env is missing', async () => {
    delete process.env.MONGODB_URI;
    delete process.env.COSMOS_CONNECTION_STRING;

    const response = await request(app).get('/auth/admin/setup-status');

    expect(response.status).toBe(503);
    expect(response.body.error).toBe('database_unavailable');
  });
});
