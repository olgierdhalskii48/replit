import { test, expect } from '@playwright/test';

test.describe('Admin guard', () => {
  test('redirects to /logowanie when visiting /admin without token', async ({ page }) => {
    await page.goto('/admin');
    // In dev SSR/CSR can yield 200 with client redirect, so only check final URL.
    await expect(page).toHaveURL(/logowanie/);
  });
});
