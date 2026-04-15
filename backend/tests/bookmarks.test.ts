import { PostType, WorkflowStatus } from '@prisma/client';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/server.js';
import { prisma } from '../src/services/postgres/prisma.js';

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

        await agent
            .post('/api/bookmarks')
            .send({ announcementId })
            .expect(201);

        const idsRes = await agent
            .get('/api/bookmarks/ids')
            .expect(200);

        expect(idsRes.body?.data).toContain(announcementId);

        await agent
            .delete(`/api/bookmarks/${announcementId}`)
            .expect(200);

        const idsAfter = await agent
            .get('/api/bookmarks/ids')
            .expect(200);

        expect(idsAfter.body?.data).not.toContain(announcementId);
    });
});
