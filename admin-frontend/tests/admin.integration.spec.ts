import { expect, test, type APIRequestContext } from '@playwright/test';

const adminEmail = process.env.ADMIN_E2E_EMAIL ?? 'admin.integration@sarkariexams.me';
const adminPassword = process.env.ADMIN_E2E_PASSWORD ?? 'Password#12345';
const adminSetupKey = process.env.ADMIN_E2E_SETUP_KEY ?? 'setup-admin-123';

type JsonObject = Record<string, unknown>;
const setupStatusMaxAttempts = 20;
const setupStatusRetryDelayMs = 1500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getCsrfToken(api: APIRequestContext): Promise<string> {
    const response = await api.get('/api/auth/csrf');
    expect(response.ok()).toBe(true);
    const body = (await response.json()) as { data?: { csrfToken?: string } };
    const token = body?.data?.csrfToken;
    expect(typeof token).toBe('string');
    return token as string;
}

async function ensureAdminAccount(api: APIRequestContext): Promise<void> {
    let needsSetup = false;
    let setupStatusResolved = false;
    let lastStatus = 0;
    let lastBody = '';

    for (let attempt = 1; attempt <= setupStatusMaxAttempts; attempt += 1) {
        const statusResponse = await api.get('/api/auth/admin/setup-status');
        lastStatus = statusResponse.status();
        lastBody = await statusResponse.text();

        if (lastStatus === 429) {
            const retryAfter = parseInt(statusResponse.headers()['retry-after'] || '5', 10);
            await sleep(retryAfter * 1000 + 500); // Wait suggested time + small buffer
            continue;
        }

        if (!statusResponse.ok()) {
            if (attempt < setupStatusMaxAttempts) {
                await sleep(setupStatusRetryDelayMs);
                continue;
            }
            break;
        }

        const statusBody = JSON.parse(lastBody) as { needsSetup?: boolean; data?: { needsSetup?: boolean } };
        const parsedNeedsSetup = statusBody?.needsSetup ?? statusBody?.data?.needsSetup;
        if (typeof parsedNeedsSetup === 'boolean') {
            needsSetup = parsedNeedsSetup;
            setupStatusResolved = true;
            break;
        }

        if (attempt < setupStatusMaxAttempts) {
            await sleep(setupStatusRetryDelayMs);
        }
    }

    expect(
        setupStatusResolved,
        `Unable to resolve /api/auth/admin/setup-status after ${setupStatusMaxAttempts} attempts. Last status=${lastStatus}, body=${lastBody}`
    ).toBe(true);

    if (!needsSetup) return;

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

    const setupStatus = setupResponse.status();
    expect([201, 409], await setupResponse.text()).toContain(setupStatus);
}

async function apiJson(response: Awaited<ReturnType<APIRequestContext['get']>>): Promise<JsonObject> {
    return (await response.json()) as JsonObject;
}

async function loginAdmin(api: APIRequestContext): Promise<void> {
    const csrfToken = await getCsrfToken(api);
    const loginResponse = await api.post('/api/admin-auth/login', {
        headers: {
            'X-CSRF-Token': csrfToken,
        },
        data: {
            email: adminEmail,
            password: adminPassword,
        },
    });

    expect(loginResponse.ok(), await loginResponse.text()).toBe(true);
}

test('admin real backend integration flow validates auth + privileged contracts', async ({ page }) => {
    await ensureAdminAccount(page.request);
    await loginAdmin(page.request);

    const meResponse = await page.request.get('/api/admin-auth/me');
    expect(meResponse.ok(), await meResponse.text()).toBe(true);
    const meBody = await apiJson(meResponse);
    const meUser = (meBody.data as JsonObject)?.user as JsonObject | undefined;
    expect(typeof meUser?.email).toBe('string');

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

    const bulkExecuteResponse = await page.request.post('/api/admin/announcements/bulk', {
        headers: {
            'X-CSRF-Token': csrfToken,
            'X-Admin-Step-Up-Token': String(stepUpToken),
            'Idempotency-Key': `admin-int-bulk-${Date.now()}`,
        },
        data: {
            ids: ['integration-announcement-1'],
            data: { status: 'draft' },
            dryRun: true,
        },
    });
    expect(bulkExecuteResponse.ok(), await bulkExecuteResponse.text()).toBe(true);
    const bulkExecuteBody = await apiJson(bulkExecuteResponse);
    expect((bulkExecuteBody.data as JsonObject)?.dryRun).toBe(true);

    const sessionsResponse = await page.request.get('/api/admin/sessions');
    expect(sessionsResponse.ok(), await sessionsResponse.text()).toBe(true);
    const sessionsBody = await apiJson(sessionsResponse);
    expect(Array.isArray(sessionsBody.data)).toBe(true);
});
