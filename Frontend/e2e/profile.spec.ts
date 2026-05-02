import { expect, test } from "@playwright/test";
import { loginViaStorage } from "./helpers/auth";

test.describe("User Profile Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaStorage(page, {
      user: {
        email: "test@example.com",
        name: "Test",
        surname: "User",
      },
    });
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");
  });

  test("displays user info heading and email", async ({ page }) => {
    const heading = page
      .locator("h1, h2")
      .filter({ hasText: /Profile|Settings|Account/i })
      .first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    await expect(page.getByText("test@example.com")).toBeVisible();
  });

  test("stays on /profile and exposes the user role badge", async ({
    page,
  }) => {
    expect(page.url()).toContain("/profile");
    expect(page.url()).not.toMatch(/\/login|\/welcome/);

    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/USER|ADMIN/i).first()).toBeVisible();
  });
});
