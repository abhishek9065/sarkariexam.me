import { expect, test } from '@playwright/test';

const BASE_URL = process.env.CI_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';

test.describe('Site regression', () => {
    test('homepage shell and dense sections render', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveTitle(/SarkariExams\.me/i);
        await expect(page.locator('[data-testid="app-header"]')).toBeVisible();
        await expect(page.locator('[data-testid="app-footer"]')).toBeVisible();
        await expect(page.locator('[data-testid="home-dense-columns"]')).toBeVisible();
    });

    test('theme toggle is interactive', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        const toggle = page.getByRole('button', { name: 'Toggle theme' });
        await expect(toggle).toBeVisible();
        await toggle.click();
        const hasTheme = await page.evaluate(() => Boolean(document.documentElement.getAttribute('data-theme')));
        expect(hasTheme).toBe(true);
    });

    test('mobile menu opens on small viewport', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: 'Toggle menu' }).click();
        await expect(page.locator('.header-mobile-menu')).toBeVisible();
    });

    test('web manifest link exists', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest\.webmanifest|manifest\.json|manifest/i);
    });
});
