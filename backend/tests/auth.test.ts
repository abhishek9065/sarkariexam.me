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

    it('resets password with recovery token', async () => {
        const email = `recover-${Date.now()}@example.com`;
        const oldPassword = `Old!${Date.now()}Aa`;
        const newPassword = `New!${Date.now()}Bb`;
        const agent = request.agent(app);

        const csrfRegisterRes = await agent
            .get('/api/auth/csrf')
            .expect(200);
        const registerCsrfToken = csrfRegisterRes.body?.data?.csrfToken;

        await agent
            .post('/api/auth/register')
            .set('x-csrf-token', registerCsrfToken)
            .send({
                name: 'Recovery User',
                email,
                password: oldPassword,
            })
            .expect(201);

        const csrfRequestRes = await agent
            .get('/api/auth/csrf')
            .expect(200);
        const recoveryRequestCsrf = csrfRequestRes.body?.data?.csrfToken;

        const recoveryRequest = await agent
            .post('/api/auth/password-recovery/request')
            .set('x-csrf-token', recoveryRequestCsrf)
            .send({ email })
            .expect(200);

        const recoveryToken = recoveryRequest.body?.data?.testToken;
        expect(typeof recoveryToken).toBe('string');

        const csrfVerifyRes = await agent
            .get('/api/auth/csrf')
            .expect(200);
        const verifyCsrfToken = csrfVerifyRes.body?.data?.csrfToken;

        await agent
            .post('/api/auth/password-recovery/verify')
            .set('x-csrf-token', verifyCsrfToken)
            .send({ token: recoveryToken })
            .expect(200);

        const csrfResetRes = await agent
            .get('/api/auth/csrf')
            .expect(200);
        const resetCsrfToken = csrfResetRes.body?.data?.csrfToken;

        await agent
            .post('/api/auth/password-recovery/reset')
            .set('x-csrf-token', resetCsrfToken)
            .send({ token: recoveryToken, password: newPassword })
            .expect(200);

        const csrfOldLoginRes = await agent
            .get('/api/auth/csrf')
            .expect(200);
        const oldLoginCsrf = csrfOldLoginRes.body?.data?.csrfToken;

        await agent
            .post('/api/auth/login')
            .set('x-csrf-token', oldLoginCsrf)
            .send({ email, password: oldPassword })
            .expect(401);

        const csrfNewLoginRes = await agent
            .get('/api/auth/csrf')
            .expect(200);
        const newLoginCsrf = csrfNewLoginRes.body?.data?.csrfToken;

        await agent
            .post('/api/auth/login')
            .set('x-csrf-token', newLoginCsrf)
            .send({ email, password: newPassword })
            .expect(200);
    });
});
