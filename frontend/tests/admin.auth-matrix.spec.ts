import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.ADMIN_BASE_URL || 'https://sarkariexams.me';
const ADMIN_URL = `${BASE_URL.replace(/\/$/, '')}/admin`;

const adminEmail = process.env.ADMIN_TEST_EMAIL;
const adminPassword = process.env.ADMIN_TEST_PASSWORD;
const adminTotp = process.env.ADMIN_TEST_TOTP;
const adminBackupCode = process.env.ADMIN_TEST_BACKUP_CODE;

const viewerEmail = process.env.ADMIN_VIEWER_EMAIL;
const viewerPassword = process.env.ADMIN_VIEWER_PASSWORD;
const viewerTotp = process.env.ADMIN_VIEWER_TOTP;
const viewerBackupCode = process.env.ADMIN_VIEWER_BACKUP_CODE;

async function completeLogin(page: Page, email: string, password: string, totp?: string, backupCode?: string) {
    await page.goto(ADMIN_URL, { waitUntil: 'domcontentloaded' });
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.getByRole('button', { name: /sign in/i }).click();

    const dashboard = page.locator('.admin-hero');
    const twoFactorField = page.locator('#totp-code');
    const twoFactorRequired = await Promise.race([
        twoFactorField.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false),
        dashboard.waitFor({ state: 'visible', timeout: 8000 }).then(() => false).catch(() => false),
    ]);

    if (twoFactorRequired) {
        const code = backupCode || totp;
        test.skip(!code, '2FA is required but test code was not provided');
        if (backupCode) {
            await page.getByRole('button', { name: /backup code/i }).click();
        }
        await page.fill('#totp-code', code as string);
        await page.getByRole('button', { name: /verify/i }).click();
    }

    await expect(dashboard).toBeVisible({ timeout: 10000 });
}

test.describe('Admin auth matrix', () => {
    test('forgot-password flow keeps generic UX', async ({ page }) => {
        await page.goto(ADMIN_URL, { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: /forgot password/i }).click();
        await page.fill('#forgot-email', 'unknown-admin@example.com');
        await page.getByRole('button', { name: /send reset email/i }).click();
        await expect(page.getByText(/Reset Email Sent/i)).toBeVisible();
    });

    test('admin login succeeds with 2FA challenge support', async ({ page }) => {
        test.skip(!adminEmail || !adminPassword, 'ADMIN_TEST_EMAIL/PASSWORD not provided');
        await completeLogin(page, adminEmail as string, adminPassword as string, adminTotp, adminBackupCode);
        await expect(page.getByText(/Operations Hub/i)).toBeVisible();
    });

    test('viewer role is blocked from write tabs', async ({ page }) => {
        test.skip(!viewerEmail || !viewerPassword, 'ADMIN_VIEWER_EMAIL/PASSWORD not provided');
        await completeLogin(page, viewerEmail as string, viewerPassword as string, viewerTotp, viewerBackupCode);

        await page.getByRole('button', { name: /quick add/i }).click();
        await expect(page.getByText(/do not have permission/i)).toBeVisible();

        await page.getByRole('button', { name: /all announcements/i }).click();
        await expect(page.locator('input[placeholder*="Search by title"]')).toBeVisible();
    });
});
