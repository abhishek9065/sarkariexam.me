import { expect, test } from '@playwright/test';

test.use({
    storageState: {
        cookies: [],
        origins: [
            {
                origin: 'http://127.0.0.1:4173',
                localStorage: [
                    { name: 'token', value: 'test-admin-token' },
                ],
            },
        ],
    },
});

const overviewFixture = {
    data: {
        totalAnnouncements: 12,
        totalViews: 220,
        totalEmailSubscribers: 5,
        totalPushSubscribers: 2,
        totalSearches: 18,
        totalBookmarks: 4,
        totalRegistrations: 3,
        totalSubscriptionsVerified: 2,
        totalSubscriptionsUnsubscribed: 0,
        totalListingViews: 50,
        totalCardClicks: 31,
        totalCardClicksInApp: 12,
        totalCategoryClicks: 9,
        totalFilterApplies: 11,
        totalDigestClicks: 0,
        totalDeepLinkClicks: 3,
        engagementWindowDays: 30,
        rollupLastUpdatedAt: new Date().toISOString(),
        dailyRollups: [],
        typeBreakdown: [],
        categoryBreakdown: [],
        topSearches: [],
        ctrByType: [],
        digestClicks: { total: 0, variants: [], frequencies: [], campaigns: [] },
        deepLinkAttribution: { total: 0, sources: [], mediums: [], campaigns: [] },
        anomalies: [],
        comparison: {
            viewsDeltaPct: 100,
            searchesDeltaPct: 0,
            ctrDeltaPct: 0,
            dropOffDeltaPct: 0,
            compareDays: 30,
        },
        funnel: {
            listingViews: 50,
            cardClicks: 12,
            cardClicksRaw: 31,
            cardClicksInApp: 12,
            detailViews: 12,
            detailViewsRaw: 31,
            detailViewsAdjusted: 12,
            detailViewsDirect: 19,
            detailViewsUnattributed: 0,
            hasAnomaly: false,
            bookmarkAdds: 4,
            subscriptionsVerified: 2,
        },
        insights: {
            viewTrendPct: 100,
            viewTrendDirection: 'up',
            viewTrendMode: 'baseline',
            clickThroughRate: 24,
            funnelDropRate: 76,
            listingCoverage: 12.5,
            listingCoverageWindowPct: 12.5,
            listingCoverageAllTimePct: 9.3,
            attributionCoveragePct: 85.0,
            topType: null,
            topCategory: null,
            anomaly: false,
            rollupAgeMinutes: 5,
            healthFlags: {
                zeroListingEvents: false,
                staleRollups: false,
                inAppClickCollapse: false,
                staleThresholdMinutes: 45,
            },
        },
        lastUpdated: new Date().toISOString(),
    },
    cached: false,
};

test.describe('Admin analytics local integrity', () => {
    test('renders in-app primary metrics, attribution coverage, and baseline trend messaging', async ({ page }) => {
        await page.route('**/api/**', async (route) => {
            const url = new URL(route.request().url());
            const path = url.pathname;

            if (path.includes('/api/auth/me')) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: {
                            user: {
                                id: 'u1',
                                email: 'admin@example.com',
                                username: 'Admin User',
                                role: 'admin',
                            },
                        },
                    }),
                });
            }

            if (path.includes('/api/auth/admin/permissions')) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: {
                            role: 'admin',
                            roles: { admin: ['*'] },
                            tabs: {},
                            highRiskActions: [],
                        },
                    }),
                });
            }

            if (path.includes('/api/analytics/overview')) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(overviewFixture),
                });
            }

            if (path.includes('/api/analytics/popular')) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: [] }),
                });
            }

            if (path.includes('/api/health')) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ status: 'ok', meta: { featureFlags: {} } }),
                });
            }

            if (path.includes('/api/admin/announcements')) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: [], total: 0 }),
                });
            }

            if (
                path.includes('/api/admin/dashboard')
                || path.includes('/api/admin/active-users')
                || path.includes('/api/admin/announcements/summary')
                || path.includes('/api/admin/sessions')
                || path.includes('/api/auth/admin/2fa/backup-codes/status')
            ) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: {} }),
                });
            }

            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: {} }),
            });
        });

        await page.goto('/admin');

        await expect(page.getByRole('heading', { name: /Operations Hub/i })).toBeVisible();
        await expect(page.getByText('Card clicks (in-app)')).toBeVisible();
        await expect(page.getByText('Card clicks (all sources)')).toBeVisible();
        await expect(page.getByText('New baseline')).toBeVisible();

        const coverageCard = page.locator('.insight-card').filter({ hasText: 'Tracking coverage' }).first();
        await expect(coverageCard).toContainText('85.0%');
    });
});
