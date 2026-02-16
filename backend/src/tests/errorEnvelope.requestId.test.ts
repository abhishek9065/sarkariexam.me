import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { errorHandler } from '../middleware/errorHandler.js';
import { requestIdMiddleware } from '../middleware/requestId.js';
import { app as serverApp } from '../server.js';
import { AppError } from '../utils/AppError.js';

const createErrorHarness = () => {
  const app = express();
  app.use(requestIdMiddleware);
  app.get('/boom', () => {
    throw new Error('boom');
  });
  app.get('/forbidden', () => {
    throw new AppError('Forbidden test error', 403);
  });
  app.use(errorHandler);
  return app;
};

describe('request id + error envelope', () => {
  it('returns standardized envelope for unhandled errors', async () => {
    const app = createErrorHarness();
    const response = await request(app).get('/boom').set('X-Request-Id', 'req-test-123');

    expect(response.status).toBe(500);
    expect(response.headers['x-request-id']).toBe('req-test-123');
    expect(response.body).toMatchObject({
      error: 'Internal Server Error',
      code: 'INTERNAL_SERVER_ERROR',
      requestId: 'req-test-123',
    });
    expect(typeof response.body.message).toBe('string');
  });

  it('returns standardized envelope for operational AppError responses', async () => {
    const app = createErrorHarness();
    const response = await request(app).get('/forbidden');

    expect(response.status).toBe(403);
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.body).toMatchObject({
      error: 'Forbidden test error',
      code: 'FORBIDDEN',
      message: 'Forbidden test error',
      requestId: response.headers['x-request-id'],
    });
  });

  it('returns API fallback with code and request id under Express 5', async () => {
    const response = await request(serverApp).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.body).toMatchObject({
      error: 'Endpoint not found',
      code: 'NOT_FOUND',
      requestId: response.headers['x-request-id'],
    });
  });
});
