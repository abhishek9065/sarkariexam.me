import { expect, test } from '@playwright/test';
import { mockAdminApi, MOCK_ADMIN } from './admin-api-mock';

test.describe('admin authentication', () => {
  test('an unauthenticated admin route shows the login screen', async ({ page }) => {
    await mockAdminApi(page, { authenticated: false });
    await page.goto('/admin/users');

    await expect(page.getByText('Admin Console', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('the login page renders without credentials', async ({ page }) => {
    await mockAdminApi(page, { authenticated: false });
    await page.goto('/admin/login');

    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByText('Sign in to manage SarkariExams.me')).toBeVisible();
  });
});

test.describe('authenticated admin shell', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page);
  });

  test('dashboard renders with a mocked admin session', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByRole('heading', { name: 'What needs attention now' })).toBeVisible();
    await expect(page.getByText(MOCK_ADMIN.username, { exact: true }).first()).toBeVisible();
  });

  test('sidebar exposes the critical navigation links', async ({ page }) => {
    await page.goto('/admin');
    const sidebar = page.locator('aside');

    for (const name of [
      'Dashboard',
      'Tasks / Workflow',
      'Calendar',
      'All Posts',
      'Campaigns / Notifications',
      'Analytics',
      'SEO',
      'Users',
      'System Admin',
      'Settings',
    ]) {
      await expect(sidebar.getByRole('link', { name, exact: true })).toBeVisible();
    }
  });

  test('admin-only routes show access denied for editorial roles', async ({ page }) => {
    await mockAdminApi(page, {
      user: { ...MOCK_ADMIN, id: 'e2e-editor', email: 'editor-e2e@example.test', username: 'E2E Editor', role: 'editor' },
    });

    await page.goto('/admin/users');

    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
    await expect(page.getByText('Your role does not have access to this admin page.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0);
  });
});

test('analytics renders API values instead of fake or demo numbers', async ({ page }) => {
  await mockAdminApi(page, {
    responses: {
      '/admin/analytics/overview': {
        data: {
          totalAnnouncements: 0,
          totalViews: 0,
          totalSearches: 19,
          totalEmailSubscribers: 0,
          totalPushSubscribers: 0,
          totalListingViews: 17,
          totalCardClicks: 23,
          clickThroughRate: 0,
          funnelDropRate: 0,
          viewTrend: { pct: 0, direction: 'flat' },
          typeBreakdown: [],
          categoryBreakdown: [],
          dailyRollups: [
            { date: '2026-06-21', views: 13, searches: 7 },
            { date: '2026-06-22', views: 16, searches: 12 },
          ],
          topSearches: [],
          comparison: { viewsDeltaPct: 0, searchesDeltaPct: 0, ctrDeltaPct: 0, dropOffDeltaPct: 0, compareDays: 30 },
          anomalies: [],
        },
        cached: false,
      },
      '/admin/analytics/content': { data: [] },
      '/admin/analytics/live': {
        data: { activeUsers: 0, pageViews: 0, trendingSearches: [], topContent: [], geoData: [], timestamp: '2026-06-22T00:00:00.000Z' },
      },
    },
  });
  await page.goto('/admin/analytics');

  for (const [label, value] of [
    ['Tracked detail views · 30d', '29'],
    ['Listing views · 30d', '17'],
    ['Searches · 30d', '19'],
    ['Card clicks · 30d', '23'],
  ]) {
    await expect(page.locator('div').filter({ hasText: label }).filter({ hasText: value }).last()).toBeVisible();
  }
  await expect(page.getByText(/demo data|sample data|mock data/i)).toHaveCount(0);
});

test('user deletion requires explicit confirmation and an audit reason', async ({ page }) => {
  let deleteRequests = 0;
  await mockAdminApi(page, {
    responses: {
      '/admin/users': {
        data: [
          MOCK_ADMIN,
          { id: 'target-user', email: 'target@example.test', username: 'Target User', role: 'user', isActive: true },
        ],
        total: 2,
        count: 2,
      },
    },
    onRequest: request => {
      if (request.method() === 'DELETE') deleteRequests += 1;
    },
  });
  await page.goto('/admin/users');

  const targetRow = page.getByRole('row').filter({ hasText: 'target@example.test' });
  await targetRow.getByRole('button', { name: 'Delete' }).click();

  const dialog = page.getByRole('dialog', { name: 'Confirm user deletion' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Deletion cannot be undone.')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Delete user' })).toBeDisabled();
  expect(deleteRequests).toBe(0);

  await dialog.getByLabel('Audit reason').fill('E2E confirmation check');
  await expect(dialog.getByRole('button', { name: 'Delete user' })).toBeEnabled();
  expect(deleteRequests).toBe(0);
});

test('settings does not claim that an unavailable password change succeeded', async ({ page }) => {
  await mockAdminApi(page, {
    responses: {
      '/admin/settings': {
        data: {
          siteName: 'SarkariExams.me',
          siteDescription: 'Government exam updates',
          frontendUrl: 'https://example.test',
          contactEmail: 'contact@example.test',
          defaultMetaTitle: 'SarkariExams.me',
          defaultMetaDescription: 'Government exam updates',
          googleAnalyticsId: '',
          twitterUrl: '',
          telegramUrl: '',
          youtubeUrl: '',
          maintenanceMode: false,
          registrationEnabled: true,
          featureFlags: {},
        },
      },
    },
  });
  await page.goto('/admin/settings');

  await expect(page.getByText('Admin Password', { exact: true })).toBeVisible();
  await expect(page.getByText('Password changes are not available from this console yet.')).toBeVisible();
  await expect(page.getByText(/password (changed|updated|change) successfully/i)).toHaveCount(0);
});
