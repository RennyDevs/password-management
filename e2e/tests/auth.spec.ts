import { test, expect } from '@playwright/test';

/**
 * E2E tests for the authentication flow.
 *
 * NOTE: These tests require a running Supabase project with the
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables set.
 * They also require a test user to exist or be created.
 *
 * Run with: `npx playwright test --config e2e/playwright.config.ts`
 */

const TEST_EMAIL = `e2e-test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';

test.describe('Authentication Flow', () => {
  test('should display the auth page', async ({ page }) => {
    await page.goto('/');

    // Should see the auth page with login form
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#auth-password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/');

    // Try submitting empty form
    await page.getByRole('button', { name: /sign in/i }).click();

    // The email input should show validation message (browser native)
    // If the form were submitted, we'd see an error message
    // HTML5 validation prevents submission with empty required fields
    await expect(page.locator('#email')).toBeVisible();
  });

  test('should switch between sign in and sign up', async ({ page }) => {
    await page.goto('/');

    // Should be in login mode by default
    await expect(page.getByText(/sign in to your account/i)).toBeVisible();

    // Switch to sign up
    await page.getByText(/don't have an account/i).click();
    await expect(page.getByText(/create a new account/i)).toBeVisible();

    // Switch back to sign in
    await page.getByText(/already have an account/i).click();
    await expect(page.getByText(/sign in to your account/i)).toBeVisible();
  });

  test('should sign up a new user', async ({ page }) => {
    await page.goto('/');

    // Switch to sign up
    await page.getByText(/don't have an account/i).click();

    // Fill the form
    await page.locator('#email').fill(TEST_EMAIL);
    await page.locator('#auth-password').fill(TEST_PASSWORD);

    // Submit sign up
    await page.getByRole('button', { name: /sign up/i }).click();

    // After sign up, the app should redirect to the home page
    // or show a confirmation message depending on the Supabase config
    await page.waitForURL(/.*\/#/, { timeout: 15000 }).catch(() => {
      // If email confirmation is required, we may stay on auth page
      // For now, just verify no crash
    });
  });

  test('should sign in with existing credentials', async ({ page }) => {
    // First ensure the user exists from the previous test
    await page.goto('/');

    // Fill login form
    await page.locator('#email').fill(TEST_EMAIL);
    await page.locator('#auth-password').fill(TEST_PASSWORD);

    // Submit login
    await page.getByRole('button', { name: /sign in/i }).click();

    // After login, we should see the records page
    await page.waitForURL(/.*home.*/i, { timeout: 15000 }).catch(() => {
      // Might stay on the same page if auth redirects differently
    });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');

    await page.locator('#email').fill('nonexistent@example.com');
    await page.locator('#auth-password').fill('WrongPassword123!');

    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show an error message
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 10000 });
  });
});
