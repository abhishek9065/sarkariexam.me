import { expect, test } from '@playwright/test';

const BASE_URL = process.env.CI_BASE_URL || 'http://127.0.0.1:4173';

test.describe('Homepage v3 premium layout', () => {
    test('renders hero, categories, spotlight, and section grid', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        // Shell exists
        await expect(page.locator('[data-testid="home-v4-shell"]')).toBeVisible();

        // Old elements removed
        await expect(page.locator('[data-testid="home-featured-banner"]')).toHaveCount(0);
        await expect(page.locator('[data-testid="home-marquee"]')).toHaveCount(0);

        // Section grids
        await expect(page.locator('[data-testid="home-v3-top-grid"]')).toBeVisible();
        await expect(page.locator('[data-testid="home-v3-bottom-grid"]')).toBeVisible();
        await expect(page.locator('[data-testid^="home-v3-dense-box-"]')).toHaveCount(8);

        // Top grid: 4 sections
        const topHeaders = page.locator('[data-testid="home-v3-top-grid"] .home-dense-box-header');
        await expect(topHeaders).toHaveCount(4);
        await expect(topHeaders.nth(0)).toContainText('Latest Jobs');
        await expect(topHeaders.nth(1)).toContainText('Result');
        await expect(topHeaders.nth(2)).toContainText('Admit Card');
        await expect(topHeaders.nth(3)).toContainText('Answer Key');

        // Bottom grid: 4 sections
        const bottomHeaders = page.locator('[data-testid="home-v3-bottom-grid"] .home-dense-box-header');
        await expect(bottomHeaders).toHaveCount(4);
        await expect(bottomHeaders.nth(0)).toContainText('Syllabus');
        await expect(bottomHeaders.nth(1)).toContainText('Admission');
        await expect(bottomHeaders.nth(2)).toContainText('Certificate Verification');
        await expect(bottomHeaders.nth(3)).toContainText('Important');

        // Data loads
        await expect(page.locator('[data-testid="home-v3-dense-box-jobs"] .section-card-list li').first()).toBeVisible();
        await expect(page.locator('[data-testid="home-v3-dense-box-results"] .section-card-list li').first()).toBeVisible();

        // Education content removed
        await expect(page.locator('[data-testid="home-educational-content"]')).toHaveCount(0);
    });
});
