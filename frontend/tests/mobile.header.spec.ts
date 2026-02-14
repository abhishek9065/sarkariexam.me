import { expect, test } from '@playwright/test';

const BASE_URL = process.env.CI_BASE_URL || 'http://127.0.0.1:4173';

test.describe('Mobile header', () => {
    test('hamburger opens utility-rich mobile menu', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        await page.getByRole('button', { name: 'Toggle menu' }).click();
        const mobileMenu = page.locator('.header-mobile-menu');
        await expect(mobileMenu).toBeVisible();
        await expect(mobileMenu.getByRole('link', { name: 'Latest Jobs' })).toBeVisible();
        await expect(mobileMenu.getByRole('button', { name: /sign in/i })).toBeVisible();
    });
});
