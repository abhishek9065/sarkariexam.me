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

const DASH_TS = '2026-02-12T11:30:00.000Z';

function buildWidget(input: {
    id: string;
    title: string;
    description: string;
    kind: 'metrics' | 'list' | 'traffic' | 'actions';
    source: string;
    status: 'ready' | 'empty' | 'forbidden' | 'error';
    emptyState: { title: string; description: string };
    data: JsonValue | null;
    message?: string;
    permission?: string;
    drilldown?: string;
}) {
    return {
        ...input,
        updatedAt: DASH_TS,
        stale: false,
    };
}

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

function buildDashboardSnapshot() {
    return {
        generatedAt: DASH_TS,
        displayName: 'admin',
        role: 'admin',
        permissions: {
            adminRead: true,
            adminWrite: true,
            analyticsRead: true,
            announcementsRead: true,
            announcementsWrite: true,
            announcementsApprove: true,
            auditRead: true,
            securityRead: true,
        },
        focus: {
            eyebrow: 'Admin Control',
            title: 'Own incidents, routing, and access drift first.',
            description: 'Start with critical alerts, risky sessions, and role-impacting changes before moving into content operations.',
            primaryAction: { id: 'focus-security', label: 'Open Security', route: '/security', tone: 'danger' },
            secondaryAction: { id: 'focus-access', label: 'Users & Roles', route: '/users-roles', tone: 'subtle' },
        },
        sections: [
            {
                id: 'my-work',
                title: 'My Work',
                description: 'Assigned queue, pending approvals, my deadlines, and my recent changes.',
                widgetIds: ['my-queue', 'pending-approvals', 'my-deadlines', 'recent-changes'],
            },
            {
                id: 'system-health',
                title: 'System Health',
                description: 'Alerts, security, audit, and platform signals.',
                widgetIds: ['alerts', 'security', 'audit', 'traffic', 'top-content'],
            },
        ],
        widgets: {
            summary: buildWidget({
                id: 'summary',
                title: 'Operations Snapshot',
                description: 'Current content, audience, and platform totals.',
                kind: 'metrics',
                source: 'mixed',
                status: 'ready',
                emptyState: { title: 'Overview unavailable', description: 'Summary metrics are unavailable for this role.' },
                data: {
                    metrics: [
                        { key: 'total-posts', label: 'Total Posts', value: 128, route: '/manage-posts' },
                        { key: 'published', label: 'Published', value: 92, route: '/manage-posts?status=published', tone: 'success' },
                        { key: 'pending-review', label: 'Pending Review', value: 17, route: '/review', tone: 'warning' },
                        { key: 'views', label: 'Total Views', value: 6400, route: '/reports' },
                        { key: 'active-users', label: 'Active Users', value: 24, route: '/users-roles' },
                        { key: 'subscribers', label: 'Subscribers', value: 512, route: '/reports' },
                    ],
                },
            }),
            'my-queue': buildWidget({
                id: 'my-queue',
                title: 'My Queue',
                description: 'Assigned queue and review pressure tied to your account.',
                kind: 'metrics',
                source: 'announcements',
                status: 'ready',
                emptyState: { title: 'Queue is clear', description: 'No assigned or pending queue work right now.' },
                drilldown: '/queue?assignee=me',
                data: {
                    metrics: [
                        { key: 'pending-review', label: 'Pending Reviews', value: 17, route: '/review', tone: 'warning' },
                        { key: 'unassigned', label: 'Unassigned Pending Reviews', value: 6, route: '/review?status=pending&assignee=unassigned', tone: 'warning' },
                        { key: 'overdue', label: 'Overdue Review Items', value: 3, route: '/review?status=pending&sla=overdue', tone: 'danger' },
                        { key: 'assigned', label: 'My Queue', value: 4, route: '/queue?assignee=me', tone: 'info' },
                        { key: 'broken-links', label: 'Broken Links', value: 3, route: '/link-manager', tone: 'danger' },
                    ],
                },
            }),
            'pending-approvals': buildWidget({
                id: 'pending-approvals',
                title: 'Pending Approvals',
                description: 'Approval load, expiry pressure, and execution backlog.',
                kind: 'metrics',
                source: 'admin_approval_requests',
                status: 'ready',
                emptyState: { title: 'Approvals are clear', description: 'No approval backlog is waiting on this role.' },
                drilldown: '/approvals',
                data: {
                    metrics: [
                        { key: 'pending', label: 'Pending', value: 2, route: '/approvals?status=pending', tone: 'warning' },
                        { key: 'approved', label: 'Approved Pending Execution', value: 1, route: '/approvals?status=approved', tone: 'info' },
                        { key: 'overdue', label: 'Overdue', value: 1, route: '/approvals', tone: 'danger' },
                        { key: 'due-soon', label: 'Due Soon', value: 1, route: '/approvals', tone: 'warning' },
                    ],
                },
            }),
            'my-deadlines': buildWidget({
                id: 'my-deadlines',
                title: 'My Deadlines',
                description: 'Upcoming deadlines for content already assigned to you.',
                kind: 'list',
                source: 'announcements',
                status: 'ready',
                emptyState: { title: 'No deadlines due', description: 'No assigned deadlines are due in the next 7 days.' },
                data: {
                    items: [
                        {
                            id: 'ann-100',
                            title: 'Assistant Clerk Recruitment 2026',
                            subtitle: 'SSC',
                            meta: 'Published',
                            route: '/detailed-post?focus=ann-100',
                            timestamp: '2026-02-14T00:00:00.000Z',
                        },
                    ],
                },
            }),
            'recent-changes': buildWidget({
                id: 'recent-changes',
                title: 'My Recent Changes',
                description: 'Your latest content and administrative changes.',
                kind: 'list',
                source: 'announcements',
                status: 'ready',
                emptyState: { title: 'No recent changes', description: 'Your recent changes will appear here after the next update.' },
                data: {
                    items: defaultAuditLogs.map((item) => ({
                        id: item.id,
                        title: 'Announcement Update',
                        subtitle: item.actorEmail,
                        meta: 'Pending',
                        route: '/manage-posts',
                        timestamp: item.createdAt,
                    })),
                },
            }),
            alerts: buildWidget({
                id: 'alerts',
                title: 'Alerts',
                description: 'Open alerts, critical issues, and unresolved errors.',
                kind: 'metrics',
                source: 'mixed',
                status: 'ready',
                emptyState: { title: 'No active alerts', description: 'There are no open alerts or unresolved error spikes right now.' },
                drilldown: '/alerts',
                data: {
                    metrics: [
                        { key: 'open-alerts', label: 'Open Alerts', value: 2, route: '/alerts', tone: 'warning' },
                        { key: 'critical-alerts', label: 'Critical Alerts', value: 1, route: '/alerts?status=open&severity=critical', tone: 'danger' },
                        { key: 'unresolved-errors', label: 'Unresolved Errors', value: 1, route: '/errors', tone: 'warning' },
                    ],
                },
            }),
            security: buildWidget({
                id: 'security',
                title: 'Security',
                description: 'Risky sessions and blocked or suspicious activity.',
                kind: 'metrics',
                source: 'security_logs',
                status: 'ready',
                emptyState: { title: 'Security is calm', description: 'No active session anomalies or blocked events were detected.' },
                drilldown: '/security',
                data: {
                    metrics: [
                        { key: 'high-risk', label: 'High-risk Sessions', value: 1, route: '/security?risk=high', tone: 'danger' },
                        { key: 'blocked', label: 'Blocked Requests', value: 1, route: '/security', tone: 'warning' },
                        { key: 'failed-auth', label: 'Failed Auth Events', value: 2, route: '/security', tone: 'warning' },
                        { key: 'events', label: 'Recent Security Events', value: 4, route: '/sessions', tone: 'info' },
                    ],
                },
            }),
            audit: buildWidget({
                id: 'audit',
                title: 'Audit Activity',
                description: 'Recent administrative actions across the control plane.',
                kind: 'list',
                source: 'admin_audit_logs',
                status: 'ready',
                emptyState: { title: 'No audit activity', description: 'Administrative activity will appear here as actions are recorded.' },
                drilldown: '/audit',
                data: {
                    items: defaultAuditLogs.map((item) => ({
                        id: item.id,
                        title: 'Announcement Update',
                        subtitle: item.actorEmail,
                        meta: 'Assistant Clerk Recruitment 2026',
                        route: '/audit',
                        timestamp: item.createdAt,
                    })),
                },
            }),
            traffic: buildWidget({
                id: 'traffic',
                title: 'Traffic Overview',
                description: 'Seven-day traffic and source mix for the public platform.',
                kind: 'traffic',
                source: 'analytics_rollups',
                status: 'ready',
                emptyState: { title: 'No traffic data yet', description: 'Traffic charts will populate after announcement views are recorded.' },
                drilldown: '/analytics',
                data: {
                    totalVisits: 420,
                    series: [
                        { date: '2026-02-06', views: 30 },
                        { date: '2026-02-07', views: 45 },
                        { date: '2026-02-08', views: 60 },
                        { date: '2026-02-09', views: 75 },
                        { date: '2026-02-10', views: 90 },
                        { date: '2026-02-11', views: 45 },
                        { date: '2026-02-12', views: 75 },
                    ],
                    sources: [
                        { source: 'seo', label: 'Organic', views: 252, percentage: 60 },
                        { source: 'direct', label: 'Direct', views: 105, percentage: 25 },
                        { source: 'referral', label: 'Referral', views: 42, percentage: 10 },
                        { source: 'social', label: 'Social', views: 21, percentage: 5 },
                    ],
                },
            }),
            'top-content': buildWidget({
                id: 'top-content',
                title: 'Top Content',
                description: 'Most-viewed announcements in the last 24 hours.',
                kind: 'list',
                source: 'announcement_views',
                status: 'ready',
                emptyState: { title: 'No viewed posts yet', description: 'Top content will appear after public traffic events are recorded.' },
                drilldown: '/analytics',
                data: {
                    items: [
                        {
                            id: 'ann-100',
                            title: 'Assistant Clerk Recruitment 2026',
                            subtitle: 'SSC',
                            meta: '42 views',
                            route: '/detailed-post?focus=ann-100',
                        },
                    ],
                },
            }),
            'quick-actions': buildWidget({
                id: 'quick-actions',
                title: 'Quick Actions',
                description: 'Only modules this role can successfully open are shown here.',
                kind: 'actions',
                source: 'modules',
                status: 'ready',
                emptyState: { title: 'No actions available', description: 'No quick actions are currently available for this role.' },
                data: {
                    items: [
                        { id: 'create-post', label: 'New Post', route: '/create-post', description: 'Open the unified content create flow.' },
                        { id: 'manage-posts', label: 'Manage Posts', route: '/manage-posts', description: 'Open the post operations table.' },
                        { id: 'review', label: 'Review Queue', route: '/review', description: 'Process pending review items.' },
                        { id: 'alerts', label: 'Alerts', route: '/alerts', description: 'Open the operational alert feed.' },
                    ],
                },
            }),
        },
    };
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
            await route.fulfill(okJson(buildDashboardSnapshot()));
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
