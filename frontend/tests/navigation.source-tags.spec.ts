import { expect, test } from '@playwright/test';

const BASE_URL = process.env.CI_BASE_URL || 'http://127.0.0.1:4173';

test.describe('Navigation source tags', () => {
    test('homepage dense-box links carry canonical source tags', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        await expect(page.locator('[data-testid="home-v3-dense-box-jobs"] .home-dense-box-link').first()).toHaveAttribute('href', /source=home_box_jobs/);
        await expect(page.locator('[data-testid="home-v3-dense-box-results"] .home-dense-box-link').first()).toHaveAttribute('href', /source=home_box_results/);
        await expect(page.locator('[data-testid="home-v3-dense-box-admit"] .home-dense-box-link').first()).toHaveAttribute('href', /source=home_box_admit/);
        await expect(page.locator('[data-testid="home-v3-dense-box-answer-key"] .home-dense-box-link').first()).toHaveAttribute('href', /source=home_box_answer_key/);
        await expect(page.locator('[data-testid="home-v3-dense-box-syllabus"] .home-dense-box-link').first()).toHaveAttribute('href', /source=home_box_syllabus/);
        await expect(page.locator('[data-testid="home-v3-dense-box-admission"] .home-dense-box-link').first()).toHaveAttribute('href', /source=home_box_admission/);
        await expect(page.locator('[data-testid="home-v3-dense-box-important"] .home-dense-box-link').first()).toHaveAttribute('href', /source=home_box_important/);
        await expect(page.locator('[data-testid="home-v3-dense-box-certificate"] .home-dense-box-link').first()).toHaveAttribute('href', /source=home_box_certificate/);
    });
});
