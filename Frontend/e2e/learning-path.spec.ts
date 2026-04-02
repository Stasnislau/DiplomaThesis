import { expect, test } from "@playwright/test";

test.describe("Learning Path Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "password123!");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);

    await page.goto("/learning-path");
    await page.waitForLoadState("networkidle");
  });

  test("should render the learning path view", async ({ page }) => {
    await expect(
      page.locator("h1", { hasText: /(Learning|Path)/i }).first(),
    ).toBeVisible();

    const languageSelect = page
      .locator("text=/Language|Select Language/i")
      .first();
    await expect(languageSelect).toBeVisible();
  });

  test("should display modules and lessons if the user has a path", async ({
    page,
  }) => {
    const progressText = page.locator("text=Progress").first();
    const moduleCard = page
      .locator(".module-card, div >> text=/Module 1|Start/ig")
      .first();

    const hasData = await moduleCard.isVisible().catch(() => false);
    const hasEmptyState = await page
      .locator("text=/No path generated|Generate path/i")
      .isVisible()
      .catch(() => false);

    expect(hasData || hasEmptyState).toBeTruthy();
  });
});
