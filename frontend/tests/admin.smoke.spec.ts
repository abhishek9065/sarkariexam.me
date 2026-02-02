import { test, expect } from '@playwright/test';

const BASE_URL = process.env.ADMIN_BASE_URL || 'https://sarkariexams.me';
const ADMIN_URL = `${BASE_URL.replace(/\/$/, '')}/admin`;

const adminEmail = process.env.ADMIN_TEST_EMAIL;
const adminPassword = process.env.ADMIN_TEST_PASSWORD;
const adminTotp = process.env.ADMIN_TEST_TOTP;
const adminBackupCode = process.env.ADMIN_TEST_BACKUP_CODE;

test.describe('Admin UI smoke', () => {
    test('login and core flows', async ({ page }) => {
        test.skip(!adminEmail || !adminPassword, 'ADMIN_TEST_EMAIL/PASSWORD not set');

        await page.goto(ADMIN_URL, { waitUntil: 'domcontentloaded' });

        await page.fill('#email', adminEmail as string);
        await page.fill('#password', adminPassword as string);
        await page.getByRole('button', { name: /sign in/i }).click();

        const heroLocator = page.locator('.admin-hero');
        const twoFactorLocator = page.locator('#totp-code');

        const needsTwoFactor = await Promise.race([
            twoFactorLocator.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false),
            heroLocator.waitFor({ state: 'visible', timeout: 8000 }).then(() => false).catch(() => false)
        ]);

        if (needsTwoFactor) {
            if (await page.getByText('Enable Two-Factor Authentication').isVisible()) {
                test.skip(true, '2FA setup required for this admin account.');
            }

            const code = adminBackupCode || adminTotp;
            test.skip(!code, 'ADMIN_TEST_TOTP or ADMIN_TEST_BACKUP_CODE required for 2FA');

            if (adminBackupCode) {
                await page.getByRole('button', { name: /backup code/i }).click();
            }

            await page.fill('#totp-code', code as string);
            await page.getByRole('button', { name: /verify/i }).click();
            await expect(heroLocator).toBeVisible({ timeout: 10000 });
        }

        await expect(heroLocator).toBeVisible();

        await page.getByRole('button', { name: /all announcements/i }).click();
        await expect(page.locator('input[placeholder*="Search by title"]')).toBeVisible();

        await page.getByRole('button', { name: /quick add/i }).click();
        await expect(page.locator('#quick-title')).toBeVisible();
        await expect(page.locator('#quick-deadline')).toBeVisible();

        await page.getByRole('button', { name: /schedule queue/i }).click();
        await expect(page.getByText(/schedule queue/i)).toBeVisible();

        await page.getByRole('button', { name: /^security$/i }).click();
        await expect(page.getByText(/two-factor recovery/i)).toBeVisible();
        await expect(page.getByText(/active sessions/i)).toBeVisible();

        await page.getByRole('button', { name: /light/i }).click();
        const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
        expect(theme).toBe('light');
    });
});
