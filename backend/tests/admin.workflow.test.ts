import { ObjectId } from 'mongodb';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { config } from '../src/config.js';
import { UserModelMongo } from '../src/models/users.mongo.js';
import { app } from '../src/server.js';
import { getCollection } from '../src/services/cosmosdb.js';

const describeOrSkip = process.env.SKIP_MONGO_TESTS === 'true' ? describe.skip : describe;

const extractCookieValue = (setCookies: string[], name: string): string | null => {
    const prefix = `${name}=`;
    for (const cookie of setCookies) {
        const firstPart = cookie.split(';')[0]?.trim();
        if (firstPart?.startsWith(prefix)) {
            return firstPart.slice(prefix.length);
        }
    }
    return null;
};

const normalizeCookies = (setCookies: string[]): string[] => setCookies.map((cookie) => cookie.split(';')[0]);

const loginAdmin = async (email: string, password: string) => {
    const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);

    const setCookies = (response.headers['set-cookie'] as string[] | undefined) ?? [];
    const authToken = extractCookieValue(setCookies, config.adminAuthCookieName);
    const csrfToken = extractCookieValue(setCookies, 'csrf_token');

    expect(authToken).toBeTruthy();
    expect(csrfToken).toBeTruthy();

    return {
        cookies: normalizeCookies(setCookies),
        csrfToken: csrfToken as string,
    };
};

const issueStepUp = async (input: {
    email: string;
    password: string;
    cookies: string[];
    csrfToken: string;
}) => {
    const response = await request(app)
        .post('/api/auth/admin/step-up')
        .set('Cookie', input.cookies)
        .set('X-CSRF-Token', input.csrfToken)
        .send({
            email: input.email,
            password: input.password,
        })
        .expect(200);

    expect(response.body?.data?.token).toBeTypeOf('string');
    return response.body.data.token as string;
};

describeOrSkip('admin workflow integration', () => {
    it('requires step-up for sensitive session actions', async () => {
        const password = `Adm1n!${Date.now()}Strong`;
        const admin = await UserModelMongo.create({
            email: `admin-stepup-${Date.now()}@example.com`,
            username: 'Admin StepUp',
            password,
            role: 'admin',
        });

        const session = await loginAdmin(admin.email, password);

        const csrfBlocked = await request(app)
            .post('/api/auth/admin/step-up')
            .set('Cookie', session.cookies)
            .send({
                email: admin.email,
                password,
            });
        expect(csrfBlocked.status).toBe(403);
        expect(csrfBlocked.body.error).toBe('csrf_invalid');

        const blocked = await request(app)
            .post('/api/admin/sessions/terminate-others')
            .set('Cookie', session.cookies)
            .set('X-CSRF-Token', session.csrfToken)
            .send({});
        expect(blocked.status).toBe(403);
        expect(blocked.body.error).toBe('step_up_required');

        const stepUpToken = await issueStepUp({
            email: admin.email,
            password,
            cookies: session.cookies,
            csrfToken: session.csrfToken,
        });

        const allowed = await request(app)
            .post('/api/admin/sessions/terminate-others')
            .set('Cookie', session.cookies)
            .set('X-CSRF-Token', session.csrfToken)
            .set('X-Admin-Step-Up-Token', stepUpToken)
            .send({});

        expect(allowed.status).toBe(200);
        expect(allowed.body.success).toBe(true);
    });

    it('enforces dual approval and blocks self-approval', async () => {
        if (!config.adminDualApprovalRequired) {
            return;
        }

        const suffix = Date.now();
        const requesterPassword = `Req!${suffix}Strong`;
        const reviewerPassword = `Rev!${suffix}Strong`;

        const requester = await UserModelMongo.create({
            email: `requester-${suffix}@example.com`,
            username: 'Requester Admin',
            password: requesterPassword,
            role: 'admin',
        });
        const reviewer = await UserModelMongo.create({
            email: `reviewer-${suffix}@example.com`,
            username: 'Reviewer Admin',
            password: reviewerPassword,
            role: 'reviewer',
        });

        const requesterSession = await loginAdmin(requester.email, requesterPassword);
        const reviewerSession = await loginAdmin(reviewer.email, reviewerPassword);

        const createResponse = await request(app)
            .post('/api/admin/announcements')
            .set('Cookie', requesterSession.cookies)
            .set('X-CSRF-Token', requesterSession.csrfToken)
            .send({
                title: `Railway Recruitment ${suffix}`,
                type: 'job',
                category: 'Central Government',
                organization: 'Railway Board',
                location: 'All India',
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'pending',
                externalLink: 'https://example.com/apply',
                content: 'Apply online for this position. Download official notification PDF.',
                importantDates: [{ eventName: 'Last Date to Apply', eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }],
                minQualification: 'Graduate from a recognized university',
            })
            .expect(201);

        const announcementId = createResponse.body?.data?.id as string;
        expect(announcementId).toBeTruthy();

        const requesterStepUpToken = await issueStepUp({
            email: requester.email,
            password: requesterPassword,
            cookies: requesterSession.cookies,
            csrfToken: requesterSession.csrfToken,
        });

        const queued = await request(app)
            .post(`/api/admin/announcements/${announcementId}/approve`)
            .set('Cookie', requesterSession.cookies)
            .set('X-CSRF-Token', requesterSession.csrfToken)
            .set('X-Admin-Step-Up-Token', requesterStepUpToken)
            .send({});
        expect(queued.status).toBe(202);
        expect(queued.body.requiresApproval).toBe(true);
        const approvalId = queued.body.approvalId as string;
        expect(approvalId).toBeTruthy();

        const selfApprove = await request(app)
            .post(`/api/admin/approvals/${approvalId}/approve`)
            .set('Cookie', requesterSession.cookies)
            .set('X-CSRF-Token', requesterSession.csrfToken)
            .set('X-Admin-Step-Up-Token', requesterStepUpToken)
            .send({});
        expect(selfApprove.status).toBe(403);
        expect(selfApprove.body.reason).toContain('self_approval_forbidden');

        const reviewerStepUpToken = await issueStepUp({
            email: reviewer.email,
            password: reviewerPassword,
            cookies: reviewerSession.cookies,
            csrfToken: reviewerSession.csrfToken,
        });

        const approved = await request(app)
            .post(`/api/admin/approvals/${approvalId}/approve`)
            .set('Cookie', reviewerSession.cookies)
            .set('X-CSRF-Token', reviewerSession.csrfToken)
            .set('X-Admin-Step-Up-Token', reviewerStepUpToken)
            .send({})
            .expect(200);
        expect(approved.body?.data?.status).toBe('approved');

        const executed = await request(app)
            .post(`/api/admin/announcements/${announcementId}/approve`)
            .set('Cookie', requesterSession.cookies)
            .set('X-CSRF-Token', requesterSession.csrfToken)
            .set('X-Admin-Step-Up-Token', requesterStepUpToken)
            .set('X-Admin-Approval-Id', approvalId)
            .send({})
            .expect(200);

        expect(executed.body?.data?.status).toBe('published');
    });

    it('blocks publish transition updates without step-up and queues approval with step-up', async () => {
        const suffix = Date.now();
        const password = `Publ1sh!${suffix}Strong`;
        const admin = await UserModelMongo.create({
            email: `publish-guard-${suffix}@example.com`,
            username: 'Publish Guard Admin',
            password,
            role: 'admin',
        });

        const session = await loginAdmin(admin.email, password);

        const createResponse = await request(app)
            .post('/api/admin/announcements')
            .set('Cookie', session.cookies)
            .set('X-CSRF-Token', session.csrfToken)
            .send({
                title: `Syllabus Update ${suffix}`,
                type: 'syllabus',
                category: 'Education',
                organization: 'State Board',
                status: 'pending',
                content: 'Updated syllabus details for upcoming exam cycle.',
            })
            .expect(201);

        const announcementId = createResponse.body?.data?.id as string;
        expect(announcementId).toBeTruthy();

        const blocked = await request(app)
            .put(`/api/admin/announcements/${announcementId}`)
            .set('Cookie', session.cookies)
            .set('X-CSRF-Token', session.csrfToken)
            .send({ status: 'published' });

        expect(blocked.status).toBe(403);
        expect(blocked.body?.error).toBe('step_up_required');

        const stepUpToken = await issueStepUp({
            email: admin.email,
            password,
            cookies: session.cookies,
            csrfToken: session.csrfToken,
        });

        const queued = await request(app)
            .put(`/api/admin/announcements/${announcementId}`)
            .set('Cookie', session.cookies)
            .set('X-CSRF-Token', session.csrfToken)
            .set('X-Admin-Step-Up-Token', stepUpToken)
            .send({ status: 'published' });

        if (config.adminDualApprovalRequired) {
            expect(queued.status).toBe(202);
            expect(queued.body?.error).toBe('approval_required');
        } else {
            expect(queued.status).toBe(200);
            expect(queued.body?.data?.status).toBe('published');
        }
    });

    it('requires step-up for revert and enforces approval on rollback-to-published snapshots', async () => {
        const suffix = Date.now();
        const password = `Rev3rt!${suffix}Strong`;
        const admin = await UserModelMongo.create({
            email: `revert-guard-${suffix}@example.com`,
            username: 'Revert Guard Admin',
            password,
            role: 'admin',
        });

        const session = await loginAdmin(admin.email, password);

        const createResponse = await request(app)
            .post('/api/admin/announcements')
            .set('Cookie', session.cookies)
            .set('X-CSRF-Token', session.csrfToken)
            .send({
                title: `Rollback Candidate ${suffix}`,
                type: 'syllabus',
                category: 'Education',
                organization: 'State Board',
                status: 'draft',
                content: 'Initial draft content.',
            })
            .expect(201);

        const announcementId = createResponse.body?.data?.id as string;
        expect(announcementId).toBeTruthy();

        const revertBlocked = await request(app)
            .post(`/api/admin/announcements/${announcementId}/revert/1`)
            .set('Cookie', session.cookies)
            .set('X-CSRF-Token', session.csrfToken)
            .send({});
        expect(revertBlocked.status).toBe(403);
        expect(revertBlocked.body?.error).toBe('step_up_required');

        const versionsCollection = getCollection<any>('announcements');
        await versionsCollection.updateOne(
            { _id: new ObjectId(announcementId) },
            {
                $set: {
                    versions: [{
                        version: 1,
                        updatedAt: new Date(),
                        updatedBy: admin.id,
                        snapshot: {
                            title: `Rollback Candidate ${suffix}`,
                            type: 'syllabus',
                            category: 'Education',
                            organization: 'State Board',
                            content: 'Historical published snapshot.',
                            status: 'published',
                            isActive: true,
                            publishAt: new Date(),
                        },
                    }],
                },
            }
        );

        const stepUpToken = await issueStepUp({
            email: admin.email,
            password,
            cookies: session.cookies,
            csrfToken: session.csrfToken,
        });

        const rollbackAttempt = await request(app)
            .post(`/api/admin/announcements/${announcementId}/rollback`)
            .set('Cookie', session.cookies)
            .set('X-CSRF-Token', session.csrfToken)
            .set('X-Admin-Step-Up-Token', stepUpToken)
            .send({ version: 1 });

        if (config.adminDualApprovalRequired) {
            expect(rollbackAttempt.status).toBe(202);
            expect(rollbackAttempt.body?.error).toBe('approval_required');
        } else {
            expect(rollbackAttempt.status).toBe(200);
            expect(rollbackAttempt.body?.data?.status).toBe('published');
        }
    });
});
