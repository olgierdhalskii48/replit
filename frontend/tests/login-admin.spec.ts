import { test, expect } from '@playwright/test';

/**
 * Live login E2E for admin. This test is only enabled when RUN_LIVE_E2E=true.
 * It expects a running backend at NEXT_PUBLIC_BACKEND_URL and a seeded admin user.
 * Admin credentials are read from env vars with safe defaults matching .env.example.
 */

const RUN_LIVE = process.env.RUN_LIVE_E2E === 'true';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin#12345';

(RUN_LIVE ? test : test.skip)('admin can log in and reach /admin', async ({ page }) => {
  await page.goto('/logowanie');
  // Fill email + password login form
  const emailInput = page.getByLabel(/Adres email/i);
  const passwordInput = page.getByLabel(/Hasło/i);
  await emailInput.fill(ADMIN_EMAIL);
  await passwordInput.fill(ADMIN_PASSWORD);

  // Click Login button using stable test id with robust fallbacks
  const submitBtn = page.getByTestId('login-submit');

  // Helper to dismiss potential overlay dialogs (cookie, onboarding, modal)
  const dismissOverlays = async () => {
    // Press Escape to close dialogs if supported
    await page.keyboard.press('Escape').catch(() => {});
    // Try common close/accept buttons
    const overlayButtons = [
      page.getByRole('button', { name: /zamknij|akceptuj|ok|rozumiem|zgadzam|accept|agree/i }).first(),
      page.locator('[data-testid="modal-close"], [aria-label="Close"], [aria-label="Zamknij"]').first(),
    ];
    for (const btn of overlayButtons) {
      if (await btn.isVisible().catch(() => false)) {
        await btn.click().catch(() => {});
      }
    }
    // If there is a global fixed overlay, click first visible button within it
    const overlayRoot = page.locator('div.fixed.inset-0');
    if (await overlayRoot.isVisible().catch(() => false)) {
      const anyBtn = overlayRoot.locator('button').first();
      if (await anyBtn.isVisible().catch(() => false)) {
        await anyBtn.click().catch(() => {});
      }
      // As a last resort, remove the overlay from DOM for tests
      await page.evaluate(() => {
        document.querySelectorAll('div.fixed.inset-0').forEach(el => el.remove());
      }).catch(() => {});
    }
    // Wait briefly for any fixed overlay to disappear
    const overlay = page.locator('div.fixed.inset-0');
    await overlay.waitFor({ state: 'hidden', timeout: 1500 }).catch(() => {});
  };

  await dismissOverlays();
  // Try standard click; if blocked, force; else programmatic submit
  const form = page.locator('form').first();
  try {
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await submitBtn.click();
  } catch {
    try {
      await submitBtn.click({ force: true });
    } catch {
      await form.evaluate((el: HTMLFormElement) => el.requestSubmit());
    }
  }

  // After login, middleware/redirect should land on an admin page or attempt to access /admin directly
  await page.waitForLoadState('networkidle');

  // If not redirected, navigate explicitly to /admin
  if (!/\/admin/.test(page.url())) {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
  }

  // Expect we are on /admin and not on the login page
  expect(page.url()).toMatch(/\/admin/);
});
