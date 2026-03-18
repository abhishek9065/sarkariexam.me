import { expect, test } from '@playwright/test';

const adminBasename = process.env.VITE_ADMIN_BASENAME || '/admin-vnext';
const escapedAdminBasename = adminBasename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const jsonResponse = (data: unknown) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data }),
});

const DASH_TS = '2026-03-07T08:30:00.000Z';

function buildWidget<T>(input: {
    id: string;
    title: string;
    description: string;
    kind: 'metrics' | 'list' | 'traffic' | 'actions';
    source: string;
    status: 'ready' | 'empty' | 'forbidden' | 'error';
    emptyState: { title: string; description: string };
    data: T | null;
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

function buildDashboardSnapshot(input: {
    me?: Record<string, unknown>;
    reports?: Record<string, unknown>;
    auditLogs?: Array<Record<string, unknown>>;
    securityLogs?: Array<Record<string, unknown>>;
    errorReports?: Array<Record<string, unknown>>;
} = {}) {
    const role = typeof input.me?.role === 'string' ? input.me.role : 'admin';
    const reports = {
        summary: {
            totalPosts: 128,
            pendingDrafts: 12,
            scheduled: 5,
            pendingReview: 17,
            brokenLinks: 3,
            expired: 9,
        },
        mostViewed24h: [],
        upcomingDeadlines: [],
        trafficSeries: [
            { date: '2026-03-01', views: 30 },
            { date: '2026-03-02', views: 45 },
            { date: '2026-03-03', views: 60 },
            { date: '2026-03-04', views: 75 },
            { date: '2026-03-05', views: 90 },
            { date: '2026-03-06', views: 105 },
            { date: '2026-03-07', views: 120 },
        ],
        trafficSources: [
            { source: 'seo', label: 'Organic', views: 60, percentage: 60 },
            { source: 'direct', label: 'Direct', views: 25, percentage: 25 },
            { source: 'referral', label: 'Referral', views: 10, percentage: 10 },
            { source: 'social', label: 'Social', views: 5, percentage: 5 },
        ],
        workflowSummary: {
            unassignedPendingReview: 6,
            overdueReviewItems: 3,
            currentUserAssignedQueue: 4,
        },
        incidentSummary: {
            unresolvedErrorReports: 5,
            highRiskSessions: 2,
            openCriticalAlerts: 1,
        },
        ...input.reports,
    };
    const auditLogs = input.auditLogs ?? [
        {
            id: 'audit-1',
            action: 'update',
            announcementId: 'ann-42',
            title: 'SSC CGL Recruitment 2026',
            actorEmail: 'admin@sarkariexams.me',
            createdAt: '2026-03-07T08:00:00.000Z',
        },
    ];
    const securityLogs = input.securityLogs ?? [
        {
            id: '101',
            eventType: 'admin_security_alert',
            createdAt: '2026-03-07T08:00:00.000Z',
        },
    ];
    const errorReports = input.errorReports ?? [
        {
            id: 'err-1',
            status: 'new',
            createdAt: '2026-03-07T08:00:00.000Z',
        },
    ];

    const totalVisits = Array.isArray(reports.trafficSeries)
        ? reports.trafficSeries.reduce((sum, item) => sum + Number((item as { views?: number }).views ?? 0), 0)
        : 0;
    const trafficEmpty = totalVisits === 0
        && Array.isArray(reports.trafficSources)
        && reports.trafficSources.length === 0
        && Array.isArray(reports.mostViewed24h)
        && reports.mostViewed24h.length === 0;

    return {
        generatedAt: DASH_TS,
        displayName: 'admin',
        role,
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
            eyebrow: role === 'admin' ? 'Admin Control' : 'Dashboard',
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
                        { key: 'total-posts', label: 'Total Posts', value: reports.summary.totalPosts, route: '/manage-posts' },
                        { key: 'published', label: 'Published', value: 92, route: '/manage-posts?status=published', tone: 'success' },
                        { key: 'pending-review', label: 'Pending Review', value: reports.summary.pendingReview, route: '/review', tone: 'warning' },
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
                        { key: 'pending-review', label: 'Pending Reviews', value: reports.summary.pendingReview, route: '/review', tone: 'warning' },
                        { key: 'unassigned', label: 'Unassigned Pending Reviews', value: reports.workflowSummary.unassignedPendingReview, route: '/review?status=pending&assignee=unassigned', tone: 'warning' },
                        { key: 'overdue', label: 'Overdue Review Items', value: reports.workflowSummary.overdueReviewItems, route: '/review?status=pending&sla=overdue', tone: 'danger' },
                        { key: 'assigned', label: 'My Queue', value: reports.workflowSummary.currentUserAssignedQueue, route: '/queue?assignee=me', tone: 'info' },
                        { key: 'broken-links', label: 'Broken Links', value: reports.summary.brokenLinks, route: '/link-manager', tone: 'danger' },
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
                        { key: 'pending', label: 'Pending', value: 3, route: '/approvals?status=pending', tone: 'warning' },
                        { key: 'approved', label: 'Approved Pending Execution', value: 1, route: '/approvals?status=approved', tone: 'info' },
                        { key: 'overdue', label: 'Overdue', value: 1, route: '/approvals', tone: 'danger' },
                        { key: 'due-soon', label: 'Due Soon', value: 2, route: '/approvals', tone: 'warning' },
                    ],
                },
            }),
            'my-deadlines': buildWidget({
                id: 'my-deadlines',
                title: 'My Deadlines',
                description: 'Upcoming deadlines for content already assigned to you.',
                kind: 'list',
                source: 'announcements',
                status: Array.isArray(reports.upcomingDeadlines) && reports.upcomingDeadlines.length > 0 ? 'ready' : 'empty',
                emptyState: { title: 'No deadlines due', description: 'No assigned deadlines are due in the next 7 days.' },
                data: {
                    items: (reports.upcomingDeadlines ?? []).map((item: any) => ({
                        id: String(item.id ?? 'ann-1'),
                        title: String(item.title ?? 'Deadline item'),
                        subtitle: String(item.organization ?? item.type ?? 'Announcement'),
                        meta: 'Pending',
                        route: `/detailed-post?focus=${encodeURIComponent(String(item.id ?? 'ann-1'))}`,
                        timestamp: String(item.deadline ?? DASH_TS),
                    })),
                },
                message: Array.isArray(reports.upcomingDeadlines) && reports.upcomingDeadlines.length > 0 ? undefined : 'No assigned deadlines are due in the next 7 days.',
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
                    items: auditLogs.map((item) => ({
                        id: String(item.id ?? 'audit-1'),
                        title: String(item.title ?? 'Announcement Update'),
                        subtitle: String(item.actorEmail ?? 'admin@sarkariexams.me'),
                        meta: 'Pending',
                        route: '/manage-posts',
                        timestamp: String(item.createdAt ?? DASH_TS),
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
                        { key: 'open-alerts', label: 'Open Alerts', value: reports.incidentSummary.openCriticalAlerts, route: '/alerts', tone: 'warning' },
                        { key: 'critical-alerts', label: 'Critical Alerts', value: reports.incidentSummary.openCriticalAlerts, route: '/alerts?status=open&severity=critical', tone: 'danger' },
                        { key: 'unresolved-errors', label: 'Unresolved Errors', value: errorReports.length, route: '/errors', tone: 'warning' },
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
                        { key: 'high-risk', label: 'High-risk Sessions', value: securityLogs.length, route: '/security?risk=high', tone: 'danger' },
                        { key: 'blocked', label: 'Blocked Requests', value: 1, route: '/security', tone: 'warning' },
                        { key: 'failed-auth', label: 'Failed Auth Events', value: 2, route: '/security', tone: 'warning' },
                        { key: 'events', label: 'Recent Security Events', value: securityLogs.length, route: '/sessions', tone: 'info' },
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
                    items: auditLogs.map((item) => ({
                        id: String(item.id ?? 'audit-1'),
                        title: 'Announcement Update',
                        subtitle: String(item.actorEmail ?? 'admin@sarkariexams.me'),
                        meta: String(item.title ?? 'Audit entry'),
                        route: '/audit',
                        timestamp: String(item.createdAt ?? DASH_TS),
                    })),
                },
            }),
            traffic: buildWidget({
                id: 'traffic',
                title: 'Traffic Overview',
                description: 'Seven-day traffic and source mix for the public platform.',
                kind: 'traffic',
                source: 'analytics_rollups',
                status: trafficEmpty ? 'empty' : 'ready',
                emptyState: { title: 'No traffic data yet', description: 'Traffic charts will populate after announcement views are recorded.' },
                drilldown: '/analytics',
                data: trafficEmpty
                    ? { totalVisits: 0, series: [], sources: [] }
                    : { totalVisits, series: reports.trafficSeries, sources: reports.trafficSources },
                message: trafficEmpty ? 'Traffic charts will populate after announcement views are recorded.' : undefined,
            }),
            'top-content': buildWidget({
                id: 'top-content',
                title: 'Top Content',
                description: 'Most-viewed announcements in the last 24 hours.',
                kind: 'list',
                source: 'announcement_views',
                status: Array.isArray(reports.mostViewed24h) && reports.mostViewed24h.length > 0 ? 'ready' : 'empty',
                emptyState: { title: 'No viewed posts yet', description: 'Top content will appear after public traffic events are recorded.' },
                drilldown: '/analytics',
                data: {
                    items: (reports.mostViewed24h ?? []).map((item: any) => ({
                        id: String(item.id ?? 'a-1'),
                        title: String(item.title ?? 'Top content item'),
                        subtitle: String(item.organization ?? item.type ?? 'Announcement'),
                        meta: `${String(item.views ?? 0)} views`,
                        route: `/detailed-post?focus=${encodeURIComponent(String(item.id ?? 'a-1'))}`,
                    })),
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

async function mockUnauthenticatedAdmin(page: import('@playwright/test').Page) {
    await page.route('**/api/auth/csrf', async (route) => {
        await route.fulfill(jsonResponse({ csrfToken: 'test-csrf-token' }));
    });

    await page.route('**/api/admin-auth/me', async (route) => {
        await route.fulfill(jsonResponse({ user: null }));
    });

    await page.route('**/api/admin-auth/permissions', async (route) => {
        await route.fulfill(jsonResponse(null));
    });
}

async function mockAuthenticatedAdmin(
    page: import('@playwright/test').Page,
    overrides: {
        me?: Record<string, unknown>;
        reports?: Record<string, unknown>;
        auditLogs?: Array<Record<string, unknown>>;
        announcements?: Array<Record<string, unknown>>;
        users?: Array<Record<string, unknown>>;
        securityLogs?: Array<Record<string, unknown>>;
        errorReports?: Array<Record<string, unknown>>;
        sessions?: Array<Record<string, unknown>>;
    } = {},
) {
    const adminMe = {
        id: 'admin-user-1',
        email: 'admin@sarkariexams.me',
        username: 'admin',
        role: 'admin',
        twoFactorEnabled: true,
        ...(overrides.me ?? {}),
    };
    const securityLogsState = [...(overrides.securityLogs ?? [
        {
            id: '101',
            eventType: 'admin_security_alert',
            endpoint: '/api/auth/admin/login',
            ipAddress: '127.0.0.1',
            incidentStatus: 'new',
            assigneeEmail: null,
            note: '',
            createdAt: '2026-03-07T08:00:00.000Z',
            metadata: {
                email: 'admin@sarkariexams.me',
                device: 'Desktop',
                browser: 'Chrome',
                os: 'Windows',
                sessionId: 'session-high',
                reason: 'new_device_login',
            },
        },
    ])];
    const errorReportsState = [...(overrides.errorReports ?? [
        {
            id: 'err-1',
            errorId: 'frontend_error_boundary',
            message: 'Boundary caught render failure',
            pageUrl: 'https://example.com/result/ssc-cgl',
            userEmail: 'candidate@example.com',
            note: 'Clicked share button before crash',
            status: 'new',
            assigneeEmail: 'admin@sarkariexams.me',
            adminNote: 'Needs route-level repro',
            release: 'web@1.2.3',
            requestId: 'req-123',
            stack: 'Error: boundary failure\\n    at DetailPage.tsx:41:13',
            componentStack: 'at DetailPage\\n    at ErrorBoundary',
            sentryEventUrl: 'https://example.sentry.io/issues/1',
            createdAt: '2026-03-07T08:00:00.000Z',
        },
    ])];

    await page.route('**/api/auth/csrf', async (route) => {
        await route.fulfill(jsonResponse({ csrfToken: 'test-csrf-token' }));
    });

    await page.route('**/api/admin-auth/me', async (route) => {
        await route.fulfill(jsonResponse({
            user: adminMe,
        }));
    });

    await page.route('**/api/admin-auth/permissions', async (route) => {
        await route.fulfill(jsonResponse({
            role: 'admin',
            permissions: ['*'],
        }));
    });

    await page.route('**/api/admin/dashboard', async (route) => {
        await route.fulfill(jsonResponse(buildDashboardSnapshot({
            me: adminMe,
            reports: overrides.reports,
            auditLogs: overrides.auditLogs,
            securityLogs: overrides.securityLogs,
            errorReports: overrides.errorReports,
        })));
    });

    await page.route('**/api/admin/reports', async (route) => {
        await route.fulfill(jsonResponse({
            summary: {
                totalPosts: 128,
                pendingDrafts: 12,
                scheduled: 5,
                pendingReview: 17,
                brokenLinks: 3,
                expired: 9,
            },
            mostViewed24h: [],
            upcomingDeadlines: [],
            trafficSeries: [
                { date: '2026-03-01', views: 30 },
                { date: '2026-03-02', views: 45 },
                { date: '2026-03-03', views: 60 },
                { date: '2026-03-04', views: 75 },
                { date: '2026-03-05', views: 90 },
                { date: '2026-03-06', views: 105 },
                { date: '2026-03-07', views: 120 },
            ],
            trafficSources: [
                { source: 'seo', label: 'Organic', views: 60, percentage: 60 },
                { source: 'direct', label: 'Direct', views: 25, percentage: 25 },
                { source: 'referral', label: 'Referral', views: 10, percentage: 10 },
                { source: 'social', label: 'Social', views: 5, percentage: 5 },
            ],
            brokenLinkItems: [],
            workflowSummary: {
                unassignedPendingReview: 6,
                overdueReviewItems: 3,
                currentUserAssignedQueue: 4,
            },
            incidentSummary: {
                unresolvedErrorReports: 5,
                highRiskSessions: 2,
                openCriticalAlerts: 1,
            },
            drilldowns: [
                { key: 'unassigned-pending', label: 'Unassigned pending reviews', count: 6, route: '/review?status=pending&assignee=unassigned', tone: 'warning' },
                { key: 'overdue-review', label: 'Overdue review items', count: 3, route: '/review?status=pending&sla=overdue', tone: 'danger' },
            ],
            ...overrides.reports,
        }));
    });

    await page.route('**/api/admin/alerts**', async (route) => {
        await route.fulfill(jsonResponse([]));
    });

    await page.route('**/api/admin/announcements**', async (route) => {
        if (route.request().method() === 'POST') {
            await route.fulfill(jsonResponse({
                id: 'draft-duplicate-1',
                title: 'SSC CGL Recruitment 2026 Copy',
                type: 'job',
                status: 'draft',
            }));
            return;
        }
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: overrides.announcements ?? [],
                meta: {
                    total: (overrides.announcements ?? []).length,
                    limit: 40,
                    offset: 0,
                },
            }),
        });
    });

    await page.route('**/api/admin/templates**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: [],
                meta: { total: 0, limit: 50, offset: 0 },
            }),
        });
    });

    await page.route('**/api/admin/views**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: [],
                meta: { total: 0, limit: 100, offset: 0 },
            }),
        });
    });

    await page.route('**/api/admin/telemetry/events', async (route) => {
        await route.fulfill(jsonResponse({ ok: true }));
    });

    await page.route('**/api/admin/announcements/*/revisions**', async (route) => {
        await route.fulfill(jsonResponse({
            announcementId: 'ann-1',
            currentVersion: 4,
            currentUpdatedAt: '2026-03-08T08:00:00.000Z',
            revisions: [
                {
                    version: 3,
                    updatedAt: '2026-03-07T08:00:00.000Z',
                    updatedBy: 'admin@sarkariexams.me',
                    note: 'Published with SEO update',
                    changedKeys: ['status', 'publishAt', 'seo'],
                    snapshot: {
                        title: 'SSC CGL Recruitment 2026',
                        category: 'Latest Jobs',
                        organization: 'SSC',
                        status: 'published',
                        content: 'Previous published content',
                        externalLink: 'https://example.com/old',
                        location: 'Delhi',
                    },
                },
                {
                    version: 2,
                    updatedAt: '2026-03-06T08:00:00.000Z',
                    updatedBy: 'editor@sarkariexams.me',
                    note: 'Moved to pending review',
                    changedKeys: ['status'],
                    snapshot: {
                        title: 'SSC CGL Recruitment 2026',
                        category: 'Latest Jobs',
                        organization: 'SSC',
                        status: 'pending',
                        content: 'Pending review content',
                        externalLink: '',
                        location: 'Delhi',
                    },
                },
            ],
        }));
    });

    await page.route('**/api/admin/users', async (route) => {
        await route.fulfill(jsonResponse(overrides.users ?? [
            {
                id: 'admin-user-1',
                email: 'admin@sarkariexams.me',
                username: 'admin',
                role: 'admin',
                isActive: true,
                twoFactorEnabled: true,
                activeSessionCount: 2,
                invitationState: 'accepted',
                passwordResetRequired: false,
                backupCodesAvailable: 6,
                backupCodesTotal: 8,
                lastLoginAt: '2026-03-07T08:00:00.000Z',
                invitedAt: '2026-03-01T08:00:00.000Z',
                invitedBy: 'owner@sarkariexams.me',
            },
        ]));
    });

    await page.route('**/api/admin/roles', async (route) => {
        await route.fulfill(jsonResponse({
            roles: {
                admin: ['*'],
                editor: ['admin:read', 'admin:write', 'announcements:read', 'announcements:write'],
                contributor: ['admin:read', 'announcements:read', 'announcements:write'],
                reviewer: ['admin:read', 'announcements:read', 'announcements:approve', 'audit:read'],
                viewer: ['admin:read', 'announcements:read'],
            },
            permissions: [
                'admin:read',
                'admin:write',
                'analytics:read',
                'announcements:read',
                'announcements:write',
                'announcements:approve',
                'announcements:delete',
                'audit:read',
                'security:read',
            ],
            defaults: ['admin', 'editor', 'contributor', 'reviewer', 'viewer'],
        }));
    });

    await page.route('**/api/admin/security**', async (route) => {
        if (route.request().method() === 'PATCH') {
            const payload = route.request().postDataJSON() as Record<string, unknown> | null;
            const pathSegments = new URL(route.request().url()).pathname.split('/').filter(Boolean);
            const targetId = pathSegments[pathSegments.length - 1] === 'status'
                ? (pathSegments[pathSegments.length - 2] || '')
                : (pathSegments[pathSegments.length - 1] || '');
            const current = securityLogsState.find((entry) => String(entry.id) === targetId);
            if (!current) {
                await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Not found' }) });
                return;
            }
            if (typeof payload?.incidentStatus === 'string') current.incidentStatus = payload.incidentStatus;
            if (typeof payload?.assigneeEmail === 'string' || payload?.assigneeEmail === null) current.assigneeEmail = payload.assigneeEmail as string | null;
            if (typeof payload?.note === 'string') current.note = payload.note;
            await route.fulfill(jsonResponse(current));
            return;
        }

        await route.fulfill(jsonResponse(securityLogsState));
    });

    await page.route('**/api/admin/sessions', async (route) => {
        await route.fulfill(jsonResponse(overrides.sessions ?? [
            {
                id: 'session-high',
                userId: 'admin-user-1',
                email: 'admin@sarkariexams.me',
                ip: '127.0.0.1',
                userAgent: 'Mozilla/5.0',
                device: 'Desktop',
                browser: 'Chrome',
                os: 'Windows',
                loginTime: '2026-03-07T07:40:00.000Z',
                lastActivity: '2026-03-07T08:00:00.000Z',
                expiresAt: '2026-03-07T12:00:00.000Z',
                isCurrentSession: false,
                isActive: true,
                riskScore: 'high',
                actions: ['/api/auth/admin/login', '/api/admin/security'],
            },
            {
                id: 'session-low',
                userId: 'admin-user-1',
                email: 'admin@sarkariexams.me',
                ip: '10.10.0.5',
                userAgent: 'Mozilla/5.0',
                device: 'Desktop',
                browser: 'Chrome',
                os: 'Windows',
                loginTime: '2026-03-07T06:40:00.000Z',
                lastActivity: '2026-03-07T07:45:00.000Z',
                expiresAt: '2026-03-07T12:00:00.000Z',
                isCurrentSession: true,
                isActive: true,
                riskScore: 'low',
                actions: ['/api/admin/dashboard'],
            },
        ]));
    });

    await page.route('**/api/support/error-reports**', async (route) => {
        if (route.request().method() === 'PATCH') {
            const payload = route.request().postDataJSON() as Record<string, unknown> | null;
            const pathSegments = new URL(route.request().url()).pathname.split('/').filter(Boolean);
            const targetId = pathSegments[pathSegments.length - 1] || '';
            const current = errorReportsState.find((entry) => entry.id === targetId);
            if (!current) {
                await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Not found' }) });
                return;
            }
            if (typeof payload?.status === 'string') current.status = payload.status;
            if (typeof payload?.assigneeEmail === 'string' || payload?.assigneeEmail === null) current.assigneeEmail = payload.assigneeEmail as string | null;
            if (typeof payload?.adminNote === 'string') current.adminNote = payload.adminNote;
            await route.fulfill(jsonResponse(current));
            return;
        }

        await route.fulfill(jsonResponse(errorReportsState));
    });

    await page.route('**/api/admin/audit-log**', async (route) => {
        await route.fulfill(jsonResponse(overrides.auditLogs ?? [
            {
                id: 'audit-1',
                action: 'update',
                announcementId: 'ann-42',
                title: 'SSC CGL Recruitment 2026',
                userId: 'admin-user-1',
                actorEmail: 'admin@sarkariexams.me',
                createdAt: '2026-03-07T08:00:00.000Z',
                note: 'Updated publish workflow metadata',
                metadata: {
                    title: 'SSC CGL Recruitment 2026',
                    endpoint: '/api/admin/announcements/ann-42',
                    method: 'PATCH',
                    requestId: 'req-audit-42',
                    fields: ['status', 'publishAt', 'seo'],
                },
            },
        ]));
    });

    await page.route('**/api/admin/settings/**', async (route) => {
        const url = new URL(route.request().url());
        const key = url.pathname.split('/').pop() || '';
        if (route.request().method() === 'PUT') {
            const payload = route.request().postDataJSON() as Record<string, unknown> | null;
            await route.fulfill(jsonResponse({
                key,
                values: Array.isArray(payload?.values) ? payload?.values : undefined,
                payload: payload?.payload && typeof payload.payload === 'object' ? payload.payload : undefined,
                updatedAt: '2026-03-08T08:00:00.000Z',
                updatedBy: 'admin-user-1',
            }));
            return;
        }

        const settingsByKey: Record<string, { values?: string[]; payload?: Record<string, unknown> }> = {
            states: { values: ['Uttar Pradesh', 'Bihar', 'Rajasthan'] },
            boards: { values: ['UPSC', 'SSC', 'Railway'] },
            tags: { values: ['ssc', 'railway', 'neet'] },
            'workflow-defaults': {
                payload: {
                    job: { defaultStatus: 'pending', reviewWindowHours: 24, autoAssignRole: 'reviewer' },
                },
            },
            'homepage-defaults': {
                payload: {
                    featuredSectionOrder: ['important', 'job', 'result'],
                    maxItemsPerSection: 12,
                },
            },
            'alert-thresholds': {
                payload: {
                    brokenLinksCritical: 10,
                    overdueReviewCritical: 5,
                },
            },
            'security-policy': {
                payload: {
                    enforceHttps: true,
                    requireTwoFactor: true,
                    maxConcurrentSessions: 3,
                },
            },
            'notification-routing': {
                payload: {
                    reviewQueue: ['ops@sarkariexams.me'],
                    securityAlerts: ['security@sarkariexams.me'],
                },
            },
        };
        await route.fulfill(jsonResponse({
            key,
            ...settingsByKey[key],
            updatedAt: '2026-03-08T08:00:00.000Z',
            updatedBy: 'admin-user-1',
        }));
    });

    await page.route('**/api/auth/admin/2fa/backup-codes/status', async (route) => {
        await route.fulfill(jsonResponse({
            total: 8,
            remaining: 6,
            updatedAt: '2026-03-08T08:00:00.000Z',
        }));
    });

    await page.route('**/api/auth/admin/2fa/setup', async (route) => {
        await route.fulfill(jsonResponse({
            qrCode: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="%23ffffff"/><rect x="20" y="20" width="120" height="120" fill="%23000000"/></svg>',
            secret: 'SETTINGS2FASECRET',
        }));
    });

    await page.route('**/api/auth/admin/2fa/verify', async (route) => {
        adminMe.twoFactorEnabled = true;
        await route.fulfill(jsonResponse({ ok: true }));
    });

    await page.route('**/api/auth/admin/2fa/backup-codes', async (route) => {
        await route.fulfill(jsonResponse({
            codes: ['ABCD-EFGH', 'IJKL-MNOP', 'QRST-UVWX', 'YZ12-3456', '789A-BCDE', 'FGHI-JKLM', 'NOPQ-RSTU', 'VWXY-Z123'],
            generatedAt: '2026-03-08T08:00:00.000Z',
            total: 8,
        }));
    });
}

test('admin login screen renders on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockUnauthenticatedAdmin(page);
    await page.goto('login', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /SarkariExams Admin vNext/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Sign in$/i })).toBeVisible();
});

test('admin login can complete two-factor setup challenge', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockUnauthenticatedAdmin(page);
    await page.route('**/api/admin-auth/login', async (route) => {
        await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({
                error: 'two_factor_setup_required',
                message: 'Two-factor setup required',
                setupToken: 'setup-token-123',
            }),
        });
    });
    await page.route('**/api/auth/admin/2fa/setup', async (route) => {
        await route.fulfill(jsonResponse({
            qrCode: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="%23ffffff"/><rect x="20" y="20" width="120" height="120" fill="%23000000"/></svg>',
            secret: 'TESTSECRET123',
        }));
    });
    await page.route('**/api/auth/admin/2fa/verify', async (route) => {
        await route.fulfill(jsonResponse({ ok: true }));
    });

    await page.goto('login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email address').fill('admin@sarkariexams.me');
    await page.getByLabel('Password').fill('strong-password');
    await page.getByRole('button', { name: /^Sign in$/i }).click();

    await expect(page.locator('.admin-login-setup-panel')).toContainText('Two-factor setup required');
    await expect(page.locator('img[alt="Admin two-factor QR code"]')).toBeVisible();
    await expect(page.locator('.admin-login-setup-secret')).toContainText('Manual secret');

    await page.getByLabel('Verify setup code').fill('123456');
    await page.getByRole('button', { name: /Verify 2FA Setup/i }).click();

    await expect(page.getByText(/Two-factor enabled\. Sign in again with your authenticator code/i)).toBeVisible();
});

test('admin shows login screen on mobile viewport (responsive)', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1200 });
    await mockUnauthenticatedAdmin(page);
    await page.goto('login', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /SarkariExams Admin vNext/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Sign in$/i })).toBeVisible();
});

test('admin protected routes redirect to login on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockUnauthenticatedAdmin(page);
    await page.goto('dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /SarkariExams Admin vNext/i })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${escapedAdminBasename}/login$`));
});

test('admin protected routes redirect to login on mobile (responsive)', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1200 });
    await mockUnauthenticatedAdmin(page);
    await page.goto('dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /SarkariExams Admin vNext/i })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${escapedAdminBasename}/login$`));
});

test('primary login action keeps desktop button size standard', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockUnauthenticatedAdmin(page);
    await page.goto('login', { waitUntil: 'domcontentloaded' });

    const button = page.getByRole('button', { name: /^Sign in$/i });
    await expect(button).toBeVisible();

    const height = await button.evaluate((node) => node.getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(44);
});

test('authenticated dashboard renders premium desktop shell', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page);
    await page.goto('dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /^Dashboard$/i })).toBeVisible();
    await expect(page.getByText('admin@sarkariexams.me')).toBeVisible();
    await expect(page.getByRole('button', { name: /Command palette/i })).toBeVisible();

    const primaryAction = page.getByRole('button', { name: /^\+ New Post$/i });
    const height = await primaryAction.evaluate((node) => node.getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(44);
});

test('dashboard traffic widgets render reports API traffic data instead of fallback constants', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page, {
        reports: {
            trafficSeries: [
                { date: '2026-03-01', views: 15 },
                { date: '2026-03-02', views: 30 },
                { date: '2026-03-03', views: 45 },
                { date: '2026-03-04', views: 60 },
                { date: '2026-03-05', views: 75 },
                { date: '2026-03-06', views: 90 },
                { date: '2026-03-07', views: 105 },
            ],
            trafficSources: [
                { source: 'seo', label: 'Organic', views: 60, percentage: 60 },
                { source: 'direct', label: 'Direct', views: 25, percentage: 25 },
                { source: 'referral', label: 'Referral', views: 10, percentage: 10 },
                { source: 'social', label: 'Social', views: 5, percentage: 5 },
            ],
            mostViewed24h: [
                { id: 'a-1', title: 'SSC CGL Recruitment 2026', type: 'job', views: 42, organization: 'SSC' },
            ],
        },
    });
    await page.goto('dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /Traffic Overview/i })).toBeVisible();
    await expect(page.locator('.dash-donut-center')).toContainText('420');
    await expect(page.locator('.dash-traffic-legend')).toContainText('Organic');
    await expect(page.locator('.dash-traffic-legend')).toContainText('60%');
    await expect(page.locator('.dash-traffic-chart')).toContainText('105');
    await expect(page.locator('.dash-viewed-list')).toContainText('42 views');
});

test('dashboard traffic widgets show an explicit empty state when reports API has no traffic data', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page, {
        reports: {
            trafficSeries: [
                { date: '2026-03-01', views: 0 },
                { date: '2026-03-02', views: 0 },
                { date: '2026-03-03', views: 0 },
                { date: '2026-03-04', views: 0 },
                { date: '2026-03-05', views: 0 },
                { date: '2026-03-06', views: 0 },
                { date: '2026-03-07', views: 0 },
            ],
            trafficSources: [],
            mostViewed24h: [],
        },
    });
    await page.goto('dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Traffic charts will populate after announcement views are recorded.')).toBeVisible();
});

test('manage posts applies tag deep links from admin search routes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page, {
        announcements: [
            {
                id: 'ann-1',
                title: 'Railway Group D Recruitment 2026',
                type: 'job',
                status: 'draft',
                organization: 'Railway Recruitment Board',
                category: 'Latest Jobs',
                updatedAt: '2026-03-07T08:00:00.000Z',
            },
        ],
    });
    await page.goto('manage-posts?tag=Railway', { waitUntil: 'domcontentloaded' });

    await expect(page.getByLabel('Search announcements')).toHaveValue('Railway');
    await expect(page).not.toHaveURL(/tag=/i);
});

test('create post includes step-up controls for direct publish actions', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page);
    await page.goto('create-post', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /Step-up Verification/i })).toBeVisible();
    await expect(page.getByText(/Required before creating published posts from Create Post/i)).toBeVisible();
});

test('create post shows job-specific publish requirements before submit', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page);
    await page.goto('create-post', { waitUntil: 'domcontentloaded' });

    await page.getByPlaceholder('Post title').fill('SSC CGL Recruitment 2026');
    await page.getByPlaceholder('Category').fill('Latest Jobs');
    await page.getByPlaceholder('Organization').fill('SSC');
    await page.locator('.ops-editor-rail select').first().selectOption('published');
    await page.getByRole('button', { name: /Create Post/i }).click();

    await expect(page.locator('.ops-editor-rail .admin-alert.warning')).toContainText(/Add an Apply Online link before publishing or scheduling a Job post\./i);
    await expect(page.getByRole('alert')).toContainText(/Add an Apply Online link before publishing or scheduling a Job post\./i);
    await expect(page.getByText(/Apply Online link added/i)).toBeVisible();
    await expect(page.getByText(/Notification PDF link added/i)).toBeVisible();
});

test('review diff links stay inside the admin router basename', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page, {
        announcements: [
            {
                id: 'ann-1',
                title: 'SSC CGL Recruitment 2026',
                type: 'job',
                status: 'pending',
                organization: 'SSC',
                category: 'Latest Jobs',
                updatedAt: '2026-03-08T08:00:00.000Z',
                assigneeEmail: 'admin@sarkariexams.me',
            },
        ],
    });
    await page.goto('review', { waitUntil: 'domcontentloaded' });

    await page.getByRole('link', { name: /Review Diffs/i }).click();
    await expect(page).toHaveURL(new RegExp(`${escapedAdminBasename}/detailed-post\\?focus=ann-1$`));
    await expect(page.getByRole('heading', { name: /Detailed Post/i })).toBeVisible();
});

test('detailed post shows revision comparison and duplicate draft controls', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page, {
        announcements: [
            {
                id: 'ann-1',
                title: 'SSC CGL Recruitment 2026',
                type: 'job',
                status: 'draft',
                organization: 'SSC',
                category: 'Latest Jobs',
                content: 'Current draft content',
                externalLink: 'https://example.com/current',
                location: 'Delhi',
                updatedAt: '2026-03-08T08:00:00.000Z',
            },
        ],
    });
    await page.goto('detailed-post?focus=ann-1', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText(/Compare with v3/i)).toBeVisible();
    await expect(page.getByText(/Published with SEO update/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Duplicate as draft/i })).toBeVisible();
    await page.getByRole('button', { name: /Duplicate as draft/i }).click();
    await expect(page.getByText(/Draft duplicated/i)).toBeVisible();
});

test('dashboard exposes operator cockpit drilldowns', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page);
    await page.goto('dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /My Queue/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Unassigned pending reviews/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Overdue review items/i })).toBeVisible();
});

test('access control workspace renders roster and role matrix', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page);
    await page.goto('users-roles', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /Access Control/i })).toBeVisible();
    await expect(page.getByText(/Backup codes: 6\/8/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Role Permission Matrix/i })).toBeVisible();
});

test('access control roster failures do not mislabel the error as access denied', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page);
    await page.route('**/api/admin/users', async (route) => {
        await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Failed to load users' }),
        });
    });
    await page.goto('users-roles', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Failed to load users')).toBeVisible();
    await expect(page.locator('.ops-error-state-title')).toContainText(/Unable to load data|Request failed/i);
    await expect(page.locator('.ops-error-state-title')).not.toHaveText(/Access denied/i);
    await expect(page.getByRole('button', { name: /Retry roster load/i })).toBeVisible();
});

test('configuration workspace exposes structured policy controls and backup-code controls', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page);
    await page.goto('settings', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /Configuration Workspace/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Workflow Defaults/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Notification Routing/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Admin Authentication/i })).toBeVisible();
    await expect(page.getByLabel(/Jobs default status/i)).toBeVisible();
    await expect(page.getByLabel(/Maximum items per section/i)).toHaveValue('12');
    await expect(page.getByLabel(/Require 2FA for all admins/i)).toBeChecked();
    await expect(page.getByRole('button', { name: /Regenerate Backup Codes/i })).toBeVisible();
    await expect(page.getByText(/Backup codes: 6\/8/i)).toBeVisible();
});

test('configuration workspace saves structured alert thresholds', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page);
    await page.goto('settings', { waitUntil: 'domcontentloaded' });

    await page.getByLabel(/Broken links critical threshold/i).fill('14');
    await page.getByRole('button', { name: /Save Alert Thresholds/i }).click();

    await expect(page.getByText(/Alert thresholds updated\./i)).toBeVisible();
    await expect(page.getByLabel(/Broken links critical threshold/i)).toHaveValue('14');
});

test('configuration workspace can enable two-factor for admins who are not enrolled yet', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page, {
        me: {
            twoFactorEnabled: false,
        },
    });
    await page.goto('settings', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('button', { name: /Start Two-Factor Setup/i })).toBeVisible();
    await page.getByRole('button', { name: /Start Two-Factor Setup/i }).click();

    await expect(page.locator('img[alt="Admin settings two-factor QR code"]')).toBeVisible();
    await page.getByLabel('Verify setup code').fill('123456');
    await page.getByRole('button', { name: /Verify Two-Factor/i }).click();

    await expect(page.getByText(/2FA Enabled/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Regenerate Backup Codes/i })).toBeVisible();
});

test('security module renders incident workflow fields', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page);
    await page.goto('security', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /^Security$/i })).toBeVisible();
    await expect(page.getByText(/admin_security_alert/i)).toBeVisible();
    await expect(page.locator('.ops-badge', { hasText: /^new$/i })).toBeVisible();
});

test('security incident detail panel supports investigation notes and audit drill-in', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page);
    await page.goto('security', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /More actions for admin_security_alert/i }).click();
    await page.getByRole('button', { name: /^Investigate$/i }).click();

    await expect(page.getByText(/Incident Detail: admin_security_alert/i)).toBeVisible();
    await page.getByPlaceholder(/Capture investigation notes/i).fill('Investigating suspicious device fingerprint');
    const incidentUpdateRequest = page.waitForRequest((request) => request.method() === 'PATCH' && request.url().includes('/api/admin/security'));
    await page.getByRole('button', { name: /Save Incident Note/i }).click();
    const incidentUpdatePayload = incidentUpdateRequest.then((request) => request.postDataJSON() as Record<string, unknown>);
    await expect.poll(async () => (await incidentUpdatePayload).incidentStatus).toBe('new');
    await expect(page.getByText(/Incident updated/i)).toBeVisible();
    await expect(page.getByText(/Note: Investigating suspicious device fingerprint/i)).toBeVisible();

    await page.getByRole('button', { name: /Open Audit Trail/i }).click();
    await expect(page).toHaveURL(/audit\?actor=admin%40sarkariexams\.me&action=security_incident_update/i);
});

test('security incidents deep-link into filtered sessions for correlation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page);
    await page.goto('security', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /Related Sessions/i }).first().click();

    await expect(page).toHaveURL(/sessions\?/i);
    await expect(page.getByPlaceholder(/Search by email, device, browser, or IP/i)).toHaveValue('127.0.0.1');
    await expect(page.getByRole('option', { name: /High risk/i })).toBeAttached();
    await expect(page.locator('tr.ops-row-highlight')).toContainText('session-high');
});

test('audit workspace exposes investigation context and record drill-in controls', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page);
    await page.goto('audit', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /^Audit$/i })).toBeVisible();
    await expect(page.getByText(/Changed: status, publishAt, seo/i)).toBeVisible();
    await expect(page.getByText(/Request: req-audit-42/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /SSC CGL Recruitment 2026/i })).toBeVisible();
});

test('error reports show release and request context', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page);
    await page.goto('errors', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /Error Reports/i })).toBeVisible();
    await expect(page.getByText(/Release: web@1.2.3/i)).toBeVisible();
    await expect(page.getByText(/Request: req-123/i)).toBeVisible();
    await expect(page.getByText(/User: candidate@example.com/i)).toBeVisible();
    await expect(page.getByText(/Admin note: Needs route-level repro/i)).toBeVisible();
});

test('error report detail panel exposes stack traces and saves admin notes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page);
    await page.goto('errors', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /More actions for frontend_error_boundary/i }).click();
    await page.getByRole('button', { name: /^Investigate$/i }).click();

    await expect(page.getByText(/Report Detail: frontend_error_boundary/i)).toBeVisible();
    await expect(page.locator('.ops-code-block').first()).toContainText('DetailPage.tsx:41:13');
    await expect(page.locator('.ops-code-block').nth(1)).toContainText('at DetailPage');
    await page.getByPlaceholder(/Capture reproduction steps/i).fill('Reproduced on result detail route after share click');
    const reportUpdateRequest = page.waitForRequest((request) => request.method() === 'PATCH' && request.url().includes('/api/support/error-reports/'));
    await page.getByRole('button', { name: /Save Admin Note/i }).click();

    const reportUpdatePayload = reportUpdateRequest.then((request) => request.postDataJSON() as Record<string, unknown>);
    await expect.poll(async () => (await reportUpdatePayload).status).toBe('new');
    await expect(page.getByText(/Admin note saved\./i)).toBeVisible();
    await expect(page.getByText(/Admin note: Reproduced on result detail route after share click/i)).toBeVisible();
});

test('command palette opens from shell action in authenticated session', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page);
    await page.goto('dashboard', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /Command palette/i }).click();
    const paletteDialog = page.getByRole('dialog', { name: /Admin command palette/i });
    await expect(paletteDialog).toBeVisible();
    await expect(page.getByPlaceholder(/Search commands, modules, or content/i)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(paletteDialog).toHaveCount(0);
});

test('sidebar collapse toggles desktop rail state', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page);
    await page.goto('dashboard', { waitUntil: 'domcontentloaded' });

    const layout = page.locator('.admin-layout');
    expect(await layout.evaluate((node) => node.classList.contains('sidebar-collapsed'))).toBe(false);

    await page.getByRole('button', { name: /Collapse sidebar/i }).click();
    expect(await layout.evaluate((node) => node.classList.contains('sidebar-collapsed'))).toBe(true);

    await page.getByRole('button', { name: /Expand sidebar/i }).click();
    expect(await layout.evaluate((node) => node.classList.contains('sidebar-collapsed'))).toBe(false);
});

test('sidebar exposes full admin operations information architecture', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page);
    await page.goto('dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('link', { name: /Dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /All Posts/i })).toBeVisible();
    await expect(page.locator('.admin-nav-link', { hasText: /New Post/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Homepage/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Links/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Templates/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Alerts/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Media \/ PDFs/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /SEO Tools/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Users & Roles/i })).toBeVisible();
    await expect(page.locator('a[href$="/reports"]')).toBeVisible();
    await expect(page.getByRole('link', { name: /Configuration/i })).toBeVisible();
});

test('admin-vnext alias serves login shell when basename is admin-vnext', async ({ page }) => {
    test.skip(process.env.VITE_ADMIN_BASENAME !== '/admin-vnext', 'Alias path validation runs when basename is /admin-vnext');

    await page.setViewportSize({ width: 1440, height: 900 });
    await mockUnauthenticatedAdmin(page);
    await page.goto('/admin-vnext/login', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /SarkariExams Admin vNext/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Sign in$/i })).toBeVisible();
});
