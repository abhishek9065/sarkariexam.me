import { expect, test } from '@playwright/test';

test.describe('SarkariExams 2026 frontend', () => {
  test('homepage loads the new command center', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('homepage-hero')).toBeVisible();
    await expect(page.getByTestId('homepage-urgency')).toBeVisible();
    await expect(page.getByTestId('homepage-command-board')).toBeVisible();
    await expect(page.getByRole('search')).toBeVisible();
  });

  test('jobs category exposes filters and feed results', async ({ page }) => {
    await page.goto('/jobs');

    await expect(page.getByTestId('category-page-job')).toBeVisible();
    await expect(page.getByText('Filters that actually narrow the feed')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save search' })).toBeVisible();
  });

  test('mobile category drawer opens', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/jobs');

    await page.getByRole('button', { name: 'Mobile filters' }).click();
    await expect(page.getByText('Refine Latest Jobs')).toBeVisible();
  });

  test('detail page shows official actions and trust panel', async ({ page }) => {
    await page.goto('/job/upsc-civil-services-2026');

    await expect(page.getByTestId('detail-page')).toBeVisible();
    await expect(page.getByText('Primary actions')).toBeVisible();
    await expect(page.getByText('Before you act')).toBeVisible();
  });

  test('signed-out member pages show access prompts', async ({ page }) => {
    await page.goto('/bookmarks');
    await expect(page.getByText('Sign in to continue')).toBeVisible();

    await page.goto('/profile');
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  });
});
