import { expect, test } from '@playwright/test';

const BASE_URL = process.env.CI_BASE_URL || 'http://127.0.0.1:4173';

test.describe('Navigation source tags', () => {
    test('homepage dense-box links carry canonical source tags', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        await expect(page.getByTestId('home-v3-dense-box-jobs').getByRole('link').first()).toHaveAttribute('href', /source=home_box_jobs/);
        await expect(page.getByTestId('home-v3-dense-box-results').getByRole('link').first()).toHaveAttribute('href', /source=home_box_results/);
        await expect(page.getByTestId('home-v3-dense-box-admit').getByRole('link').first()).toHaveAttribute('href', /source=home_box_admit/);
        await expect(page.getByTestId('home-v3-dense-box-answer-key').getByRole('link').first()).toHaveAttribute('href', /source=home_box_answer_key/);
        await expect(page.getByTestId('home-v3-dense-box-syllabus').getByRole('link').first()).toHaveAttribute('href', /source=home_box_syllabus/);
        await expect(page.getByTestId('home-v3-dense-box-admission').getByRole('link').first()).toHaveAttribute('href', /source=home_box_admission/);
        await expect(page.getByTestId('home-v3-dense-box-important').getByRole('link').first()).toHaveAttribute('href', /source=home_box_important/);
        await expect(page.getByTestId('home-v3-dense-box-certificate').getByRole('link').first()).toHaveAttribute('href', /source=home_box_certificate/);
    });
});
