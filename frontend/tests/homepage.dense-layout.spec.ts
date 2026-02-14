import { expect, test } from '@playwright/test';

const BASE_URL = process.env.CI_BASE_URL || 'http://127.0.0.1:4173';

test.describe('Homepage dense layout', () => {
    test('renders featured tiles and dense sections', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        await expect(page.locator('.home-featured-grid .home-featured-card')).toHaveCount(8);
        await expect(page.locator('.home-column')).toHaveCount(3);
        await expect(page.locator('[data-testid="home-secondary-sections"] .home-horizontal')).toHaveCount(4);
        await expect(page.locator('[data-testid="popular-searches"]')).toBeVisible();
        await expect(page.locator('[data-testid="home-admission-extended"]')).toBeVisible();
        await expect(page.locator('[data-testid="home-admission-extended"] .home-admission-list li')).toHaveCount(10);
        await expect(page.locator('[data-testid="home-educational-content"]')).toBeVisible();
    });
});
