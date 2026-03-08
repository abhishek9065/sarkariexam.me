import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { AnnouncementModelMongo } from '../src/models/announcements.mongo.js';
import { app } from '../src/server.js';

const describeOrSkip = process.env.SKIP_MONGO_TESTS === 'true' ? describe.skip : describe;

async function createUserToken() {
    const agent = request.agent(app);
    const email = `bookmark-${Date.now()}@example.com`;
    const password = `Strong!${Date.now()}Aa`;

    const registerRes = await agent
        .post('/api/auth/register')
        .send({
            name: 'Bookmark User',
            email,
            password,
        })
        .expect(201);

    return { agent, email, cookies: registerRes.headers['set-cookie'] as string[] | undefined };
}

describeOrSkip('bookmarks', () => {
    it('adds and removes bookmarks', async () => {
        const { agent, cookies } = await createUserToken();
        expect(cookies?.length).toBeGreaterThan(0);

        const announcement = await AnnouncementModelMongo.create({
            title: 'Test Announcement',
            type: 'job',
            category: 'Test Category',
            organization: 'Test Org',
        }, 'admin-user');

        await agent
            .post('/api/bookmarks')
            .send({ announcementId: announcement.id })
            .expect(201);

        const idsRes = await agent
            .get('/api/bookmarks/ids')
            .expect(200);

        expect(idsRes.body?.data).toContain(announcement.id);

        await agent
            .delete(`/api/bookmarks/${announcement.id}`)
            .expect(200);

        const idsAfter = await agent
            .get('/api/bookmarks/ids')
            .expect(200);

        expect(idsAfter.body?.data).not.toContain(announcement.id);
    });
});
