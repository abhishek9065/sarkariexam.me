import { expect, test } from '@playwright/test';

const BASE_URL = process.env.CI_BASE_URL || 'http://127.0.0.1:4173';

test.describe('frontend error boundary', () => {
    test('resets after navigation away from a crashing route', async ({ page }) => {
        await page.goto(`${BASE_URL}/__e2e/error-boundary/crash`, { waitUntil: 'domcontentloaded' });

        await expect(page.getByRole('heading', { name: /Something went wrong/i })).toBeVisible();
        await expect(page.getByText(/Intentional e2e route crash/i)).toBeVisible();

        await page.goto(`${BASE_URL}/__e2e/error-boundary/ok`, { waitUntil: 'domcontentloaded' });

        await expect(page.getByTestId('e2e-error-boundary-ok')).toBeVisible();
        await expect(page.getByRole('heading', { name: /Something went wrong/i })).toHaveCount(0);
    });
});
