import { expect, test } from '@playwright/test';

const BASE_URL = process.env.CI_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';

test.describe('Jobs filters', () => {
    test('jobs panel apply/reset updates URL contract', async ({ page }) => {
        await page.goto(`${BASE_URL}/jobs`, { waitUntil: 'domcontentloaded' });

        const panel = page.locator('[data-testid="jobs-filter-panel"]');
        await expect(panel).toBeVisible();

        await panel.getByLabel('Search').fill('Railway');
        await panel.getByLabel('State').selectOption({ label: 'Uttar Pradesh' });
        await panel.getByLabel('Qualification').selectOption({ label: 'Graduate' });

        const orgSelect = panel.getByLabel('Organization');
        const optionCount = await orgSelect.locator('option').count();
        if (optionCount > 1) {
            const organizationValue = await orgSelect.locator('option').nth(1).getAttribute('value');
            if (organizationValue) {
                await orgSelect.selectOption(organizationValue);
            }
        }

        await panel.getByRole('button', { name: 'Apply Filters' }).click();
        await expect(page).toHaveURL(/\/jobs\?.*q=Railway/);
        await expect(page).toHaveURL(/location=Uttar%20Pradesh/);
        await expect(page).toHaveURL(/qualification=Graduate/);

        await panel.getByRole('button', { name: 'Reset' }).click();
        await expect(page).not.toHaveURL(/q=/);
        await expect(page).not.toHaveURL(/location=/);
        await expect(page).not.toHaveURL(/qualification=/);
        await expect(page).not.toHaveURL(/organization=/);
    });
});
