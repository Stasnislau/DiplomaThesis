import { expect, test } from "@playwright/test";
import { loginViaStorage } from "./helpers/auth";

/**
 * Smoke-level: confirm /tasks renders for an authenticated user, does
 * not redirect back to /login, and exposes at least one task tab.
 * Deeper interaction tests would require mocking every Bridge endpoint.
 */
test.describe("Tasks Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaStorage(page);
    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");
  });

  test("renders /tasks for authenticated user", async ({ page }) => {
    expect(page.url()).toContain("/tasks");
    expect(page.url()).not.toMatch(/\/login|\/welcome/);

    const tasksHeading = page
      .locator("h1")
      .filter({ hasText: /Tasks/i })
      .first();
    await expect(tasksHeading).toBeVisible({ timeout: 10000 });
  });

  test("exposes at least one of the four task-type tabs", async ({ page }) => {
    const anyTab = page
      .getByRole("tab", { name: /Writing|Speaking|Listening|Materials/i })
      .first();
    await expect(anyTab).toBeVisible({ timeout: 10000 });
  });

  test("listening tab enables Generate after picking language and level", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: /Listening/i }).click();

    await page.getByText("Spanish").click();
    await page.getByText("B1").click();

    const generateBtn = page.getByRole("button", {
      name: /Generate Listening Task/i,
    });
    await expect(generateBtn).toBeVisible();
    await expect(generateBtn).not.toBeDisabled();
  });
});
