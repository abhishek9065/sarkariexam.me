import { expect, test } from '@playwright/test';

test('admin login screen renders', async ({ page }) => {
    await page.goto('login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /SarkariExams Admin vNext/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in to Admin/i })).toBeVisible();
});
