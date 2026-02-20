import type { Page, Route } from '@playwright/test';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface AdminMockOptions {
    authenticated?: boolean;
}

const defaultAnnouncements = [
    {
        id: 'ann-100',
        title: 'Assistant Clerk Recruitment 2026',
        status: 'published',
        type: 'job',
        updatedAt: '2026-02-10T10:00:00.000Z',
        updatedBy: 'ops-admin@sarkariexams.me',
    },
    {
        id: 'ann-p-1',
        title: 'Revenue Inspector Pending Verification',
        status: 'pending',
        type: 'job',
        updatedAt: '2026-02-09T10:00:00.000Z',
        updatedBy: 'reviewer@sarkariexams.me',
    },
    {
        id: 'ann-s-1',
        title: 'Forest Guard Schedule Batch',
        status: 'scheduled',
        type: 'job',
        updatedAt: '2026-02-08T10:00:00.000Z',
        updatedBy: 'scheduler@sarkariexams.me',
    },
];

const defaultSessions = [
    {
        id: 'sess-current',
        device: 'MacBook Pro',
        browser: 'Chrome 132',
        os: 'macOS',
        ip: '10.20.30.40',
        riskScore: 'low',
        lastActivity: '2026-02-12T11:00:00.000Z',
        isCurrentSession: true,
        email: 'admin@sarkariexams.me',
    },
    {
        id: 'sess-risky',
        device: 'Windows Desktop',
        browser: 'Edge 131',
        os: 'Windows 11',
        ip: '44.18.200.10',
        riskScore: 'high',
        lastActivity: '2026-02-12T10:45:00.000Z',
        isCurrentSession: false,
        email: 'admin@sarkariexams.me',
    },
];

const defaultApprovals = [
    {
        id: 'approval-1',
        action: 'publish_announcement',
        status: 'pending',
        requestedBy: 'editor@sarkariexams.me',
        requestedAt: '2026-02-12T09:40:00.000Z',
    },
];

const defaultSecurityLogs = [
    {
        id: 'sec-1',
        eventType: 'login_success',
        endpoint: '/api/admin-auth/login',
        ipAddress: '44.18.200.10',
        createdAt: '2026-02-12T10:00:00.000Z',
    },
];

const defaultAuditLogs = [
    {
        id: 'aud-1',
        action: 'admin_announcement_update',
        actorEmail: 'admin@sarkariexams.me',
        createdAt: '2026-02-12T10:12:00.000Z',
    },
];

const defaultErrorReports = [
    {
        id: 'err-1',
        errorId: 'frontend-timeout-1',
        message: 'Request timeout while fetching announcements',
        status: 'new',
        pageUrl: '/admin/announcements',
        createdAt: '2026-02-12T08:22:00.000Z',
    },
];

const defaultCommunityFlags = [
    {
        id: 'flag-1',
        entityType: 'forum',
        entityId: 'forum-100',
        reason: 'Spam links',
        reporter: 'user@sarkariexams.me',
        status: 'open',
        createdAt: '2026-02-12T08:10:00.000Z',
    },
];

const defaultCommunityForums = [
    {
        id: 'forum-100',
        title: 'Railway Group D Discussion',
        category: 'Railway',
        author: 'mentor@sarkariexams.me',
        createdAt: '2026-02-01T08:00:00.000Z',
    },
];

const defaultCommunityQa = [
    {
        id: 'qa-1',
        question: 'How to prepare for SSC CGL tier 1?',
        author: 'aspirant@sarkariexams.me',
        answeredBy: 'mentor@sarkariexams.me',
        createdAt: '2026-02-03T09:00:00.000Z',
    },
];

const defaultCommunityGroups = [
    {
        id: 'group-1',
        name: 'Banking Batch 2026',
        topic: 'Banking',
        language: 'English',
        createdAt: '2026-02-05T08:00:00.000Z',
    },
];

const okJson = (data: JsonValue, headers: Record<string, string> = {}) => ({
    status: 200,
    contentType: 'application/json',
    headers,
    body: JSON.stringify({ success: true, data }),
});

function parseBody(route: Route): Record<string, unknown> {
    const raw = route.request().postData();
    if (!raw) return {};
    try {
        return JSON.parse(raw) as Record<string, unknown>;
    } catch {
        return {};
    }
}

function announcementsForStatus(status: string | null) {
    if (status === 'pending') return defaultAnnouncements.filter((item) => item.status === 'pending');
    if (status === 'scheduled') return defaultAnnouncements.filter((item) => item.status === 'scheduled');
    return defaultAnnouncements;
}

export async function seedCsrfCookie(page: Page) {
    await page.context().addCookies([
        {
            name: 'csrf_token',
            value: 'playwright-csrf-token',
            url: 'http://127.0.0.1:4174',
        },
    ]);
}

export async function mockAdminApi(page: Page, options: AdminMockOptions = {}) {
    const authenticated = options.authenticated ?? true;
    await seedCsrfCookie(page);

    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const method = request.method().toUpperCase();
        const url = new URL(request.url());
        const { pathname, searchParams } = url;

        if (!pathname.startsWith('/api/')) {
            await route.continue();
            return;
        }

        if (pathname === '/api/auth/csrf' && method === 'GET') {
            await route.fulfill(okJson({ csrfToken: 'playwright-csrf-token' }, {
                'set-cookie': 'csrf_token=playwright-csrf-token; Path=/; SameSite=Lax',
            }));
            return;
        }

        if (pathname === '/api/admin-auth/me' && method === 'GET') {
            await route.fulfill(okJson({
                user: authenticated
                    ? { id: 'admin-user-1', email: 'admin@sarkariexams.me', role: 'admin' }
                    : null,
            }));
            return;
        }

        if (pathname === '/api/admin-auth/permissions' && method === 'GET') {
            await route.fulfill(okJson({
                role: 'admin',
                permissions: ['*'],
            }));
            return;
        }

        if (pathname === '/api/admin-auth/login' && method === 'POST') {
            await route.fulfill(okJson({ success: true }));
            return;
        }

        if (pathname === '/api/admin-auth/logout' && method === 'POST') {
            await route.fulfill(okJson({ success: true }));
            return;
        }

        if (pathname === '/api/admin-auth/step-up' && method === 'POST') {
            await route.fulfill(okJson({
                token: 'step-up-token',
                expiresAt: '2099-12-31T23:59:59.000Z',
            }));
            return;
        }

        if (pathname === '/api/admin-auth/sessions/terminate' && method === 'POST') {
            await route.fulfill(okJson({ success: true }));
            return;
        }

        if (pathname === '/api/admin-auth/sessions/terminate-others' && method === 'POST') {
            await route.fulfill(okJson({ success: true, removed: 2 }));
            return;
        }

        if (pathname === '/api/admin/dashboard' && method === 'GET') {
            await route.fulfill(okJson({
                totalAnnouncements: 128,
                pendingReview: 17,
                activeSessions: 5,
                highRiskEvents: 2,
            }));
            return;
        }

        if (pathname === '/api/admin/announcements' && method === 'GET') {
            await route.fulfill(okJson(announcementsForStatus(searchParams.get('status'))));
            return;
        }

        if (pathname === '/api/admin/review/preview' && method === 'POST') {
            const body = parseBody(route);
            const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === 'string') : [];
            await route.fulfill(okJson({
                eligibleIds: ids,
                blockedIds: [],
                warnings: ids.length > 0 ? ['Dry run preview only in Playwright mock mode.'] : [],
            }));
            return;
        }

        if (pathname === '/api/admin/announcements/bulk/preview' && method === 'POST') {
            const body = parseBody(route);
            const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === 'string') : [];
            await route.fulfill(okJson({
                totalTargets: ids.length,
                affectedByStatus: {
                    draft: ids.length,
                },
                warnings: ids.length > 1 ? ['Some IDs already match target status.'] : [],
                missingIds: [],
            }));
            return;
        }

        if (pathname === '/api/admin/announcements/bulk-approve' && method === 'POST') {
            await route.fulfill(okJson({ updated: 1 }));
            return;
        }

        if (pathname === '/api/admin/announcements/bulk-reject' && method === 'POST') {
            await route.fulfill(okJson({ updated: 1 }));
            return;
        }

        if (pathname === '/api/admin/announcements/bulk' && method === 'POST') {
            await route.fulfill(okJson({ updated: 2 }));
            return;
        }

        if (/^\/api\/admin\/announcements\/[^/]+$/.test(pathname) && method === 'PUT') {
            await route.fulfill(okJson({ id: pathname.split('/').pop() || 'ann-100', status: 'draft' }));
            return;
        }

        if (pathname === '/api/admin/approvals' && method === 'GET') {
            await route.fulfill(okJson(defaultApprovals));
            return;
        }

        if (/^\/api\/admin\/approvals\/[^/]+\/approve$/.test(pathname) && method === 'POST') {
            await route.fulfill(okJson({ id: 'approval-1', status: 'approved' }));
            return;
        }

        if (/^\/api\/admin\/approvals\/[^/]+\/reject$/.test(pathname) && method === 'POST') {
            await route.fulfill(okJson({ id: 'approval-1', status: 'rejected' }));
            return;
        }

        if (pathname === '/api/admin/sessions' && method === 'GET') {
            await route.fulfill(okJson(defaultSessions));
            return;
        }

        if (pathname === '/api/admin/security' && method === 'GET') {
            await route.fulfill(okJson(defaultSecurityLogs));
            return;
        }

        if (pathname === '/api/admin/audit-log' && method === 'GET') {
            await route.fulfill(okJson(defaultAuditLogs));
            return;
        }

        if (pathname === '/api/admin/audit-log/integrity' && method === 'GET') {
            await route.fulfill(okJson({ status: 'verified' }));
            return;
        }

        if (pathname === '/api/support/error-reports' && method === 'GET') {
            await route.fulfill(okJson(defaultErrorReports));
            return;
        }

        if (/^\/api\/support\/error-reports\/[^/]+$/.test(pathname) && method === 'PATCH') {
            await route.fulfill(okJson({ id: pathname.split('/').pop() || 'err-1', status: 'triaged' }));
            return;
        }

        if (pathname === '/api/community/flags' && method === 'GET') {
            await route.fulfill(okJson(defaultCommunityFlags));
            return;
        }

        if (pathname === '/api/community/forums' && method === 'GET') {
            await route.fulfill(okJson(defaultCommunityForums));
            return;
        }

        if (pathname === '/api/community/qa' && method === 'GET') {
            await route.fulfill(okJson(defaultCommunityQa));
            return;
        }

        if (pathname === '/api/community/groups' && method === 'GET') {
            await route.fulfill(okJson(defaultCommunityGroups));
            return;
        }

        if (/^\/api\/community\/flags\/[^/]+$/.test(pathname) && method === 'DELETE') {
            await route.fulfill(okJson({ success: true }));
            return;
        }

        if (pathname === '/api/analytics/overview' && method === 'GET') {
            await route.fulfill(okJson({
                totals: {
                    views: 1000,
                    clicks: 220,
                },
            }));
            return;
        }

        if (pathname === '/api/admin/telemetry/events' && method === 'POST') {
            await route.fulfill(okJson({ queued: true }));
            return;
        }

        if (pathname === '/api/admin/views' && method === 'GET') {
            await route.fulfill(okJson([{ id: 'mock-preset-id', name: 'Saved Preset' }]));
            return;
        }

        if (pathname === '/api/admin/views' && method === 'POST') {
            await route.fulfill(okJson({ id: 'mock-preset-id', name: 'Saved Preset' }));
            return;
        }

        await route.fulfill(okJson({}));
    });
}
