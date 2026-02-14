import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.ADMIN_BASE_URL || 'https://sarkariexams.me';
const ADMIN_URL = `${BASE_URL.replace(/\/$/, '')}/admin`;

const adminEmail = process.env.ADMIN_TEST_EMAIL;
const adminPassword = process.env.ADMIN_TEST_PASSWORD;
const adminTotp = process.env.ADMIN_TEST_TOTP;
const adminBackupCode = process.env.ADMIN_TEST_BACKUP_CODE;

async function loginFromAuthModal(page: Page, email: string, password: string, twoFactorCode?: string) {
    await page.goto(ADMIN_URL, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('.auth-form').getByRole('button', { name: /^Sign In$/i }).click();

    const twoFactorInput = page.getByLabel(/Authentication Code/i);
    const needsTwoFactor = await twoFactorInput.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (needsTwoFactor) {
        test.skip(!twoFactorCode, '2FA is required but no code was provided in env.');
        await twoFactorInput.fill(twoFactorCode as string);
        await page.getByRole('button', { name: /^Verify$/i }).click();
    }
}

test.describe('Admin UI smoke', () => {
    test('admin login and core admin flows', async ({ page }) => {
        test.skip(!adminEmail || !adminPassword, 'ADMIN_TEST_EMAIL/PASSWORD not set');

        await loginFromAuthModal(page, adminEmail as string, adminPassword as string, adminBackupCode || adminTotp);
        await expect(page.getByRole('heading', { name: /Admin Panel/i })).toBeVisible({ timeout: 10000 });

        await page.getByRole('button', { name: /Announcements/i }).click();
        await expect(page.getByRole('columnheader', { name: 'Title' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Filter/i })).toBeVisible();

        await page.getByRole('button', { name: /Create New/i }).click();
        await expect(page.getByRole('heading', { name: /Create Announcement/i })).toBeVisible();
    });
});
