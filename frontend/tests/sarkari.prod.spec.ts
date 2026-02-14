import { expect, test } from '@playwright/test';

const PROD_BASE_URL = process.env.PROD_BASE_URL || process.env.ADMIN_BASE_URL;

test.describe('@prod Public site probes', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!PROD_BASE_URL, 'Set PROD_BASE_URL (or ADMIN_BASE_URL) to run production probes.');
        await page.goto(PROD_BASE_URL as string, { waitUntil: 'domcontentloaded' });
    });

    test('homepage renders core shell', async ({ page }) => {
        await expect(page).toHaveTitle(/SarkariExams\.me/i);
        await expect(page.locator('[data-testid="app-header"]')).toBeVisible();
        await expect(page.locator('[data-testid="app-footer"]')).toBeVisible();
    });

    test('navigation and dense homepage sections appear', async ({ page }) => {
        await expect(page.getByRole('link', { name: 'Latest Jobs' }).first()).toBeVisible();
        await expect(page.locator('[data-testid="home-dense-columns"]')).toBeVisible();
        await expect(page.locator('.home-featured-grid .home-featured-card').first()).toBeVisible();
    });

    test('theme toggle is available', async ({ page }) => {
        const toggle = page.getByRole('button', { name: 'Toggle theme' });
        await expect(toggle).toBeVisible();
        await toggle.click();
        const hasTheme = await page.evaluate(() => Boolean(document.documentElement.getAttribute('data-theme')));
        expect(hasTheme).toBe(true);
    });

    test('mobile shell works', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('button', { name: 'Toggle menu' })).toBeVisible();
    });
});
