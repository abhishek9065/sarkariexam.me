import { expect, test, type Page } from '@playwright/test';

const PROD_BASE_URL = process.env.PROD_BASE_URL || process.env.ADMIN_BASE_URL;
const ADMIN_URL = PROD_BASE_URL ? `${PROD_BASE_URL.replace(/\/$/, '')}/admin` : '';

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

test.describe('@prod Admin analytics UX', () => {
    test('analytics controls and readability helpers are present', async ({ page }) => {
        test.skip(!PROD_BASE_URL, 'Set PROD_BASE_URL (or ADMIN_BASE_URL) to run production probes.');
        test.skip(!adminEmail || !adminPassword, 'ADMIN_TEST_EMAIL/PASSWORD not set');

        await loginFromAuthModal(page, adminEmail as string, adminPassword as string, adminBackupCode || adminTotp);
        await expect(page.getByRole('heading', { name: /Operations Hub/i })).toBeVisible({ timeout: 10000 });

        await expect(page.getByRole('button', { name: /Export options/i })).toBeVisible();
        await expect(page.locator('.window-badge').first()).toBeVisible();
        await expect(page.locator('#number-locale')).toBeVisible();
        await expect(page.locator('.metric-definition-tooltip').first()).toBeVisible();
        if (await page.locator('.compare-toggle').count()) {
            await expect(page.locator('.compare-toggle').first()).toBeVisible();
        }
        if (await page.locator('.anomaly-card').count()) {
            await expect(page.locator('.anomaly-card').first()).toBeVisible();
        }

        const showMoreButton = page.getByRole('button', { name: /Show more metrics|Show fewer metrics/i });
        if (await showMoreButton.count()) {
            await showMoreButton.first().click();
            await expect(page.locator('.engagement-grid .engagement-card').first()).toBeVisible();
        }
    });
});
