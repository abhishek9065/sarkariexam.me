import { expect, test } from '@playwright/test';

const BASE_URL = process.env.CI_BASE_URL || 'http://127.0.0.1:4173';

test.describe('Mobile header', () => {
    test('hamburger opens utility-rich mobile menu', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(BASE_URL, { waitUntil: 'load' });

        const header = page.locator('[data-testid="app-header"]');
        const menuButton = header.getByRole('button', { name: 'Toggle menu' });
        await expect(menuButton).toBeVisible();
        await menuButton.click({ force: true });

        const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
        if (!(await mobileNav.isVisible())) {
            await menuButton.click({ force: true });
        }
        await expect(mobileNav).toBeVisible();
        await expect(mobileNav.getByRole('link', { name: 'Latest Jobs' })).toBeVisible();
        await expect(mobileNav.getByRole('button', { name: /sign in/i })).toBeVisible();
    });
});
