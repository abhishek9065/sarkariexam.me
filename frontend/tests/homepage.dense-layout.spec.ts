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

        // Section grids (3 rows)
        await expect(page.locator('[data-testid="home-v3-top-grid"]')).toBeVisible();
        await expect(page.locator('[data-testid="home-v3-middle-grid"]')).toBeVisible();
        await expect(page.locator('[data-testid="home-v3-bottom-grid"]')).toBeVisible();
        await expect(page.locator('[data-testid^="home-v3-dense-box-"]')).toHaveCount(8);

        // Row 1: Result | Admit Card | Latest Jobs
        const topHeaders = page.locator('[data-testid="home-v3-top-grid"] .home-dense-box-header');
        await expect(topHeaders).toHaveCount(3);
        await expect(topHeaders.nth(0)).toContainText('Result');
        await expect(topHeaders.nth(1)).toContainText('Admit Card');
        await expect(topHeaders.nth(2)).toContainText('Latest Jobs');

        // Row 2: Answer Key | Syllabus | Admission
        const middleHeaders = page.locator('[data-testid="home-v3-middle-grid"] .home-dense-box-header');
        await expect(middleHeaders).toHaveCount(3);
        await expect(middleHeaders.nth(0)).toContainText('Answer Key');
        await expect(middleHeaders.nth(1)).toContainText('Syllabus');
        await expect(middleHeaders.nth(2)).toContainText('Admission');

        // Row 3: Certificate Verification | Important
        const bottomHeaders = page.locator('[data-testid="home-v3-bottom-grid"] .home-dense-box-header');
        await expect(bottomHeaders).toHaveCount(2);
        await expect(bottomHeaders.nth(0)).toContainText('Certificate Verification');
        await expect(bottomHeaders.nth(1)).toContainText('Important');

        // Data loads OR empty state shows
        const jobsBox = page.locator('[data-testid="home-v3-dense-box-jobs"]');
        const resultsBox = page.locator('[data-testid="home-v3-dense-box-results"]');
        // Either cards load OR empty state is shown
        const jobsList = jobsBox.locator('.section-card-list li');
        const jobsEmpty = jobsBox.locator('.hp-empty-box');
        await expect(jobsList.or(jobsEmpty).first()).toBeVisible();
        const resultsList = resultsBox.locator('.section-card-list li');
        const resultsEmpty = resultsBox.locator('.hp-empty-box');
        await expect(resultsList.or(resultsEmpty).first()).toBeVisible();

        // Education content removed
        await expect(page.locator('[data-testid="home-educational-content"]')).toHaveCount(0);
    });
});
