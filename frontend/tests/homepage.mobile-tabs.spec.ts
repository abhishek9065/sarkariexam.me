import { expect, test } from '@playwright/test';

const BASE_URL = process.env.CI_BASE_URL || 'http://127.0.0.1:4173';

test.describe('Homepage mobile tabs', () => {
    test('shows major sections in tabs and switches active panel', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        await expect(page.locator('.home-mobile-tabs')).toBeVisible();

        const tabList = page.getByRole('tablist', { name: 'Homepage major sections' });
        await expect(tabList).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Latest Jobs' })).toHaveAttribute('aria-selected', 'true');

        await expect(page.locator('.home-mobile-major-panel h3')).toHaveText('Latest Jobs');
        // Panel visible (may have 0 items if backend is down)
        await expect(page.locator('.home-mobile-major-panel')).toBeVisible();

        await page.getByRole('tab', { name: 'Admit Card' }).click();
        await expect(page.getByRole('tab', { name: 'Admit Card' })).toHaveAttribute('aria-selected', 'true');
        await expect(page.locator('.home-mobile-major-panel h3')).toHaveText('Admit Card');
        await expect(page.locator('.home-mobile-major-panel')).toBeVisible();

        await page.getByRole('tab', { name: 'Result', exact: true }).click();
        await expect(page.getByRole('tab', { name: 'Result', exact: true })).toHaveAttribute('aria-selected', 'true');
        await expect(page.locator('.home-mobile-major-panel h3')).toHaveText('Result');
        await expect(page.locator('.home-mobile-major-panel')).toBeVisible();
    });
});
