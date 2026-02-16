import { expect, test } from '@playwright/test';

const BASE_URL = process.env.CI_BASE_URL || 'http://127.0.0.1:4173';

test.describe('CI smoke', () => {
    test('homepage renders dense shell', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveTitle(/SarkariExams\.me/i);
        await expect(page.locator('[data-testid="app-header"]')).toBeVisible();
        await expect(page.locator('[data-testid="app-footer"]')).toBeVisible();
        await expect(page.locator('[data-testid="home-featured-banner"]')).toHaveCount(0);
        await expect(page.locator('[data-testid="home-marquee"]')).toHaveCount(0);
        await expect(page.locator('[data-testid="home-v3-top-grid"]')).toBeVisible();
        await expect(page.locator('[data-testid="home-v3-bottom-grid"]')).toBeVisible();
        await expect(page.locator('[data-testid="home-v3-top-grid"] .home-dense-box-header h2').nth(0)).toHaveText('Result');
        await expect(page.locator('[data-testid="home-educational-content"]')).toHaveCount(0);
    });

    test('admin route redirects to login modal', async ({ page }) => {
        await page.goto(`${BASE_URL.replace(/\/$/, '')}/admin`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('.auth-modal')).toBeVisible();
        await expect(page.getByLabel('Email')).toBeVisible();
        await expect(page.getByLabel('Password')).toBeVisible();
    });
});
