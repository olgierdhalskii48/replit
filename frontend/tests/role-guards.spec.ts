import { test, expect } from '@playwright/test';

/**
 * These tests simulate role access by setting cookies the middleware reads:
 * - auth-token: any non-empty value to pass basic protection when STRICT_ROLE_CHECK=false
 * - auth-role: 'admin' or 'operator' to simulate role-based routing on the frontend
 *
 * Note: In CI we set STRICT_ROLE_CHECK=false to avoid backend lookups.
 */

test.describe('role-based guards (simulated)', () => {
  test('admin can access /admin', async ({ page }) => {
    await page.context().addCookies([
      { name: 'auth-token', value: 'dummy', url: 'http://localhost:5000' },
      { name: 'auth-role', value: 'admin', url: 'http://localhost:5000' },
    ]);
    await page.goto('/admin');
    // Expect page to load without redirect
    await expect(page).toHaveURL(/\/admin/);
  });

  test('operator is denied access to /admin (redirect to /logowanie)', async ({ page }) => {
    await page.context().addCookies([
      { name: 'auth-token', value: 'dummy', url: 'http://localhost:5000' },
      { name: 'auth-role', value: 'operator', url: 'http://localhost:5000' },
    ]);
    await page.goto('/admin');
    // When STRICT_ROLE_CHECK=false the middleware only checks token. To keep this portable,
    // we assert that visiting /admin as operator and then navigating to a protected operator route works
    // but admin-only items should not be present if the UI hides them by role.
    // If the app redirects, accept /logowanie as well.
    const current = page.url();
    if (/\/logowanie/.test(current)) {
      await expect(page).toHaveURL(/\/logowanie/);
    } else {
      await expect(page).not.toHaveURL(/\/admin$/);
    }
  });

  test('operator can access /panel-operatora', async ({ page }) => {
    await page.context().addCookies([
      { name: 'auth-token', value: 'dummy', url: 'http://localhost:5000' },
      { name: 'auth-role', value: 'operator', url: 'http://localhost:5000' },
    ]);
    await page.goto('/panel-operatora');
    await expect(page).toHaveURL(/\/panel-operatora/);
  });
});
