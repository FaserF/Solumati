import { test, expect } from '@playwright/test';

test.describe('Solumati Functional Tests', () => {
    test('landing page loads and has title', async ({ page }) => {
        await page.goto('/');

        // Check title contains Solumati
        await expect(page).toHaveTitle(/Solumati/);

        // Check for main heading or critical element
        await expect(page.getByAltText('Solumati Logo')).toBeVisible();
    });

    test('navigation to login page works', async ({ page }) => {
        await page.goto('/');

        // Click the Log in button (using text selector which relies on fallback or translation)
        await page.getByRole('link', { name: /Log in|Anmelden/i }).click();

        // Verify URL
        await expect(page).toHaveURL(/\/login/);

        // Verify Login Inputs exist
        await expect(page.getByPlaceholder(/Email|Username/i)).toBeVisible();
        await expect(page.getByPlaceholder(/Password/i)).toBeVisible();
    });
});
