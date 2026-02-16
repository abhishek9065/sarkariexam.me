import { expect, test } from '@playwright/test';

test('admin login screen renders', async ({ page }) => {
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Admin Sign In/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in/i })).toBeVisible();
});
