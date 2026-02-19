import { expect, test, type APIRequestContext } from '@playwright/test';

const adminEmail = process.env.ADMIN_E2E_EMAIL ?? 'admin.integration@sarkariexams.me';
const adminPassword = process.env.ADMIN_E2E_PASSWORD ?? 'Password#12345';
const adminSetupKey = process.env.ADMIN_E2E_SETUP_KEY ?? 'setup-admin-123';

type JsonObject = Record<string, unknown>;

async function getCsrfToken(api: APIRequestContext): Promise<string> {
    const response = await api.get('/api/auth/csrf');
    expect(response.ok()).toBe(true);
    const body = (await response.json()) as { data?: { csrfToken?: string } };
    const token = body?.data?.csrfToken;
    expect(typeof token).toBe('string');
    return token as string;
}

async function ensureAdminAccount(api: APIRequestContext): Promise<void> {
    const statusResponse = await api.get('/api/auth/admin/setup-status');
    expect(statusResponse.ok()).toBe(true);
    const statusBody = (await statusResponse.json()) as { needsSetup?: boolean };

    if (!statusBody?.needsSetup) return;

    const csrfToken = await getCsrfToken(api);
    const setupResponse = await api.post('/api/auth/admin/setup', {
        headers: {
            'X-CSRF-Token': csrfToken,
        },
        data: {
            email: adminEmail,
            password: adminPassword,
            name: 'Admin Integration',
            setupKey: adminSetupKey,
        },
    });

    expect(setupResponse.status(), await setupResponse.text()).toBe(201);
}

async function apiJson(response: Awaited<ReturnType<APIRequestContext['get']>>): Promise<JsonObject> {
    return (await response.json()) as JsonObject;
}

test('admin real backend integration flow validates auth + privileged operations', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await ensureAdminAccount(page.request);

    await page.goto('login', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('admin@sarkariexams.me').fill(adminEmail);
    await page.getByPlaceholder('Password').fill(adminPassword);
    await page.getByRole('button', { name: /Sign in to Admin/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /Operations Dashboard/i })).toBeVisible();

    const meResponse = await page.request.get('/api/admin-auth/me');
    expect(meResponse.ok(), await meResponse.text()).toBe(true);
    const meBody = await apiJson(meResponse);
    expect((meBody.data as JsonObject)?.user).toBeTruthy();

    const permissionsResponse = await page.request.get('/api/admin-auth/permissions');
    expect(permissionsResponse.ok(), await permissionsResponse.text()).toBe(true);
    const permissionsBody = await apiJson(permissionsResponse);
    expect((permissionsBody.data as JsonObject)?.role).toBeTruthy();

    const csrfToken = await getCsrfToken(page.request);
    const stepUpResponse = await page.request.post('/api/admin-auth/step-up', {
        headers: {
            'X-CSRF-Token': csrfToken,
        },
        data: {
            email: adminEmail,
            password: adminPassword,
        },
    });
    expect(stepUpResponse.ok(), await stepUpResponse.text()).toBe(true);
    const stepUpBody = await apiJson(stepUpResponse);
    const stepUpData = (stepUpBody.data ?? {}) as JsonObject;
    const stepUpToken = stepUpData.token;
    expect(typeof stepUpToken).toBe('string');

    const mutationHeaders = {
        'X-CSRF-Token': csrfToken,
        'X-Admin-Step-Up-Token': String(stepUpToken),
        'Idempotency-Key': `admin-int-${Date.now()}`,
    };

    const reviewPreviewResponse = await page.request.post('/api/admin/review/preview', {
        headers: {
            'X-CSRF-Token': csrfToken,
        },
        data: {
            ids: ['integration-announcement-1'],
            action: 'approve',
        },
    });
    expect(reviewPreviewResponse.ok(), await reviewPreviewResponse.text()).toBe(true);
    const reviewPreviewBody = await apiJson(reviewPreviewResponse);
    expect(Array.isArray((reviewPreviewBody.data as JsonObject)?.warnings)).toBe(true);

    const bulkExecuteResponse = await page.request.post('/api/admin/announcements/bulk', {
        headers: mutationHeaders,
        data: {
            ids: ['integration-announcement-1'],
            data: { status: 'draft' },
        },
    });
    expect(bulkExecuteResponse.ok(), await bulkExecuteResponse.text()).toBe(true);

    const reviewExecuteResponse = await page.request.post('/api/admin/announcements/bulk-approve', {
        headers: mutationHeaders,
        data: {
            ids: ['integration-announcement-1'],
            note: 'Integration review execute',
        },
    });
    expect(reviewExecuteResponse.ok(), await reviewExecuteResponse.text()).toBe(true);

    const terminateOthersResponse = await page.request.post('/api/admin-auth/sessions/terminate-others', {
        headers: mutationHeaders,
    });
    expect(terminateOthersResponse.ok(), await terminateOthersResponse.text()).toBe(true);
    const terminateOthersBody = await apiJson(terminateOthersResponse);
    const terminateOthersData = (terminateOthersBody.data ?? {}) as JsonObject;
    expect(terminateOthersData.success).toBe(true);
    expect(
        typeof terminateOthersData.removed === 'number'
            || typeof terminateOthersData.terminatedCount === 'number'
    ).toBe(true);

    const terminateSingleResponse = await page.request.post('/api/admin-auth/sessions/terminate', {
        headers: mutationHeaders,
        data: {
            sessionId: 'session-non-existent',
        },
    });
    expect(terminateSingleResponse.ok(), await terminateSingleResponse.text()).toBe(true);
    const terminateSingleBody = await apiJson(terminateSingleResponse);
    expect(typeof (terminateSingleBody.data as JsonObject)?.success).toBe('boolean');
});
