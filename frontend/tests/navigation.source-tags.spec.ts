import { expect, test } from '@playwright/test';

const BASE_URL = process.env.CI_BASE_URL || 'http://127.0.0.1:4173';

test.describe('Navigation source tags', () => {
    test('homepage detail links carry canonical source tags', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        await expect(page.locator('.home-featured-card').first()).toHaveAttribute('href', /source=home_featured/);
        await expect(page.locator('.home-column:nth-of-type(1) .home-column-link').first()).toHaveAttribute('href', /source=home_column_jobs/);
        await expect(page.locator('.home-column:nth-of-type(2) .home-column-link').first()).toHaveAttribute('href', /source=home_column_results/);
        await expect(page.locator('.home-column:nth-of-type(3) .home-column-link').first()).toHaveAttribute('href', /source=home_column_admit/);
        await expect(page.locator('.home-horizontal').nth(0).locator('.home-horizontal-link').first()).toHaveAttribute('href', /source=home_horizontal_answer_key/);
    });
});
