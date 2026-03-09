import { test, expect } from '@playwright/test';

test.describe('Next.js Site Regression Suites', () => {
  
  test('Homepage smoke test', async ({ page }) => {
    // Navigate to local dev server
    await page.goto('/');

    // Check title matches new metadata
    await expect(page).toHaveTitle(/SarkariExams.me/i);

    // Check header structural elements
    const header = page.locator('header');
    await expect(header).toBeVisible();
    await expect(header.getByText('SarkariExams', { exact: false })).toBeVisible();

    // The header should contain a "Log In" button since user is anonymous
    const loginButton = page.getByRole('button', { name: /Log In/i });
    await expect(loginButton).toBeVisible();

    // Check the main grid layout exists
    await expect(page.locator('.home-grid')).toBeVisible();

    // Check column headers exist
    const resultHeader = page.getByRole('heading', { name: 'Results' });
    const admitCardHeader = page.getByRole('heading', { name: 'Admit Cards' });
    const newJobsHeader = page.getByRole('heading', { name: 'Latest Jobs' });
    
    await expect(resultHeader).toBeVisible();
    await expect(admitCardHeader).toBeVisible();
    await expect(newJobsHeader).toBeVisible();
  });

  test('Auth modal triggers from header', async ({ page }) => {
    await page.goto('/');
    
    // Click login
    await page.getByRole('button', { name: /Log In/i }).click();

    // Verify modal appears
    const modal = page.locator('.auth-modal-content');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();

    // Switch to register tab
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(modal.getByRole('heading', { name: 'Create an Account' })).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: '✕' }).click();
    await expect(modal).toBeHidden();
  });

  test('Explore page features interactive search', async ({ page }) => {
    await page.goto('/explore');

    // Title should contain Explore 
    await expect(page.getByRole('heading', { name: /Explore SarkariExams/i })).toBeVisible();

    // Search input should be present
    const searchInput = page.getByPlaceholder('Search for SSC, UPSC, results...');
    await expect(searchInput).toBeVisible();

    // Trending searches should be visible
    await expect(page.getByText('Trending Searches')).toBeVisible();

    // Execute a search
    await searchInput.fill('Railway');
    await page.getByRole('button', { name: 'Search' }).click();

    // Check URL updated
    await expect(page).toHaveURL(/.*q=Railway/);
    await expect(page.getByRole('heading', { name: /Search Results/i })).toBeVisible();
  });

  test('Static Pages Resolution', async ({ page }) => {
    // About
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: 'About SarkariExams' })).toBeVisible();

    // Privacy
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();

    // Contact
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: 'Contact Us' })).toBeVisible();
    await expect(page.getByPlaceholder('john@example.com')).toBeVisible();
  });

  test('Theme integration works', async ({ page }) => {
    await page.goto('/');

    const themeToggle = page.getByRole('button', { name: 'Toggle theme' }).first();
    await expect(themeToggle).toBeVisible();
    
    // Click toggle to switch theme 
    // Wait for the data-theme attribute on body/html
    await themeToggle.click();
    
    const isDark = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') === 'dark' || 
             document.body.getAttribute('data-theme') === 'dark';
    });
    expect(isDark).toBe(true);
  });

  test('Detail page renders full content layout', async ({ page }) => {
    // Navigate using a valid ID from the site data 
    // Since it's SSR, we just hit a route that triggers the Next.js not-found if it fails, or the page rendering
    // For smoke testing without backend, we can check a generic dynamic route
    await page.goto('/job/ssc-cgl-recruitment-2026');
    
    // Check breadcrumbs and job title logic
    const mainArea = page.locator('main');
    await expect(mainArea).toBeVisible();
    
    // Check if right sidebar exists
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // The Apply Online or Important Links buttons should be present
    const bookmarkBtn = page.getByRole('button', { name: 'Save for later' }).first();
    await expect(bookmarkBtn).toBeVisible();
  });
});
