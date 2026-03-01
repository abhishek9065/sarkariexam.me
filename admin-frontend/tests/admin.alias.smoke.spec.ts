import { expect, test } from '@playwright/test';

async function mockUnauthenticatedSession(page: import('@playwright/test').Page) {
    await page.route('**/api/admin-auth/me', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: { user: null } }),
        });
    });

    await page.route('**/api/admin-auth/permissions', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: { role: 'viewer', permissions: [] } }),
        });
    });
}

test.describe('admin vNext alias smoke', () => {
    test('login screen renders on alias route', async ({ page }) => {
        await mockUnauthenticatedSession(page);
        await page.goto('login', { waitUntil: 'domcontentloaded' });

        await expect(page.getByRole('heading', { name: /SarkariExams Admin vNext/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /^Sign in$/i })).toBeVisible();
    });

    test('protected alias route redirects unauthenticated user to login', async ({ page }) => {
        await mockUnauthenticatedSession(page);

        await page.goto('dashboard', { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/\/admin-vnext\/login$/);
        await expect(page.getByRole('heading', { name: /SarkariExams Admin vNext/i })).toBeVisible();
    });
});
