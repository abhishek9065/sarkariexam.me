import { expect, test } from '@playwright/test';

const BASE_URL = process.env.CI_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const homepageFeedFixture = {
    data: {
        latest: [
            {
                id: 'result-1',
                title: 'Railway Group D Result 2026',
                slug: 'railway-group-d-result-2026',
                type: 'result',
                category: 'Result',
                organization: 'Railway Board',
                postedAt: '2026-03-05T10:00:00.000Z',
                viewCount: 128,
                isActive: true,
            },
            {
                id: 'job-1',
                title: 'SSC CGL Recruitment 2026',
                slug: 'ssc-cgl-recruitment-2026',
                type: 'job',
                category: 'Job',
                organization: 'SSC',
                postedAt: '2026-03-04T10:00:00.000Z',
                viewCount: 96,
                isActive: true,
            },
        ],
        sections: {
            job: [
                {
                    id: 'job-1',
                    title: 'SSC CGL Recruitment 2026',
                    slug: 'ssc-cgl-recruitment-2026',
                    type: 'job',
                    category: 'Job',
                    organization: 'SSC',
                    postedAt: '2026-03-04T10:00:00.000Z',
                    viewCount: 96,
                    isActive: true,
                },
            ],
            result: [
                {
                    id: 'result-1',
                    title: 'Railway Group D Result 2026',
                    slug: 'railway-group-d-result-2026',
                    type: 'result',
                    category: 'Result',
                    organization: 'Railway Board',
                    postedAt: '2026-03-05T10:00:00.000Z',
                    viewCount: 128,
                    isActive: true,
                },
            ],
            'admit-card': [],
            'answer-key': [],
            syllabus: [],
            admission: [],
        },
        generatedAt: '2026-03-06T00:00:00.000Z',
    },
};
const searchSuggestFixture = {
    data: [
        {
            title: 'Railway Group D Result 2026',
            slug: 'railway-group-d-result-2026',
            type: 'result',
            organization: 'Railway Board',
        },
    ],
};

test.describe('Site regression', () => {
    test('homepage shell and dense sections render', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveTitle(/SarkariExams\.me/i);
        await expect(page.locator('[data-testid="app-header"]')).toBeVisible();
        await expect(page.locator('[data-testid="app-footer"]')).toBeVisible();
        await expect(page.locator('[data-testid="home-featured-banner"]')).toHaveCount(0);
        await expect(page.locator('[data-testid="home-marquee"]')).toHaveCount(0);
        await expect(page.locator('[data-testid="home-v3-top-grid"]')).toBeVisible();
        await expect(page.locator('[data-testid="home-v3-bottom-grid"]')).toBeVisible();
        await expect(page.locator('[data-testid="home-v3-top-grid"] .home-dense-box-header h2').nth(0)).toHaveText('Result');
        await expect(page.locator('[data-testid="home-educational-content"]')).toHaveCount(0);
    });

    test('homepage anonymous load uses one homepage feed request and avoids per-type card fan-out', async ({ page }) => {
        let homepageFeedHits = 0;
        let cardsV3Hits = 0;
        let bookmarkIdsHits = 0;

        await page.route('**/api/**', async (route) => {
            const url = new URL(route.request().url());
            const path = url.pathname;

            if (path.endsWith('/api/auth/me')) {
                return route.fulfill({
                    status: 401,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Unauthorized' }),
                });
            }

            if (path.endsWith('/api/announcements/homepage')) {
                homepageFeedHits += 1;
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(homepageFeedFixture),
                });
            }

            if (path.endsWith('/api/announcements/v3/cards')) {
                cardsV3Hits += 1;
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: [], nextCursor: null, hasMore: false }),
                });
            }

            if (path.endsWith('/api/bookmarks/ids')) {
                bookmarkIdsHits += 1;
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: [] }),
                });
            }

            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: [] }),
            });
        });

        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('[data-testid="home-v3-top-grid"]')).toBeVisible();
        await expect(
            page.locator('[data-testid="home-v3-dense-box-results"]').getByRole('link', { name: /Railway Group D Result 2026/i }),
        ).toBeVisible();

        expect(homepageFeedHits).toBe(1);
        expect(cardsV3Hits).toBe(0);
        expect(bookmarkIdsHits).toBe(0);
    });

    test('homepage authenticated load uses homepage feed plus bookmark ids only', async ({ page }) => {
        let homepageFeedHits = 0;
        let cardsV3Hits = 0;
        let bookmarkIdsHits = 0;

        await page.addInitScript(() => {
            window.localStorage.setItem('token', 'test-user-token');
        });

        await page.route('**/api/**', async (route) => {
            const url = new URL(route.request().url());
            const path = url.pathname;

            if (path.endsWith('/api/auth/me')) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: {
                            user: {
                                id: 'u-1',
                                email: 'reader@example.com',
                                username: 'Reader',
                                role: 'user',
                            },
                        },
                    }),
                });
            }

            if (path.endsWith('/api/announcements/homepage')) {
                homepageFeedHits += 1;
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(homepageFeedFixture),
                });
            }

            if (path.endsWith('/api/bookmarks/ids')) {
                bookmarkIdsHits += 1;
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: ['job-1'] }),
                });
            }

            if (path.endsWith('/api/announcements/v3/cards')) {
                cardsV3Hits += 1;
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: [], nextCursor: null, hasMore: false }),
                });
            }

            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: [] }),
            });
        });

        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('[data-testid="home-v3-top-grid"]')).toBeVisible();
        await expect(page.getByRole('heading', { name: /Continue Reading/i })).toBeVisible();

        expect(homepageFeedHits).toBe(1);
        expect(bookmarkIdsHits).toBe(1);
        expect(cardsV3Hits).toBe(0);
    });

    test('homepage keeps empty dense sections stable when one section has no items', async ({ page }) => {
        await page.route('**/api/**', async (route) => {
            const url = new URL(route.request().url());
            const path = url.pathname;

            if (path.endsWith('/api/auth/me')) {
                return route.fulfill({
                    status: 401,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Unauthorized' }),
                });
            }

            if (path.endsWith('/api/announcements/homepage')) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(homepageFeedFixture),
                });
            }

            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: [] }),
            });
        });

        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('[data-testid="home-v3-dense-box-admit"]')).toContainText('No Admit Card updates yet');
        await expect(
            page.locator('[data-testid="home-v3-dense-box-results"]').getByRole('link', { name: /Railway Group D Result 2026/i }),
        ).toBeVisible();
    });

    test('predictive search does not prefetch on load and still fetches after typing', async ({ page }) => {
        let suggestHits = 0;

        await page.route('**/api/**', async (route) => {
            const url = new URL(route.request().url());
            const path = url.pathname;

            if (path.endsWith('/api/auth/me')) {
                return route.fulfill({
                    status: 401,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Unauthorized' }),
                });
            }

            if (path.endsWith('/api/announcements/homepage')) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(homepageFeedFixture),
                });
            }

            if (path.endsWith('/api/announcements/search/suggest')) {
                suggestHits += 1;
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(searchSuggestFixture),
                });
            }

            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: [] }),
            });
        });

        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);
        expect(suggestHits).toBe(0);

        const searchInput = page.getByRole('searchbox', { name: 'Search government exams and jobs' });
        await searchInput.fill('rail');

        await expect(page.locator('.hp-search-suggestions')).toBeVisible();
        await expect(page.locator('.hp-search-suggest-link').first()).toContainText('Railway Group D Result 2026');
        expect(suggestHits).toBe(1);
    });

    test('theme toggle is interactive', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        const toggle = page.getByRole('button', { name: 'Toggle theme' });
        await expect(toggle).toBeVisible();
        await toggle.click();
        const hasTheme = await page.evaluate(() => Boolean(document.documentElement.getAttribute('data-theme')));
        expect(hasTheme).toBe(true);
    });

    test('mobile header exposes hamburger control on small viewport', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(BASE_URL, { waitUntil: 'load' });
        const header = page.locator('[data-testid="app-header"]');
        const menuButton = header.getByRole('button', { name: 'Toggle menu' });
        await expect(menuButton).toBeVisible();
        await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });

    test('web manifest link exists', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest\.webmanifest|manifest\.json|manifest/i);
    });

    test('footer includes social and legal links', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        const footer = page.locator('[data-testid="app-footer"]');
        await expect(footer).toBeVisible();
        await expect(footer.locator('.footer-social-grid .footer-social-link')).toHaveCount(8);
        await expect(footer.getByRole('link', { name: 'Advertise With Us' })).toBeVisible();
    });

    test('advertise route resolves', async ({ page }) => {
        await page.goto(`${BASE_URL}/advertise`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: 'Advertise With Us' })).toBeVisible();
    });
});
