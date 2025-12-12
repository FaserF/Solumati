import { test, expect } from '@playwright/test';


test.describe('Solumati Functional Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Mock Config
        await page.route('**/api/public-config', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    test_mode: true,
                    registration_enabled: true,
                    email_2fa_enabled: false,
                    maintenance_mode: false,
                    legal: { enabled_imprint: true, enabled_privacy: true }
                })
            });
        });

        // Mock i18n
        await page.route('**/api/i18n/*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ translations: {} })
            });
        });

        // Mock Login (for the login test flow if needed)
        // Note: The login test checks navigation to /login, not actual login submission yet.
    });

    test('landing page loads and has title', async ({ page }) => {
        await page.goto('/');

        // Check title contains Solumati
        await expect(page).toHaveTitle(/Solumati/);

        // Check for main heading or critical element
        await expect(page.getByAltText('Solumati Logo')).toBeVisible();
    });

    test('navigation to login page works', async ({ page }) => {
        await page.goto('/');

        // Click the Log in button (it's a button, not a link)
        await page.getByRole('button', { name: /Log in|Anmelden/i }).click();

        // Verify URL
        await expect(page).toHaveURL(/\/login/);

        // Verify Login Inputs exist
        await expect(page.getByPlaceholder(/Email|Username/i)).toBeVisible();
        await expect(page.getByPlaceholder(/Password|Passwort/i)).toBeVisible();
    });
});
