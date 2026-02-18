import { expect, test } from '@playwright/test';

test.describe('Frontend API integration', () => {
    test('health endpoint is reachable through frontend runtime', async ({ request, baseURL }) => {
        const response = await request.get(`${baseURL}/api/health`);
        expect(response.status(), 'Expected /api/health via frontend runtime to return 200').toBe(200);

        const body = await response.json();
        expect(body).toEqual(expect.objectContaining({ status: expect.any(String) }));
    });

    test('announcement cards endpoint is reachable through frontend runtime', async ({ request, baseURL }) => {
        const response = await request.get(`${baseURL}/api/announcements/v3/cards?type=job&limit=1`);
        expect(response.status(), 'Expected /api/announcements/v3/cards via frontend runtime to return 200').toBe(200);

        const body = await response.json();
        expect(Array.isArray(body?.data)).toBe(true);
        expect(typeof body?.hasMore).toBe('boolean');
    });
});
