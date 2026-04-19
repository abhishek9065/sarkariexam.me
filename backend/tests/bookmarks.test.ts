import { PostType, WorkflowStatus } from '@prisma/client';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/server.js';
import { prisma } from '../src/services/postgres/prisma.js';

async function createUserToken() {
    const agent = request.agent(app);
    const email = `bookmark-${Date.now()}@example.com`;
    const password = `Strong!${Date.now()}Aa`;

    const csrfRes = await agent
        .get('/api/auth/csrf')
        .expect(200);
    const csrfToken = csrfRes.body?.data?.csrfToken;
    expect(typeof csrfToken).toBe('string');

    const registerRes = await agent
        .post('/api/auth/register')
        .set('x-csrf-token', csrfToken)
        .send({
            name: 'Bookmark User',
            email,
            password,
        })
        .expect(201);

    return { agent, email, cookies: registerRes.headers['set-cookie'] as string[] | undefined };
}

describe('bookmarks', () => {
    it('adds and removes bookmarks', async () => {
        const { agent, cookies } = await createUserToken();
        expect(cookies?.length).toBeGreaterThan(0);

        const seededPost = await prisma.post.create({
            data: {
                title: `Bookmark Test Announcement ${Date.now()}`,
                slug: `bookmark-test-${Date.now()}`,
                type: PostType.JOB,
                status: WorkflowStatus.PUBLISHED,
                summary: 'Bookmark test summary',
                searchText: 'bookmark test',
                publishedAt: new Date(),
            },
            select: { id: true },
        });

        const announcementId = seededPost.id;

        const csrfRes = await agent
            .get('/api/auth/csrf')
            .expect(200);
        const csrfToken = csrfRes.body?.data?.csrfToken;
        expect(typeof csrfToken).toBe('string');

        await agent
            .post('/api/bookmarks')
            .set('x-csrf-token', csrfToken)
            .send({ announcementId })
            .expect(201);

        const idsRes = await agent
            .get('/api/bookmarks/ids')
            .expect(200);

        expect(idsRes.body?.data).toContain(announcementId);

        await agent
            .delete(`/api/bookmarks/${announcementId}`)
            .set('x-csrf-token', csrfToken)
            .expect(200);

        const idsAfter = await agent
            .get('/api/bookmarks/ids')
            .expect(200);

        expect(idsAfter.body?.data).not.toContain(announcementId);
    });
});
