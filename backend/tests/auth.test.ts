import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/server.js';

const describeOrSkip = process.env.SKIP_MONGO_TESTS === 'true' ? describe.skip : describe;

describeOrSkip('auth/register', () => {
    it('registers and logs in a user', async () => {
        const email = `test-${Date.now()}@example.com`;
        const password = `Str0ng!${Date.now()}Aa`;
        const agent = request.agent(app);

        const csrfRegisterRes = await agent
            .get('/api/auth/csrf')
            .expect(200);
        const registerCsrfToken = csrfRegisterRes.body?.data?.csrfToken;
        expect(typeof registerCsrfToken).toBe('string');

        const registerRes = await agent
            .post('/api/auth/register')
            .set('x-csrf-token', registerCsrfToken)
            .send({
                name: 'Test User',
                email,
                password,
            })
            .expect(201);

        expect(registerRes.body?.data?.token).toBeUndefined();
        expect(registerRes.body?.data?.user?.email).toBe(email);
        expect(registerRes.headers['set-cookie']).toBeDefined();

        const csrfLoginRes = await agent
            .get('/api/auth/csrf')
            .expect(200);
        const loginCsrfToken = csrfLoginRes.body?.data?.csrfToken;
        expect(typeof loginCsrfToken).toBe('string');

        const loginRes = await agent
            .post('/api/auth/login')
            .set('x-csrf-token', loginCsrfToken)
            .send({ email, password })
            .expect(200);

        expect(loginRes.body?.data?.token).toBeUndefined();
        expect(loginRes.body?.data?.user?.email).toBe(email);
        expect(loginRes.headers['set-cookie']).toBeDefined();
    });
});
