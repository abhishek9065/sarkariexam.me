import { expect, test } from '@playwright/test';

const BASE_URL = process.env.CI_BASE_URL || 'http://127.0.0.1:4173';

test.describe('Navigation source tags', () => {
    test('homepage dense-box links carry canonical source tags', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        await expect(page.locator('.home-dense-box').filter({ hasText: 'Latest Jobs' }).getByRole('link').first()).toHaveAttribute('href', /source=home_box_jobs/);
        await expect(page.locator('.home-dense-box').filter({ hasText: 'Result' }).getByRole('link').first()).toHaveAttribute('href', /source=home_box_results/);
        await expect(page.locator('.home-dense-box').filter({ hasText: 'Admit Card' }).getByRole('link').first()).toHaveAttribute('href', /source=home_box_admit/);
        await expect(page.locator('.home-dense-box').filter({ hasText: 'Answer Key' }).getByRole('link').first()).toHaveAttribute('href', /source=home_box_answer_key/);
        await expect(page.locator('.home-dense-box').filter({ hasText: 'Syllabus' }).getByRole('link').first()).toHaveAttribute('href', /source=home_box_syllabus/);
        await expect(page.locator('.home-dense-box').filter({ hasText: 'Admission' }).getByRole('link').first()).toHaveAttribute('href', /source=home_box_admission/);
        await expect(page.locator('.home-dense-box').filter({ hasText: 'Important' }).getByRole('link').first()).toHaveAttribute('href', /source=home_box_important/);
        await expect(page.locator('.home-dense-box').filter({ hasText: 'Certificate Verification' }).getByRole('link').first()).toHaveAttribute('href', /source=home_box_certificate/);
    });
});
