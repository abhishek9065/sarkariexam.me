import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check for main heading
    await expect(page.locator('h1')).toContainText('SarkariExams.me');
    
    // Check for search input
    await expect(page.locator('input[type="search"]')).toBeVisible();
    
    // Check for navigation links
    await expect(page.locator('text=Latest Jobs')).toBeVisible();
    await expect(page.locator('text=Results')).toBeVisible();
    await expect(page.locator('text=Admit Cards')).toBeVisible();
  });

  test('should display announcement cards', async ({ page }) => {
    await page.goto('/');
    
    // Wait for content to load
    await page.waitForSelector('.portal-home-box-row', { timeout: 10000 });
    
    // Check that announcement cards are present
    const cards = page.locator('.portal-home-box-row');
    await expect(cards.first()).toBeVisible();
  });

  test('should perform search', async ({ page }) => {
    await page.goto('/');
    
    // Type in search box
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('UPSC');
    
    // Submit search
    await page.locator('button:has-text("Search")').click();
    
    // Should navigate to search results
    await expect(page).toHaveURL(/\/jobs\?q=UPSC/);
  });

  test('should show search suggestions', async ({ page }) => {
    await page.goto('/');
    
    // Type in search box
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('SSC');
    
    // Wait for suggestions to appear
    await page.waitForSelector('.portal-home-suggestions', { timeout: 5000 });
    
    // Check suggestions are visible
    const suggestions = page.locator('.portal-home-suggestion');
    await expect(suggestions.first()).toBeVisible();
  });

  test('should navigate to job details', async ({ page }) => {
    await page.goto('/');
    
    // Wait for cards to load
    await page.waitForSelector('.portal-home-box-row', { timeout: 10000 });
    
    // Click first job card
    const firstCard = page.locator('.portal-home-box-row').first();
    await firstCard.click();
    
    // Should navigate to detail page
    await expect(page).toHaveURL(/\/(job|result|admit-card|answer-key|syllabus|admission)\//);
  });

  test('should display statistics', async ({ page }) => {
    await page.goto('/');
    
    // Check for stats section
    await expect(page.locator('.portal-home-stats')).toBeVisible();
    
    // Check for stat items
    const stats = page.locator('.portal-home-stat');
    await expect(stats).toHaveCount(5);
  });

  test('should show ticker with latest updates', async ({ page }) => {
    await page.goto('/');
    
    // Check ticker is present
    await expect(page.locator('.portal-home-ticker')).toBeVisible();
    
    // Check ticker items
    const tickerItems = page.locator('.portal-home-ticker-item');
    await expect(tickerItems.first()).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check mobile navigation is visible
    await expect(page.locator('.mobile-bottom-nav')).toBeVisible();
    
    // Check content is still accessible
    await expect(page.locator('h1')).toBeVisible();
  });
});
