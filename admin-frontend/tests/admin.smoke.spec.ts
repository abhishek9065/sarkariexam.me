import { expect, test } from '@playwright/test';

test('admin login screen renders on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('login', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /SarkariExams Admin vNext/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in to Admin/i })).toBeVisible();
});

test('admin shows desktop-required gate on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1200 });
    await page.goto('login', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /Desktop Required/i })).toBeVisible();
    await expect(page.getByText(/desktop-only/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in to Admin/i })).toHaveCount(0);
});
