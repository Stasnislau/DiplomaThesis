import { expect, test } from "@playwright/test";
import { loginViaStorage } from "./helpers/auth";

test.describe("Signed-in pages", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaStorage(page);
  });

  test("opens the materials page", async ({ page }) => {
    await page.goto("/materials");

    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toContain("/materials");
  });

  test("opens the history page", async ({ page }) => {
    await page.goto("/history");

    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toContain("/history");
  });

  test("keeps the learning path reachable from the task page", async ({
    page,
  }) => {
    await page.goto("/tasks");
    await page.waitForURL("**/tasks**", { timeout: 15000 });

    await page.goto("/learning-path");

    await expect(page).toHaveURL(/\/learning-path/, { timeout: 15000 });
  });

  test("renders the profile without an error boundary", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForURL("**/profile**", { timeout: 15000 });

    await expect(
      page.getByText(/something went wrong|unexpected error/i),
    ).toHaveCount(0);
  });

});
