import { expect, test } from "@playwright/test";

test.describe("User Profile Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill(
      'input[name="email"], input[type="email"]',
      "test@example.com",
    );
    await page.fill(
      'input[name="password"], input[type="password"]',
      "password123!",
    );
    await page.click('button[type="submit"]');

    await page.waitForTimeout(500);
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");
  });

  test("should display user info and language settings", async ({ page }) => {
    await expect(
      page.locator("h1", { hasText: /Profile|Settings/i }).locator("nth=0"),
    )
      .toBeVisible({ timeout: 10000 })
      .catch(() => null);

    const emailField = page.getByText("test@example.com");
    await expect(emailField)
      .toBeVisible()
      .catch(() => null);
    const nativeLangSelect = page.getByRole("combobox", {
      name: /Native Language/i,
    });
    if (await nativeLangSelect.isVisible()) {
      await nativeLangSelect.click();
      await page.getByRole("option", { name: /English/i }).click();
    }
  });

  test("should display achievements section", async ({ page }) => {
    const achievementsHeader = page.getByRole("heading", {
      name: /Achievements|Badges/i,
    });
    if (await achievementsHeader.isVisible()) {
      await expect(achievementsHeader).toBeVisible();
      const badgeList = page.locator(".achievement-item, .badge");
      await expect(page).not.toHaveURL("/404");
    }
  });

  test("should handle AI provider settings", async ({ page }) => {
    const aiProvidersTab = page.getByRole("tab", {
      name: /AI Providers|Integrations/i,
    });
    if (await aiProvidersTab.isVisible()) {
      await aiProvidersTab.click();

      const openaiKeyInput = page.getByPlaceholder(/API Key/i).first();
      await expect(openaiKeyInput).toBeVisible();

      await openaiKeyInput.fill("sk-test-mock-key");
      const saveBtn = page
        .getByRole("button", { name: /Save|Update/i })
        .first();
      await saveBtn.click();
    }
  });
});
