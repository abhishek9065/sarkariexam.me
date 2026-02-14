import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { config } from '../config.js';
import { CSRF_COOKIE_NAME, csrfProtection } from '../middleware/csrf.js';

const createApp = () => {
  const app = express();
  const router = express.Router();

  app.use(cookieParser());
  app.use(express.json());
  app.use(
    '/api/auth',
    csrfProtection({
      cookieNames: [config.adminAuthCookieName],
      exempt: [
        { method: 'POST', path: '/login' },
        { method: 'POST', path: '/register' },
      ],
    }),
    router
  );

  router.post('/login', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  router.post('/register', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  router.post('/logout', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  return app;
};

describe('CSRF auth guardrail', () => {
  it('allows POST /api/auth/login without CSRF header for stale protected cookie', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/auth/login')
      .set('Cookie', [`${config.adminAuthCookieName}=stale-session-cookie`])
      .send({ email: 'user@example.com', password: 'password' });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it('allows POST /api/auth/register without CSRF header for stale protected cookie', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/auth/register')
      .set('Cookie', [`${config.adminAuthCookieName}=stale-session-cookie`])
      .send({ email: 'new@example.com', name: 'New User', password: 'Password123!' });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it('rejects POST /api/auth/logout without CSRF header when protected cookie is present', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [
        `${config.adminAuthCookieName}=stale-session-cookie`,
        `${CSRF_COOKIE_NAME}=csrf-cookie-value`,
      ]);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('csrf_invalid');
  });

  it('allows POST /api/auth/logout with matching CSRF cookie and header', async () => {
    const app = createApp();
    const csrfToken = 'csrf-cookie-value';
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [
        `${config.adminAuthCookieName}=stale-session-cookie`,
        `${CSRF_COOKIE_NAME}=${csrfToken}`,
      ])
      .set('X-CSRF-Token', csrfToken);

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });
});

