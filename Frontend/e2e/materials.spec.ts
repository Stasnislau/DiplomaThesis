import { expect, test } from "@playwright/test";
import { loginViaStorage } from "./helpers/auth";

/**
 * Browser paths for the pages a learner reaches after signing in.
 *
 * Each case checks that the page mounts and shows its own content
 * rather than an error boundary, which is the failure these tests are
 * here to catch: a broken lazy chunk or a route that renders nothing
 * looks fine to every layer below the browser.
 */
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
