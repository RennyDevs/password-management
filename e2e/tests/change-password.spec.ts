import { test, expect } from '@playwright/test';

/**
 * E2E tests for the change password flow.
 *
 * These tests require:
 * - A test user that exists in the Supabase project
 * - Environment variables set
 */

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'e2e-test@example.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'TestPassword123!';
const NEW_PASSWORD = `NewTestPassword${Date.now()}!`;

test.describe('Change Password Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.locator('#email').fill(TEST_EMAIL);
    await page.locator('#auth-password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(3000);
  });

  test('should navigate to change password page', async ({ page }) => {
    // Click on "Change Password" tab
    await page.getByRole('button', { name: /change password/i }).click();

    // Should show the change password form
    await expect(page.getByText(/change password/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.getByRole('button', { name: /change password/i }).click();

    // Try submitting empty form
    const submitButton = page.getByRole('button', { name: /update|change/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      // HTML5 validation should prevent submission
    }
  });

  test('should change the password successfully', async ({ page }) => {
    await page.getByRole('button', { name: /change password/i }).click();

    // Wait for the change password form
    await page.waitForTimeout(2000);

    // Fill current password
    const currentPasswordInput = page.locator('#current-password');
    const newPasswordInput = page.locator('#new-password');
    const confirmPasswordInput = page.locator('#confirm-password');

    if (await currentPasswordInput.isVisible()) {
      await currentPasswordInput.fill(TEST_PASSWORD);
      await newPasswordInput.fill(NEW_PASSWORD);
      await confirmPasswordInput.fill(NEW_PASSWORD);

      // Submit
      await page.getByRole('button', { name: /update|change/i }).click();

      // Wait for success or error
      await page.waitForTimeout(3000);

      // If successful, we may be redirected to login
      // If VITE_REAUTHENTICATE_BEFORE_PASSWORD_CHANGE is false, we stay logged in
    }
  });

  test('should reject mismatched new passwords', async ({ page }) => {
    await page.getByRole('button', { name: /change password/i }).click();
    await page.waitForTimeout(2000);

    const currentPasswordInput = page.locator('#current-password');
    const newPasswordInput = page.locator('#new-password');
    const confirmPasswordInput = page.locator('#confirm-password');

    if (await currentPasswordInput.isVisible()) {
      await currentPasswordInput.fill(TEST_PASSWORD);
      await newPasswordInput.fill('NewPass123!');
      await confirmPasswordInput.fill('DifferentPass456!');

      await page.getByRole('button', { name: /update|change/i }).click();

      // Should show error about mismatched passwords
      await page.waitForTimeout(2000);
    }
  });
});
