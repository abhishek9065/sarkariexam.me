import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.ADMIN_BASE_URL || 'https://sarkariexams.me';
const ADMIN_URL = `${BASE_URL.replace(/\/$/, '')}/admin`;

interface RoleScenario {
    name: string;
    email?: string;
    password?: string;
    twoFactorCode?: string;
    expectWrite: boolean;
    expectDelete: boolean;
}

const scenarios: RoleScenario[] = [
    {
        name: 'admin',
        email: process.env.ADMIN_TEST_EMAIL,
        password: process.env.ADMIN_TEST_PASSWORD,
        twoFactorCode: process.env.ADMIN_TEST_BACKUP_CODE || process.env.ADMIN_TEST_TOTP,
        expectWrite: true,
        expectDelete: true,
    },
    {
        name: 'editor',
        email: process.env.ADMIN_EDITOR_EMAIL,
        password: process.env.ADMIN_EDITOR_PASSWORD,
        twoFactorCode: process.env.ADMIN_EDITOR_BACKUP_CODE || process.env.ADMIN_EDITOR_TOTP,
        expectWrite: true,
        expectDelete: false,
    },
    {
        name: 'reviewer',
        email: process.env.ADMIN_REVIEWER_EMAIL,
        password: process.env.ADMIN_REVIEWER_PASSWORD,
        twoFactorCode: process.env.ADMIN_REVIEWER_BACKUP_CODE || process.env.ADMIN_REVIEWER_TOTP,
        expectWrite: false,
        expectDelete: false,
    },
    {
        name: 'viewer',
        email: process.env.ADMIN_VIEWER_EMAIL,
        password: process.env.ADMIN_VIEWER_PASSWORD,
        twoFactorCode: process.env.ADMIN_VIEWER_BACKUP_CODE || process.env.ADMIN_VIEWER_TOTP,
        expectWrite: false,
        expectDelete: false,
    },
];

async function loginFromAuthModal(page: Page, email: string, password: string, twoFactorCode?: string) {
    await page.goto(ADMIN_URL, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('.auth-form').getByRole('button', { name: /^Sign In$/i }).click();

    const twoFactorInput = page.getByLabel(/Authentication Code/i);
    const needsTwoFactor = await twoFactorInput.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (needsTwoFactor) {
        test.skip(!twoFactorCode, `2FA required for ${email} but no TOTP/backup code provided.`);
        await twoFactorInput.fill(twoFactorCode as string);
        await page.getByRole('button', { name: /^Verify$/i }).click();
    }
}

test.describe('Admin RBAC auth matrix', () => {
    for (const scenario of scenarios) {
        test(`${scenario.name} role sees only permitted controls`, async ({ page }) => {
            test.skip(!scenario.email || !scenario.password, `${scenario.name} credentials not provided`);

            await loginFromAuthModal(page, scenario.email as string, scenario.password as string, scenario.twoFactorCode);
            await expect(page.getByRole('heading', { name: /Admin Panel/i })).toBeVisible({ timeout: 10000 });

            const createNavButton = page.getByRole('button', { name: /Create New/i });
            if (scenario.expectWrite) {
                await expect(createNavButton).toBeVisible();
            } else {
                await expect(createNavButton).toHaveCount(0);
                await expect(page.getByText(/Read-only role: changes are restricted/i)).toBeVisible();
            }

            await page.getByRole('button', { name: /Announcements/i }).click();
            await expect(page.getByRole('columnheader', { name: 'Title' })).toBeVisible();

            const editActions = page.locator('button[title="Edit"]');
            const deleteActions = page.locator('button[title="Delete"]');

            if (scenario.expectWrite) {
                const rowCount = await page.locator('.admin-table tbody tr').count();
                if (rowCount > 0) {
                    await expect(editActions.first()).toBeVisible();
                }
            } else {
                await expect(editActions).toHaveCount(0);
            }

            if (scenario.expectDelete) {
                const rowCount = await page.locator('.admin-table tbody tr').count();
                if (rowCount > 0) {
                    await expect(deleteActions.first()).toBeVisible();
                }
            } else {
                await expect(deleteActions).toHaveCount(0);
            }
        });
    }

    test('non-admin user cannot access /admin', async ({ page }) => {
        const userEmail = process.env.ADMIN_NON_ADMIN_EMAIL || process.env.USER_TEST_EMAIL;
        const userPassword = process.env.ADMIN_NON_ADMIN_PASSWORD || process.env.USER_TEST_PASSWORD;
        test.skip(!userEmail || !userPassword, 'Non-admin credentials not provided');

        await loginFromAuthModal(page, userEmail as string, userPassword as string);
        await expect(page.getByRole('heading', { name: /Admin Panel/i })).toHaveCount(0);
        await expect(page).toHaveURL(new RegExp(`${BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`));
    });
});
