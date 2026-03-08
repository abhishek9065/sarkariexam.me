import { expect, test } from '@playwright/test';

const adminBasename = process.env.VITE_ADMIN_BASENAME || '/admin-vnext';
const escapedAdminBasename = adminBasename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const jsonResponse = (data: unknown) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data }),
});

async function mockUnauthenticatedAdmin(page: import('@playwright/test').Page) {
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
        reports?: Record<string, unknown>;
        auditLogs?: Array<Record<string, unknown>>;
        announcements?: Array<Record<string, unknown>>;
    } = {},
) {
    await page.route('**/api/admin-auth/me', async (route) => {
        await route.fulfill(jsonResponse({
            user: {
                id: 'admin-user-1',
                email: 'admin@sarkariexams.me',
                role: 'admin',
            },
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
            ...overrides.reports,
        }));
    });

    await page.route('**/api/admin/alerts**', async (route) => {
        await route.fulfill(jsonResponse([]));
    });

    await page.route('**/api/admin/announcements**', async (route) => {
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

    await page.route('**/api/admin/audit-log**', async (route) => {
        await route.fulfill(jsonResponse(overrides.auditLogs ?? [
            {
                id: 'audit-1',
                action: 'publish',
                actorEmail: 'admin@sarkariexams.me',
                createdAt: '2026-03-07T08:00:00.000Z',
                metadata: {
                    title: 'SSC CGL Recruitment 2026',
                },
            },
        ]));
    });
}

test('admin login screen renders on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockUnauthenticatedAdmin(page);
    await page.goto('login', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /SarkariExams Admin vNext/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Sign in$/i })).toBeVisible();
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
    await expect(page.getByRole('link', { name: /New Post/i })).toBeVisible();
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
