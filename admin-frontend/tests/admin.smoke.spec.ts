import { expect, test } from '@playwright/test';

const adminBasename = process.env.VITE_ADMIN_BASENAME || '/admin-vnext';
const escapedAdminBasename = adminBasename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const jsonResponse = (data: unknown) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data }),
});

async function mockAuthenticatedAdmin(page: import('@playwright/test').Page) {
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
            brokenLinkItems: [],
        }));
    });

    await page.route('**/api/admin/alerts**', async (route) => {
        await route.fulfill(jsonResponse([]));
    });

    await page.route('**/api/admin/announcements**', async (route) => {
        await route.fulfill(jsonResponse([]));
    });
}

test('admin login screen renders on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('login', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /SarkariExams Admin vNext/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in to Admin/i })).toBeVisible();
});

test('admin shows login screen on mobile viewport (responsive)', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1200 });
    await page.goto('login', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /SarkariExams Admin vNext/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in to Admin/i })).toBeVisible();
});

test('admin protected routes redirect to login on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /SarkariExams Admin vNext/i })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${escapedAdminBasename}/login$`));
});

test('admin protected routes redirect to login on mobile (responsive)', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1200 });
    await page.goto('dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /SarkariExams Admin vNext/i })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${escapedAdminBasename}/login$`));
});

test('primary login action keeps desktop button size standard', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('login', { waitUntil: 'domcontentloaded' });

    const button = page.getByRole('button', { name: /Sign in to Admin/i });
    await expect(button).toBeVisible();

    const height = await button.evaluate((node) => node.getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(44);
});

test('authenticated dashboard renders premium desktop shell', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page);
    await page.goto('dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /Operations Dashboard/i })).toBeVisible();
    await expect(page.getByText('admin@sarkariexams.me')).toBeVisible();
    await expect(page.getByRole('button', { name: /Density:/i })).toBeVisible();

    const logoutButton = page.getByRole('button', { name: /^Logout$/i });
    const height = await logoutButton.evaluate((node) => node.getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(44);
});

test('command palette opens from shell action in authenticated session', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page);
    await page.goto('dashboard', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /Palette \(Ctrl\/Cmd \+ K\)/i }).click();
    const paletteDialog = page.getByRole('dialog', { name: /Admin command palette/i });
    await expect(paletteDialog).toBeVisible();
    await expect(page.getByPlaceholder(/Jump to module or search announcement/i)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(paletteDialog).toHaveCount(0);
});

test('sidebar collapse toggles desktop rail state', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAuthenticatedAdmin(page);
    await page.goto('dashboard', { waitUntil: 'domcontentloaded' });

    const layout = page.locator('.admin-layout');
    expect(await layout.evaluate((node) => node.classList.contains('sidebar-collapsed'))).toBe(false);

    await page.getByRole('button', { name: /Collapse rail/i }).click();
    expect(await layout.evaluate((node) => node.classList.contains('sidebar-collapsed'))).toBe(true);

    await page.getByRole('button', { name: /Expand rail/i }).click();
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
    await expect(page.getByRole('link', { name: /^Links$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Templates/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Alerts$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Media/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /SEO Tools/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Users/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Reports$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Configuration/i })).toBeVisible();
});

test('admin-vnext alias serves login shell when basename is admin-vnext', async ({ page }) => {
    test.skip(process.env.VITE_ADMIN_BASENAME !== '/admin-vnext', 'Alias path validation runs when basename is /admin-vnext');

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin-vnext/login', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /SarkariExams Admin vNext/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in to Admin/i })).toBeVisible();
});
