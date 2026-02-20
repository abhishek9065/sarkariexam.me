import { expect, test } from '@playwright/test';

import { mockAdminApi } from './helpers/mockAdminApi';

async function bootAuthenticatedShell(page: import('@playwright/test').Page, route: string) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAdminApi(page, { authenticated: true });
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.locator('.admin-layout')).toBeVisible({ timeout: 20_000 });
}

test('announcements supports filter presets and row actions', async ({ page }) => {
    await bootAuthenticatedShell(page, 'announcements');

    await page.getByPlaceholder(/Search by title/i).fill('Assistant Clerk');
    await page.getByRole('button', { name: /Save current filters/i }).click();
    await page.getByRole('button', { name: /^Save view$/i }).click();
    await expect(page.locator('#admin-preset-select')).not.toHaveValue('');

    await page.getByRole('button', { name: /More actions for Assistant Clerk Recruitment 2026/i }).click();
    await page.getByRole('button', { name: /Mark Draft/i }).click();
    await expect(page.getByText(/Announcement moved to draft/i)).toBeVisible();
});

test('review supports preview and execute flow with escape-close confirm dialog', async ({ page }) => {
    await bootAuthenticatedShell(page, 'review');
    await expect(page.getByText(/Step-up active/i)).toBeVisible();

    const checkboxes = page.locator('tbody input[type="checkbox"]');
    await checkboxes.nth(1).check();

    await page.getByRole('button', { name: /Preview Impact/i }).click();
    await expect(page.getByText(/Eligible:/i)).toBeVisible();

    await page.getByRole('button', { name: /Execute Action/i }).click();
    const confirmDialog = page.getByRole('alertdialog');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog.getByRole('button', { name: /^Cancel$/i })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(confirmDialog).toHaveCount(0);

    await page.getByRole('button', { name: /Execute Action/i }).click();
    const executeDialog = page.getByRole('alertdialog');
    await expect(executeDialog).toBeVisible();
    await executeDialog.getByRole('button', { name: /^Execute action$/i }).click();
    await expect(page.locator('.ops-success', { hasText: 'Review action applied.' })).toBeVisible();
});

test('bulk import enforces preview modal and confirm flow', async ({ page }) => {
    await bootAuthenticatedShell(page, 'bulk');
    await expect(page.getByText(/Step-up active/i)).toBeVisible();

    await page.getByPlaceholder(/Paste announcement IDs/i).fill('ann-p-1 ann-s-1');
    await page.getByRole('button', { name: /Preview \(2\)/i }).click();

    const previewDialog = page.getByRole('dialog', { name: /Bulk impact preview/i });
    await expect(previewDialog).toBeVisible();
    await expect(previewDialog.getByRole('button', { name: /^Close$/i })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(previewDialog).toHaveCount(0);

    await page.getByRole('button', { name: /Preview \(2\)/i }).click();
    await page.getByRole('button', { name: /Apply bulk update/i }).click();
    await page.getByRole('button', { name: /Apply update/i }).click();
    await expect(page.locator('.ops-success', { hasText: 'Bulk update completed.' })).toBeVisible();
});

test('sessions supports terminate flow with step-up and confirm dialog', async ({ page }) => {
    await bootAuthenticatedShell(page, 'sessions');
    await expect(page.getByText(/Step-up active/i)).toBeVisible();

    await page.getByRole('button', { name: /^Terminate$/i }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: /Terminate Session/i }).click();
    await expect(page.getByText(/Session terminated/i)).toBeVisible();
});

test('approvals uses structured decision modal with focus and escape-close', async ({ page }) => {
    await bootAuthenticatedShell(page, 'approvals');
    await expect(page.getByText(/Step-up active/i)).toBeVisible();

    await page.getByRole('button', { name: /^Reject$/i }).click();
    const decisionDialog = page.getByRole('dialog', { name: /Reject request/i });
    await expect(decisionDialog).toBeVisible();
    const reasonField = decisionDialog.getByPlaceholder(/Rejection reason/i);
    await expect(reasonField).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(decisionDialog).toHaveCount(0);

    await page.getByRole('button', { name: /^Reject$/i }).click();
    await decisionDialog.getByPlaceholder(/Rejection reason/i).fill('Policy violation confirmed.');
    await decisionDialog.getByRole('button', { name: /Reject request/i }).click();
    await expect(page.getByText(/Rejection completed/i)).toBeVisible();
});

test('compact mode keeps small controls at least 40px tall', async ({ page }) => {
    await bootAuthenticatedShell(page, 'dashboard');

    await page.getByRole('button', { name: /Density: Comfortable/i }).click();
    await page.getByRole('link', { name: /Manage Posts/i }).click();

    const compactControl = page.getByRole('button', { name: /Save current filters/i });
    await expect(compactControl).toBeVisible();
    const height = await compactControl.evaluate((node) => node.getBoundingClientRect().height);
    expect(Math.round(height)).toBeGreaterThanOrEqual(40);
});

test('keyboard opens command palette and focuses search input', async ({ page }) => {
    await bootAuthenticatedShell(page, 'dashboard');

    await page.keyboard.press('ControlOrMeta+K');
    const paletteDialog = page.getByRole('dialog', { name: /Admin command palette/i });
    await expect(paletteDialog).toBeVisible();
    const input = paletteDialog.getByPlaceholder(/Jump to module or search announcement/i);
    await expect(input).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(paletteDialog).toHaveCount(0);
});

