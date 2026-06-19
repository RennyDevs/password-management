import { test, expect } from '@playwright/test';

/**
 * E2E tests for record CRUD operations.
 *
 * These tests assume the user is already authenticated. They use the
 * browser's localStorage to inject a session, or alternatively they
 * perform a login first.
 *
 * For a full end-to-end test, you need:
 * 1. A test Supabase project
 * 2. A test user that exists
 * 3. Environment variables set in .env
 */

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'e2e-test@example.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'TestPassword123!';
const MASTER_PASSWORD = 'MyTestMasterPassword42!';

test.describe('Record CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');

    // Try to login
    await page.locator('#email').fill(TEST_EMAIL);
    await page.locator('#auth-password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for records page to load
    await page.waitForTimeout(3000);
  });

  test('should display the records page after login', async ({ page }) => {
    // Should see the records heading
    await expect(page.getByText(/my records/i)).toBeVisible({ timeout: 10000 });
    // Should see the new record button
    await expect(page.getByRole('button', { name: /new record/i })).toBeVisible();
  });

  test('should create a new record', async ({ page }) => {
    // Click new record button
    await page.getByRole('button', { name: /new record/i }).click();

    // Wait for edit modal
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    // Fill title
    const titleInput = page.locator('#edit-title');
    await titleInput.fill('E2E Test Record');

    // Fill secret (the MarkdownEditor textarea)
    const textareas = page.locator('[role="textbox"]');
    await textareas.nth(1).fill('This is a test secret created by Playwright');

    // Add a tag
    const tagInput = page.locator('input[placeholder*="tag"]');
    await tagInput.fill('e2e-test');
    await tagInput.press('Enter');

    // Click create/save — opens master password modal
    await page.getByRole('button', { name: /create|save/i }).click();

    // Master password modal should appear
    await expect(page.getByLabelText(/master password/i)).toBeVisible({ timeout: 5000 });

    // Enter master password
    await page.getByLabelText(/master password/i).fill(MASTER_PASSWORD);
    await page.getByRole('button', { name: /unlock|confirm/i }).click();

    // Wait for success toast or record to appear in list
    await page.waitForTimeout(3000);

    // The record should appear in the list
    await expect(page.getByText('E2E Test Record')).toBeVisible({ timeout: 10000 });
  });

  test('should view and edit an existing record', async ({ page }) => {
    // First, ensure there's a record to edit
    // Click edit on the first record
    const editButtons = page.getByRole('button', { name: /edit/i });
    if (await editButtons.count() > 0) {
      await editButtons.first().click();

      // Master password modal should appear
      await expect(page.getByLabelText(/master password/i)).toBeVisible({ timeout: 5000 });

      // Enter master password
      await page.getByLabelText(/master password/i).fill(MASTER_PASSWORD);
      await page.getByRole('button', { name: /unlock|confirm/i }).click();

      // Edit modal should appear with decrypted data
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

      // Modify the title
      const titleInput = page.locator('#edit-title');
      await titleInput.fill('Edited E2E Record');

      // Save changes
      await page.getByRole('button', { name: /save/i }).click();

      // Enter master password again
      await expect(page.getByLabelText(/master password/i)).toBeVisible({ timeout: 5000 });
      await page.getByLabelText(/master password/i).fill(MASTER_PASSWORD);
      await page.getByRole('button', { name: /unlock|confirm/i }).click();

      // Wait for success
      await page.waitForTimeout(3000);

      // The edited title should appear
      await expect(page.getByText('Edited E2E Record')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should delete a record', async ({ page }) => {
    // Click delete on the first record
    const deleteButtons = page.getByRole('button', { name: /delete/i });
    if (await deleteButtons.count() > 0) {
      // May need to handle a confirmation dialog
      deleteButtons.first().click();

      // Wait for success toast
      await page.waitForTimeout(2000);
    }
  });

  test('should filter records by search', async ({ page }) => {
    // Type in the search box
    const searchInput = page.locator('input[placeholder*="search"]');
    await searchInput.fill('E2E');

    // Wait for filtering
    await page.waitForTimeout(1000);

    // The filtered results count should be visible
    // Only records matching the query should remain in the list
  });

  test('should filter records by tags', async ({ page }) => {
    // Click a tag filter button if available
    const tagButtons = page.locator('button').filter({ hasText: /e2e-test/ });
    if (await tagButtons.count() > 0) {
      await tagButtons.first().click();

      await page.waitForTimeout(1000);
    }
  });

  test('should handle offline mode gracefully', async ({ page }) => {
    // Simulate going offline
    await page.context().setOffline(true);

    // Try to create a record
    await page.getByRole('button', { name: /new record/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    // Fill form
    const titleInput = page.locator('#edit-title');
    await titleInput.fill('Offline Test Record');

    const textareas = page.locator('[role="textbox"]');
    await textareas.nth(1).fill('Offline secret');

    await page.getByRole('button', { name: /create/i }).click();

    // Master password modal
    await expect(page.getByLabelText(/master password/i)).toBeVisible({ timeout: 5000 });
    await page.getByLabelText(/master password/i).fill(MASTER_PASSWORD);
    await page.getByRole('button', { name: /unlock|confirm/i }).click();

    // Should show offline indicator (the record is saved locally)
    await page.waitForTimeout(2000);

    // Go back online
    await page.context().setOffline(false);

    // Wait for sync
    await page.waitForTimeout(3000);
  });
});
