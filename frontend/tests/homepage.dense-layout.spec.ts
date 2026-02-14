import { expect, test } from '@playwright/test';

const BASE_URL = process.env.CI_BASE_URL || 'http://127.0.0.1:4173';

test.describe('Homepage dense layout v3', () => {
    test('renders screenshot-parity section order and dense groups', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        await expect(page.locator('[data-testid="home-featured-banner"]')).toHaveCount(0);
        await expect(page.locator('[data-testid="home-marquee"]')).toHaveCount(0);

        await expect(page.locator('[data-testid="home-v3-top-grid"]')).toBeVisible();
        await expect(page.locator('[data-testid="home-v3-bottom-grid"]')).toBeVisible();
        await expect(page.locator('[data-testid^="home-v3-dense-box-"]')).toHaveCount(8);

        const topHeaders = page.locator('[data-testid="home-v3-top-grid"] .home-dense-box-header h2');
        await expect(topHeaders).toHaveCount(3);
        await expect(topHeaders.nth(0)).toHaveText('Latest Jobs');
        await expect(topHeaders.nth(1)).toHaveText('Admit Card');
        await expect(topHeaders.nth(2)).toHaveText('Result');

        const secondaryHeaders = page.locator('[data-testid="home-v3-bottom-grid"] .home-dense-box-header h2');
        await expect(secondaryHeaders).toHaveCount(5);
        await expect(secondaryHeaders.nth(0)).toHaveText('Answer Key');
        await expect(secondaryHeaders.nth(1)).toHaveText('Syllabus');
        await expect(secondaryHeaders.nth(2)).toHaveText('Admission');
        await expect(secondaryHeaders.nth(3)).toHaveText('Certificate Verification');
        await expect(secondaryHeaders.nth(4)).toHaveText('Important');

        await expect(page.locator('[data-testid="home-v3-dense-box-jobs"] .home-dense-box-list li').first()).toBeVisible();
        await expect(page.locator('[data-testid="home-v3-dense-box-results"] .home-dense-box-list li').first()).toBeVisible();
        await expect(page.locator('[data-testid="home-v3-dense-box-admit"] .home-dense-box-list li').first()).toBeVisible();
        await expect(page.locator('[data-testid="home-v3-dense-box-certificate"] .home-dense-box-list li').first()).toBeVisible();

        await expect(page.locator('[data-testid="home-educational-content"]')).toHaveCount(0);
    });
});
