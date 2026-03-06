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
const detailRouteCases = [
    {
        type: 'job',
        path: '/job/ssc-cgl-recruitment-2026',
        slug: 'ssc-cgl-recruitment-2026',
        title: 'SSC CGL Recruitment 2026',
        category: 'Job',
        cta: 'Apply Online',
        browseLabel: 'Latest Jobs',
        relatedTitle: 'Railway Apprentice Recruitment 2026',
    },
    {
        type: 'result',
        path: '/result/upsc-nda-result-2026',
        slug: 'upsc-nda-result-2026',
        title: 'UPSC NDA Result 2026',
        category: 'Result',
        cta: 'Check Result',
        browseLabel: 'Results',
        relatedTitle: 'SSC JE Result 2026',
    },
    {
        type: 'admit-card',
        path: '/admit-card/railway-group-d-admit-card-2026',
        slug: 'railway-group-d-admit-card-2026',
        title: 'Railway Group D Admit Card 2026',
        category: 'Admit Card',
        cta: 'Download Admit Card',
        browseLabel: 'Admit Cards',
        relatedTitle: 'SSC CHSL Admit Card 2026',
    },
    {
        type: 'answer-key',
        path: '/answer-key/ssc-gd-answer-key-2026',
        slug: 'ssc-gd-answer-key-2026',
        title: 'SSC GD Answer Key 2026',
        category: 'Answer Key',
        cta: 'Download Answer Key',
        browseLabel: 'Answer Keys',
        relatedTitle: 'UP Police Answer Key 2026',
    },
    {
        type: 'admission',
        path: '/admission/cuet-ug-admission-2026',
        slug: 'cuet-ug-admission-2026',
        title: 'CUET UG Admission 2026',
        category: 'Admission',
        cta: 'Apply Now',
        browseLabel: 'Admissions',
        relatedTitle: 'Delhi University Admission 2026',
    },
    {
        type: 'syllabus',
        path: '/syllabus/ssc-cgl-syllabus-2026',
        slug: 'ssc-cgl-syllabus-2026',
        title: 'SSC CGL Syllabus 2026',
        category: 'Syllabus',
        cta: 'View Syllabus',
        browseLabel: 'Syllabus',
        relatedTitle: 'UPSC CDS Syllabus 2026',
    },
] as const;

function buildDetailAnnouncement(routeCase: (typeof detailRouteCases)[number]) {
    return {
        id: `${routeCase.type}-detail-1`,
        title: routeCase.title,
        slug: routeCase.slug,
        type: routeCase.type,
        category: routeCase.category,
        organization: 'Mock Board',
        content: `<p>${routeCase.title} official notification.</p>`,
        externalLink: `https://example.org/${routeCase.slug}`,
        location: 'India',
        deadline: '2026-04-15T00:00:00.000Z',
        minQualification: 'Graduate',
        ageLimit: '18-30 Years',
        applicationFee: 'General: Rs 100',
        totalPosts: 128,
        postedAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-06T00:00:00.000Z',
        isActive: true,
        viewCount: 512,
        tags: [{ id: 1, name: 'Featured', slug: 'featured' }],
        importantDates: [{ eventName: 'Last Date', eventDate: '2026-04-15T00:00:00.000Z' }],
    };
}

function buildRelatedCards(routeCase: (typeof detailRouteCases)[number]) {
    return [
        {
            id: `${routeCase.type}-related-1`,
            title: routeCase.relatedTitle,
            slug: `${routeCase.slug}-related`,
            type: routeCase.type,
            category: routeCase.category,
            organization: 'Mock Board',
            postedAt: '2026-03-05T00:00:00.000Z',
            viewCount: 88,
        },
        {
            id: `${routeCase.type}-related-2`,
            title: `${routeCase.title} Extension Notice`,
            slug: `${routeCase.slug}-extension`,
            type: routeCase.type,
            category: routeCase.category,
            organization: 'Mock Board',
            postedAt: '2026-03-04T00:00:00.000Z',
            viewCount: 64,
        },
    ];
}

async function mockDetailRouteApis(
    page: import('@playwright/test').Page,
    routeCase: (typeof detailRouteCases)[number],
    options: { bookmarked?: boolean; detailStatus?: number } = {},
) {
    const counters = {
        bookmarkListHits: 0,
        removeBookmarkHits: 0,
        addBookmarkHits: 0,
    };
    const detailAnnouncement = buildDetailAnnouncement(routeCase);

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

        if (path.endsWith('/api/auth/csrf')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: { csrfToken: 'detail-csrf-token' } }),
                headers: {
                    'set-cookie': 'csrf_token=detail-csrf-token; Path=/;',
                },
            });
        }

        if (path.endsWith(`/api/announcements/${routeCase.slug}`)) {
            const detailStatus = options.detailStatus ?? 200;
            if (detailStatus !== 200) {
                return route.fulfill({
                    status: detailStatus,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Announcement not found' }),
                });
            }
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: detailAnnouncement }),
            });
        }

        if (path.endsWith('/api/announcements/v3/cards')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    data: buildRelatedCards(routeCase),
                    nextCursor: null,
                    hasMore: false,
                }),
            });
        }

        if (path.endsWith('/api/bookmarks') && route.request().method() === 'GET') {
            counters.bookmarkListHits += 1;
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: options.bookmarked ? [detailAnnouncement] : [] }),
            });
        }

        if (path.endsWith(`/api/bookmarks/${detailAnnouncement.id}`) && route.request().method() === 'DELETE') {
            counters.removeBookmarkHits += 1;
            return route.fulfill({
                status: 204,
                contentType: 'application/json',
                body: '',
            });
        }

        if (path.endsWith('/api/bookmarks') && route.request().method() === 'POST') {
            counters.addBookmarkHits += 1;
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Saved' }),
            });
        }

        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: [] }),
        });
    });

    return counters;
}

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
        await expect.poll(() => homepageFeedHits, { timeout: 15_000 }).toBe(1);
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
        await expect.poll(() => homepageFeedHits, { timeout: 15_000 }).toBe(1);
        await expect.poll(() => bookmarkIdsHits, { timeout: 15_000 }).toBe(1);
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
        await expect.poll(async () => (await page.locator('main').textContent()) ?? '', { timeout: 15_000 }).toContain('No Admit Card updates yet');
        await expect.poll(async () => (await page.locator('main').textContent()) ?? '', { timeout: 15_000 }).toContain('Railway Group D Result 2026');
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

    for (const routeCase of detailRouteCases) {
        test(`${routeCase.type} detail route renders content, related links, bookmark state, and share controls`, async ({ page }) => {
            const counters = await mockDetailRouteApis(page, routeCase, { bookmarked: true });

            await page.goto(`${BASE_URL}${routeCase.path}`, { waitUntil: 'domcontentloaded' });

            await expect.poll(async () => (await page.locator('main').textContent()) ?? '', { timeout: 15_000 }).toContain(routeCase.title);
            await expect(page.getByRole('link', { name: new RegExp(routeCase.cta, 'i') }).first()).toBeVisible();
            await expect(page.locator('.sr-share-row').getByRole('button', { name: /Copy Link/i })).toBeVisible();
            await expect(page.locator('.sr-share-row').getByRole('link', { name: /WhatsApp/i })).toBeVisible();
            await expect(page.locator('.sr-related')).toContainText(routeCase.relatedTitle);

            const bookmarkButton = page.locator('.sr-action-bar button').first();
            await expect(bookmarkButton).toHaveText('🔖');
            await bookmarkButton.click();

            expect(counters.bookmarkListHits).toBe(1);
            await expect.poll(() => counters.removeBookmarkHits, { timeout: 15_000 }).toBe(1);
            expect(counters.addBookmarkHits).toBe(0);
        });
    }

    test('detail route shows not found fallback and browse action when announcement lookup fails', async ({ page }) => {
        const routeCase = detailRouteCases[0];
        await mockDetailRouteApis(page, routeCase, { detailStatus: 404 });

        await page.goto(`${BASE_URL}${routeCase.path}`, { waitUntil: 'domcontentloaded' });

        await expect.poll(async () => (await page.locator('main').textContent()) ?? '', { timeout: 15_000 }).toContain('Announcement Not Found');
        await expect(page.getByRole('link', { name: new RegExp(`Browse ${routeCase.browseLabel}`, 'i') })).toHaveAttribute('href', '/jobs');
        await expect(page.getByRole('link', { name: /Go Home/i })).toHaveAttribute('href', '/');
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
