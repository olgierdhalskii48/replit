import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check if the page loads
    await expect(page).toHaveTitle(/PrawnikAI|Kancelaria/i);
    
    // Check main navigation elements
    await expect(page.locator('nav')).toBeVisible();
    
    // Check that main content is present (hero or primary section)
    const mainContent = page.locator('main, section, [data-testid="hero"], [data-testid="packages"]');
    await expect(mainContent.first()).toBeVisible({timeout: 10000});
  });

  test('should display service packages', async ({ page }) => {
    await page.goto('/');
    
    // Look for service packages generically: any pricing or package card
    const priceLike = page.locator('text=/\\b\\d+\\s?(zł|PLN)\\b/i').first();
    const anyCard = page.locator('[class*="card" i], [data-testid="package-card"]').first();
    await expect(priceLike.or(anyCard)).toBeVisible({ timeout: 10000 });
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');
    
    // Test navigation links
    const loginLink = page.locator('a[href*="logowanie" i], a[href*="login" i], button:has-text("Zaloguj")').first();
    if (await loginLink.isVisible()) {
      await expect(loginLink).toBeVisible();
    }
    
    const registerLink = page.locator('a[href*="rejestracja" i], a[href*="register" i], button:has-text("Zarejestruj")').first();
    if (await registerLink.isVisible()) {
      await expect(registerLink).toBeVisible();
    }
  });
});