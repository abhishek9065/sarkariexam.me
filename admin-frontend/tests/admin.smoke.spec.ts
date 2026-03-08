import { expect, test } from '@playwright/test';

const adminBasename = process.env.VITE_ADMIN_BASENAME || '/admin-vnext';
const escapedAdminBasename = adminBasename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const jsonResponse = (data: unknown) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data }),
});

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
        await route.fulfill(jsonResponse({
            totalAnnouncements: 128,
            pendingReview: 17,
            activeSessions: 5,
            highRiskEvents: 2,
        }));
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

    await expect(page.getByText(/Last 7 days .*420 total visits/i)).toBeVisible();
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

    await expect(page.getByRole('heading', { name: /Operator Cockpit/i })).toBeVisible();
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
    await page.getByRole('button', { name: /Save Incident Note/i }).click();
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
    await page.getByRole('button', { name: /Save Admin Note/i }).click();

    await expect(page.getByText(/Status set to triaged\./i)).toBeVisible();
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
