import { expect, test } from '@playwright/test';

const BASE_URL = process.env.CI_BASE_URL || 'http://127.0.0.1:4173';

test.describe('Homepage dense layout v3', () => {
    test('renders 8 dense boxes with asymmetric/top and 3-column bottom sections', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        await expect(page.locator('[data-testid="home-v3-top-grid"]')).toBeVisible();
        await expect(page.locator('[data-testid="home-v3-bottom-grid"]')).toBeVisible();
        await expect(page.locator('[data-testid^="home-v3-dense-box-"]')).toHaveCount(8);

        await expect(page.locator('[data-testid="home-v3-dense-box-jobs"] .home-dense-box-list li').first()).toBeVisible();
        await expect(page.locator('[data-testid="home-v3-dense-box-results"] .home-dense-box-list li').first()).toBeVisible();
        await expect(page.locator('[data-testid="home-v3-dense-box-admit"] .home-dense-box-list li').first()).toBeVisible();
        await expect(page.locator('[data-testid="home-v3-dense-box-certificate"] .home-dense-box-list li').first()).toBeVisible();

        await expect(page.locator('[data-testid="home-educational-content"]')).toBeVisible();
    });
});
