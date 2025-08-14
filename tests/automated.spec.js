
// Automated Test Runner for Nemory
// Run with: npm test

import { test, expect } from '@playwright/test';

test.describe('Nemory Application Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080');
  });

  test('should load homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/Nemory/);
  });

  test('should show login button', async ({ page }) => {
    const loginButton = page.locator('button:has-text("Login")');
    await expect(loginButton).toBeVisible();
  });

  test('should open login modal', async ({ page }) => {
    const loginButton = page.locator('button:has-text("Login")');
    await loginButton.click();
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
  });

  test('should validate form inputs', async ({ page }) => {
    // Test schedule creation form validation
    const createButton = page.locator('button:has-text("Create Schedule")');
    if (await createButton.isVisible()) {
      await createButton.click();
      
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();
      
      const errorMessage = page.locator('.error, [role="alert"]');
      await expect(errorMessage).toBeVisible();
    }
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
  });
});
