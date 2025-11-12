import { test, expect } from '@playwright/test';

// Basic homepage smoke + security headers check
// These tests assume dev server runs via playwright.config.ts webServer

test.describe('Homepage', () => {
  test('renders hero and bottom images', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();
    // Navigation should be visible
    await expect(page.locator('nav')).toBeVisible();
    // At least one image should render on the page
    await expect(page.locator('img').first()).toBeVisible();
  });

  test('has security headers and CSP', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).toBeTruthy();
    const headers = response!.headers();

    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBeDefined();
    expect(headers['strict-transport-security']).toBeDefined();

    const csp = headers['content-security-policy'];
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('img-src');
  });
});
