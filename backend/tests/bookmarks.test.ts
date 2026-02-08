import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { AnnouncementModelMongo } from '../src/models/announcements.mongo.js';
import { app } from '../src/server.js';

const describeOrSkip = process.env.SKIP_MONGO_TESTS === 'true' ? describe.skip : describe;

async function createUserToken() {
    const email = `bookmark-${Date.now()}@example.com`;
    const password = `Strong!${Date.now()}Aa`;

    const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
            name: 'Bookmark User',
            email,
            password,
        })
        .expect(201);

    return { token: registerRes.body?.data?.token as string, email };
}

describeOrSkip('bookmarks', () => {
    it('adds and removes bookmarks', async () => {
        const { token } = await createUserToken();
        expect(token).toBeTypeOf('string');

        const announcement = await AnnouncementModelMongo.create({
            title: 'Test Announcement',
            type: 'job',
            category: 'Test Category',
            organization: 'Test Org',
        }, 'admin-user');

        await request(app)
            .post('/api/bookmarks')
            .set('Authorization', `Bearer ${token}`)
            .send({ announcementId: announcement.id })
            .expect(201);

        const idsRes = await request(app)
            .get('/api/bookmarks/ids')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        expect(idsRes.body?.data).toContain(announcement.id);

        await request(app)
            .delete(`/api/bookmarks/${announcement.id}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        const idsAfter = await request(app)
            .get('/api/bookmarks/ids')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        expect(idsAfter.body?.data).not.toContain(announcement.id);
    });
});
