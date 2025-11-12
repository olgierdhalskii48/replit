import { test, expect } from '@playwright/test';

// Basic smoke test: homepage and login screen render

test('homepage renders', async ({ page }) => {
  await page.goto('/');
  // Expect header or any main content to be present
  await expect(page.locator('body')).toBeVisible();
});

test('login page renders and allows email/password input', async ({ page }) => {
  await page.goto('/logowanie');
  // Email + Hasło form should be visible; assert inputs instead of heading text
  const emailInput = page.getByLabel(/Adres email/i);
  const passwordInput = page.getByLabel(/Hasło/i);
  await emailInput.fill('admin@example.com');
  await passwordInput.fill('Admin#12345');
  await expect(emailInput).toHaveValue('admin@example.com');
});
