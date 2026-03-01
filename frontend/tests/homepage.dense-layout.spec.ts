// Adjusted for new HP layout
import { expect, test } from '@playwright/test';

const BASE_URL = process.env.CI_BASE_URL || 'http://127.0.0.1:4173';

test.describe('Homepage v3/v4 premium layout', () => {
    test('renders hero, categories, and section grids correctly', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        // Shell/Hero exists
        await expect(page.locator('.hp')).toBeVisible();
        await expect(page.locator('.hp-hero')).toBeVisible();

        // Old elements are gone (featured banner was removed)
        await expect(page.locator('[data-testid="home-featured-banner"]')).toHaveCount(0);

        // Section grids
        const catsGrid = page.locator('.hp-cats');
        await expect(catsGrid).toBeVisible();

        // Check for the new dense boxes (Result, Admit Card, Jobs, etc.)
        // If upstream API is temporarily unavailable in CI, homepage shows a fallback card.
        const boxes = page.locator('[data-testid^="home-v3-dense-box-"]');
        const boxCount = await boxes.count();
        if (boxCount === 0) {
            await expect(page.getByText(/Unable to load updates/i)).toBeVisible();
            return;
        }

        // Top Grid checks
        await expect(page.locator('.home-v3-top-grid')).toBeVisible();

        // Old specific rows tests are generalized since layout may shift on desktop vs mobile 
        // We just ensure major headers exist.
        const allHeaders = page.locator('.home-dense-box-header h2');
        await expect(allHeaders).toHaveCount(8);

        await expect(allHeaders.filter({ hasText: 'Latest Jobs' })).toBeVisible();
        await expect(allHeaders.filter({ hasText: 'Result' })).toBeVisible();
        await expect(allHeaders.filter({ hasText: 'Admit Card' })).toBeVisible();

        // Verify data loads OR empty state shows for Jobs
        const jobsBox = page.locator('[data-testid="home-v3-dense-box-jobs"]');
        const jobsList = jobsBox.locator('.section-card-list li');
        const jobsEmpty = jobsBox.locator('.hp-empty-box');
        await expect(jobsList.or(jobsEmpty).first()).toBeVisible();
    });
});
