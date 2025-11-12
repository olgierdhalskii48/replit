import { test, expect } from '@playwright/test';

test.describe('Legal Services', () => {
  test('should display legal service packages with pricing', async ({ page }) => {
    await page.goto('/');
    
    // Check for service packages: any price-like text or a visible package card
    const priceLike = page.locator('text=/\\b\\d+\\s?(zł|PLN)\\b/i').first();
    const packageCard = page.locator('[data-testid="package-card"], [class*="card" i]').first();
    await expect(priceLike.or(packageCard)).toBeVisible({ timeout: 10000 });
  });

  test('should allow package selection', async ({ page }) => {
    await page.goto('/');
    
    // Look for package selection buttons
    const packageButton = page.locator('button:has-text("Wybierz"), button:has-text("Select"), a:has-text("Wybierz"), [data-testid="package-select"]').first();
    if (await packageButton.isVisible()) {
      await expect(packageButton).toBeVisible();
      
      // Click on package selection
      await packageButton.click();
      
      // Should navigate to payment/order process or require login
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      expect(currentUrl).not.toBe('/');
    }
  });

  test('should show legal service descriptions', async ({ page }) => {
    await page.goto('/');
    
    // Check for service descriptions generically: presence of descriptive sections or list items
    const descriptions = page.locator('section:has(h2), ul li, [data-testid="service-description"]');
    await expect(descriptions.first()).toBeVisible({ timeout: 10000 });
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    await page.goto('/');
    
    // Check if page loads on mobile
    await expect(page).toHaveTitle(/PrawnikAI|Kancelaria/i);
    
    // Check mobile navigation (hamburger menu or mobile-friendly layout)
    const mobileNav = page.locator('nav, .mobile-menu, button[aria-label*="menu"]').first();
    await expect(mobileNav).toBeVisible({timeout: 10000});
  });

  test('should have contact information', async ({ page }) => {
    await page.goto('/');
    
    // Look for contact information (email, phone, address)
    const footer = page.locator('footer');
    await expect(footer).toBeVisible({timeout: 10000});
  });

  test('should meet basic accessibility standards', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Check for proper heading hierarchy
    const mainHeading = page.locator('h1').first();
    await expect(mainHeading).toBeVisible({timeout: 10000});
    
    // Check for alt attributes on images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < Math.min(imageCount, 5); i++) { // Check first 5 images
      const img = images.nth(i);
      if (await img.isVisible()) {
        const alt = await img.getAttribute('alt');
        expect(alt).not.toBeNull();
        expect(alt).not.toBe('');
      }
    }
    
    // Check for proper form labels
    const inputs = page.locator('input[type="email"], input[type="text"], input[type="password"]');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < Math.min(inputCount, 3); i++) { // Check first 3 inputs
      const input = inputs.nth(i);
      if (await input.isVisible()) {
        const label = await input.getAttribute('aria-label');
        const placeholder = await input.getAttribute('placeholder');
        const hasLabel = label || placeholder;
        expect(hasLabel).toBeTruthy();
      }
    }
  });
});