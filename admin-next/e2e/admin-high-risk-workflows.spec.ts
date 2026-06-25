import { expect, test, type Locator, type Page } from '@playwright/test';
import { mockAdminApi, MOCK_ADMIN } from './admin-api-mock';
import type { CmsPost } from '../lib/types';

const now = '2026-06-22T00:00:00.000Z';

const cmsPost: CmsPost = {
  id: 'e2e-post',
  title: 'E2E Staff Selection Draft',
  slug: 'e2e-staff-selection-draft',
  legacySlugs: [],
  type: 'job',
  status: 'draft',
  summary: 'Short summary for an isolated E2E draft.',
  shortInfo: 'E2E short info',
  body: 'Structured body for the isolated E2E draft.',
  organization: { name: 'E2E Commission', slug: 'e2e-commission' },
  categories: [{ name: 'Central Govt', slug: 'central-govt' }],
  states: [{ name: 'All India', slug: 'all-india' }],
  qualifications: [{ name: 'Graduate', slug: 'graduate' }],
  institution: null,
  exam: null,
  importantDates: [],
  eligibility: [],
  feeRules: [],
  vacancyRows: [],
  admissionPrograms: [],
  officialSources: [],
  trust: { verificationStatus: 'source_light', sourceCount: 0, hasPrimarySource: false },
  flags: {},
  home: {},
  updatedAt: now,
  createdAt: now,
  currentVersion: 1,
  readiness: {
    canSubmit: true,
    canApprove: true,
    canPublish: false,
    issueCount: 0,
    warningCount: 0,
    issues: [],
    warnings: [],
  },
  freshness: {
    archiveState: 'active',
    expiresSoon: false,
    isStale: false,
    needsReview: false,
  },
  seo: {
    effectiveTitle: 'E2E Staff Selection Draft',
    effectiveDescription: 'Short summary for an isolated E2E draft.',
    effectiveCanonicalPath: '/jobs/e2e-staff-selection-draft',
  },
};

const createdPost: CmsPost = {
  ...cmsPost,
  id: 'e2e-created-post',
  title: 'E2E Isolated Draft Post',
  slug: 'e2e-isolated-draft-post',
  summary: 'Created only through the Playwright mocked API.',
  body: 'This draft is saved only through the Playwright mocked API.',
};

const campaign = {
  id: 'campaign-failed',
  title: 'Failed E2E Campaign',
  body: 'A failed campaign fixture.',
  url: 'https://example.test/e2e',
  segment: { type: 'all', value: 'all' },
  status: 'failed',
  sentCount: 10,
  failedCount: 2,
  createdAt: now,
  scheduledAt: null,
  sentAt: null,
};

function fieldAfterLabel(pageOrLocator: Page | Locator, label: string, field: 'input' | 'textarea' = 'input') {
  return pageOrLocator.locator('label', { hasText: new RegExp(`^${label}$`) }).locator(`xpath=following-sibling::${field}`);
}

function dashboardResponses() {
  return {
    '/editorial/dashboard': {
      data: {
        total: 1,
        published: 0,
        inReview: 1,
        byType: { job: 1 },
        byStatus: { draft: 1, in_review: 1, published: 0, archived: 0, approved: 0 },
        recentPosts: [cmsPost],
      },
    },
    '/editorial/workflow/pending': { data: [cmsPost] },
    '/editorial/workflow/sla': { data: [] },
    '/editorial/workflow/freshness': { data: [{ ...cmsPost, id: 'stale-post', title: 'Stale E2E Post' }] },
    '/admin/upcoming-deadlines': { data: [{ id: 'deadline-1', title: 'E2E Deadline', deadline: '2026-07-01T00:00:00.000Z', type: 'job', daysLeft: 7 }] },
    'GET /admin/campaigns': { data: [campaign] },
    '/editorial/workflow/seo': { data: [cmsPost] },
    '/admin/seo-metrics': {
      data: {
        metrics: { total: 1, withMeta: 0, indexed: 1, withSchema: 0, healthScore: 72 },
        queries: [],
        coverage: { indexed: 1, noindex: 0, missing: 0 },
      },
    },
    '/admin/health': {
      data: {
        health: { status: 'healthy', checks: { database: { status: 'up', latency: 12 }, memory: { status: 'up', usage: 40 } } },
        services: { services: [{ name: 'api', status: 'up' }, { name: 'worker', status: 'up' }] },
        errors: [],
      },
    },
    '/admin/subscribers/stats': {
      data: { total: 5, verified: 4, unverified: 1, active: 4, inactive: 1, byFrequency: [] },
    },
    '/editorial/audit-log': { data: [], total: 0, count: 0 },
  };
}

test.describe('highest-risk admin workflows', () => {
  test('dashboard exposes the critical action queue', async ({ page }) => {
    await mockAdminApi(page, { responses: dashboardResponses() });

    await page.goto('/admin');

    await expect(page.getByRole('heading', { name: 'What needs attention now' })).toBeVisible();
    for (const label of [
      'Review pending posts',
      'Fix stale / expiring',
      'Retry failed campaigns',
      'Open SEO issues',
      'Check system health',
    ]) {
      await expect(page.getByRole('link', { name: new RegExp(label) })).toBeVisible();
    }
  });

  test('CMS list filters and mocked draft creation work without production writes', async ({ page }) => {
    test.setTimeout(60_000);
    const writeRequests: string[] = [];
    await mockAdminApi(page, {
      responses: {
        'GET /editorial/posts': { data: [cmsPost], total: 1, count: 1 },
        'POST /editorial/posts': { data: createdPost },
        'GET /editorial/posts/e2e-created-post': { data: createdPost },
        '/editorial/posts/e2e-created-post/history': { data: { versions: [], audit: [] } },
        '/editorial/posts/e2e-created-post/alert-preview': { data: { total: 0, instant: 0, daily: 0, weekly: 0 } },
      },
      onRequest: request => {
        if (request.method() !== 'GET' && request.method() !== 'OPTIONS') writeRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
      },
    });

    await page.goto('/admin/announcements');

    await expect(page.getByRole('heading', { name: 'Editorial CMS' })).toBeVisible();
    await expect(page.getByPlaceholder('Search title, slug, or keywords')).toBeVisible();
    await expect(page.locator('select').filter({ hasText: 'All Status' })).toBeVisible();
    await expect(page.locator('select').filter({ hasText: 'All Types' })).toBeVisible();

    await page.getByRole('main').getByRole('link', { name: 'New Post' }).click();
    await expect(page).toHaveURL(/\/admin\/announcements\/new$/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Create Post' })).toBeVisible();
    await fieldAfterLabel(page, 'Title').fill('E2E Isolated Draft Post');
    await fieldAfterLabel(page, 'Summary', 'textarea').fill('Created only through the Playwright mocked API.');
    await fieldAfterLabel(page, 'Body', 'textarea').fill('This draft is saved only through the Playwright mocked API.');
    await fieldAfterLabel(page, 'Organization').fill('E2E Commission');
    await page.getByRole('button', { name: 'Save Draft' }).click();

    await expect(page.getByText('Draft saved.')).toBeVisible();
    expect(writeRequests).toContain('POST /api-e2e/editorial/posts');
    expect(writeRequests.every((entry) => entry.startsWith('POST /api-e2e/'))).toBe(true);
  });

  test('campaign creation validates required fields and saves only through the mocked API', async ({ page }) => {
    const writeRequests: string[] = [];
    await mockAdminApi(page, {
      responses: {
        'GET /admin/campaigns': { data: [campaign] },
        'POST /admin/campaigns': { data: { id: 'campaign-draft' }, message: 'Campaign saved as draft.' },
        '/admin/campaigns/campaign-failed/stats': { data: { total: 12, sent: 10, failed: 2, byChannel: [], recentFailures: [] } },
        '/admin/segments': {
          data: {
            segments: { states: ['All India'], categories: ['Central Govt'], organizations: [], qualifications: [] },
            counts: [{ type: 'all', value: 'all', count: 5 }],
          },
        },
      },
      onRequest: request => {
        if (request.method() !== 'GET' && request.method() !== 'OPTIONS') writeRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
      },
    });

    await page.goto('/admin/notifications');

    await expect(page.getByRole('banner').getByText('Campaigns / Notifications')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Campaign Management' })).toBeVisible();
    await page.getByRole('button', { name: 'Create Campaign' }).click();
    const dialog = page.getByRole('dialog', { name: 'Create Campaign' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Save as draft' }).click();
    await expect(dialog.getByText('Title is required.')).toBeVisible();
    await expect(dialog.getByText('Body is required.')).toBeVisible();

    await dialog.getByLabel('Title').fill('E2E Draft Campaign');
    await dialog.getByLabel('Body').fill('This campaign is saved through Playwright API mocks only.');
    await dialog.getByLabel('URL').fill('https://example.test/e2e-campaign');
    await dialog.getByRole('button', { name: 'Save as draft' }).click();

    await expect(dialog).toBeHidden();
    expect(writeRequests).toContain('POST /api-e2e/admin/campaigns');
    expect(writeRequests.every((entry) => entry.startsWith('POST /api-e2e/'))).toBe(true);
  });

  test('users actions require confirmation, audit reason, and block self-actions', async ({ page }) => {
    await mockAdminApi(page, {
      responses: {
        '/admin/users': {
          data: [
            MOCK_ADMIN,
            { id: 'target-admin', email: 'target-admin@example.test', username: 'Target Admin', role: 'admin', isActive: true },
          ],
          total: 2,
          count: 2,
        },
      },
    });

    await page.goto('/admin/users');

    const selfRow = page.getByRole('row').filter({ hasText: MOCK_ADMIN.email });
    await expect(selfRow.getByRole('button', { name: 'Demote to user' })).toBeDisabled();
    await expect(selfRow.getByRole('button', { name: 'Deactivate' })).toBeDisabled();
    await expect(selfRow.getByRole('button', { name: 'Delete' })).toBeDisabled();

    const targetRow = page.getByRole('row').filter({ hasText: 'target-admin@example.test' });
    await targetRow.getByRole('button', { name: 'Deactivate' }).click();

    const dialog = page.getByRole('dialog', { name: 'Confirm deactivation' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('This action affects production access and will be written to the audit log.')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Confirm change' })).toBeDisabled();

    await dialog.getByLabel('Audit reason').fill('E2E safety confirmation');
    await expect(dialog.getByRole('button', { name: 'Confirm change' })).toBeEnabled();
  });

  test('SEO workflow renders filters and issue list states without crashing', async ({ page }) => {
    await mockAdminApi(page, {
      responses: {
        '/admin/seo-metrics': {
          data: {
            metrics: { total: 1, withMeta: 0, indexed: 1, withSchema: 0, healthScore: 55 },
            queries: [{ _id: 'e2e exam', count: 3, lastSearched: now }],
            coverage: { indexed: 1, noindex: 0, missing: 0 },
          },
        },
        '/editorial/posts': { data: [cmsPost], total: 1, count: 1 },
      },
    });

    await page.goto('/admin/seo');

    await expect(page.getByRole('heading', { name: 'SEO Dashboard' })).toBeVisible();
    await expect(page.getByText('SEO Issue Workflow')).toBeVisible();
    await expect(page.getByRole('combobox').filter({ hasText: 'All issue types' })).toBeVisible();
    await expect(page.getByRole('combobox').filter({ hasText: 'All post types' })).toBeVisible();
    await expect(page.getByRole('combobox').filter({ hasText: 'All statuses' })).toBeVisible();
    await expect(page.getByText('Missing meta title').first()).toBeVisible();
    await expect(page.getByText('E2E Staff Selection Draft').first()).toBeVisible();
  });

  test('community moderation tabs render without mutating real content', async ({ page }) => {
    await mockAdminApi(page, {
      responses: {
        '/admin/comments-pending': {
          data: [{ id: 'comment-1', username: 'Reader', body: 'Please approve this E2E comment?', postId: 'post-1', createdAt: now }],
        },
        '/admin/community/qa': {
          data: [{ id: 'qa-1', author: 'Candidate', question: 'When is the result?', answer: null, createdAt: now }],
          total: 1,
          count: 1,
        },
        '/admin/community/flags': { data: [], total: 0, count: 0 },
      },
    });

    await page.goto('/admin/community');

    await expect(page.getByRole('heading', { name: 'Community Moderation' })).toBeVisible();
    for (const tabName of ['Pending Comments', 'Q&A', 'Flags / Reports', 'Resolved']) {
      await expect(page.getByRole('tab', { name: new RegExp(tabName) })).toBeVisible();
    }
    await expect(page.getByText('Please approve this E2E comment?')).toBeVisible();
  });
});
