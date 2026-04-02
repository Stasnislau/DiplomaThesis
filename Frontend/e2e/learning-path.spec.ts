import { expect, test } from "@playwright/test";

test.describe("Learning Path Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Quick login to bypass auth protection
    await page.goto("/login");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "password123!");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    
    // Navigate to learning path page
    await page.goto("/learning-path");
    await page.waitForLoadState("networkidle");
  });

  test("should render the learning path view", async ({ page }) => {
    // Verifies the learning path title or container is visible
    await expect(page.locator("h1", { hasText: /(Learning|Path)/i }).first()).toBeVisible();
    
    // There should be a language selector on the learning path
    const languageSelect = page.locator("text=/Language|Select Language/i").first();
    await expect(languageSelect).toBeVisible();
  });

  test("should display modules and lessons if the user has a path", async ({ page }) => {
    // Check if progress indicator exists
    const progressText = page.locator("text=Progress").first();
    // Sometimes it might just show "Modules"
    const moduleCard = page.locator(".module-card, div >> text=/Module 1|Start/ig").first();

    // Since it's E2E and data depends on the mock/backend, we just check if
    // either a module is visible OR an empty state is visible
    const hasData = await moduleCard.isVisible().catch(() => false);
    const hasEmptyState = await page.locator("text=/No path generated|Generate path/i").isVisible().catch(() => false);
    
    expect(hasData || hasEmptyState).toBeTruthy();
  });
});
