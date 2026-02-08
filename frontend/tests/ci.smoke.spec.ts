import { expect, test } from '@playwright/test';

const BASE_URL = process.env.CI_BASE_URL || 'http://127.0.0.1:4173';

test.describe('CI smoke', () => {
    test('homepage renders core shell', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveTitle(/SarkariExams\.me/i);
        await expect(page.locator('.site-header')).toBeVisible();
        await expect(page.locator('footer, .site-footer')).toBeVisible();
    });

    test('admin page renders login screen', async ({ page }) => {
        await page.goto(`${BASE_URL.replace(/\/$/, '')}/admin`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#email')).toBeVisible();
        await expect(page.locator('#password')).toBeVisible();
    });
});
