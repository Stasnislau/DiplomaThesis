import { expect, test } from "@playwright/test";
import { loginViaStorage, mockAuthRoutes } from "./helpers/auth";

test.describe("Routes for a signed-in learner", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaStorage(page);
  });

  test("opens the AI token settings", async ({ page }) => {
    await page.goto("/settings/ai-tokens");

    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toContain("/settings/ai-tokens");
  });

  test("opens the speech analysis page", async ({ page }) => {
    await page.goto("/speech-analysis");

    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toContain("/speech-analysis");
  });

  test("opens the lesson page", async ({ page }) => {
    await page.goto("/lesson");

    await expect(page.locator("body")).toBeVisible();
  });

  test("opens the root page", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("body")).toBeVisible();
  });

  test("opens the quiz page", async ({ page }) => {
    await page.goto("/quiz");

    await expect(page.locator("body")).toBeVisible();
  });

  test("opens a placement test for a language", async ({ page }) => {
    await page.goto("/placement/test/en");

    await expect(page.locator("body")).toBeVisible();
  });

  test("moves from the profile to the token settings and back", async ({
    page,
  }) => {
    await page.goto("/profile");
    await page.waitForURL("**/profile**", { timeout: 15000 });

    await page.goto("/settings/ai-tokens");
    await expect(page).toHaveURL(/ai-tokens/, { timeout: 15000 });

    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile/, { timeout: 15000 });
  });

  test("moves between the task page and the history page", async ({ page }) => {
    await page.goto("/tasks");
    await page.waitForURL("**/tasks**", { timeout: 15000 });

    await page.goto("/history");
    await expect(page).toHaveURL(/\/history/, { timeout: 15000 });
  });

  test("returns to the learning path after visiting materials", async ({
    page,
  }) => {
    await page.goto("/materials");
    await page.waitForURL("**/materials**", { timeout: 15000 });

    await page.goto("/learning-path");
    await expect(page).toHaveURL(/\/learning-path/, { timeout: 15000 });
  });

  test("keeps the browser back button working across pages", async ({
    page,
  }) => {
    await page.goto("/profile");
    await page.waitForURL("**/profile**", { timeout: 15000 });
    await page.goto("/history");
    await page.waitForURL("**/history**", { timeout: 15000 });

    await page.goBack();
    await page.waitForURL("**/profile**", { timeout: 15000 });

    await expect(page).toHaveURL(/\/profile/);
  });

  test("renders a page after a hard reload of a deep route", async ({
    page,
  }) => {
    await page.goto("/settings/ai-tokens");
    await page.waitForURL("**/ai-tokens**", { timeout: 15000 });

    await page.reload();

    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toContain("/settings/ai-tokens");
  });

  test("shows the top bar on a signed-in page", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForURL("**/profile**", { timeout: 15000 });

    await expect(page.locator("header, nav").first()).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("Routes closed to a visitor", () => {
  test("keeps a visitor off the token settings", async ({ page }) => {
    await mockAuthRoutes(page);
    await page.goto("/settings/ai-tokens");

    await expect(page).toHaveURL(/\/login|\/welcome/, { timeout: 15000 });
  });

  test("keeps a visitor off the speech analysis page", async ({ page }) => {
    await mockAuthRoutes(page);
    await page.goto("/speech-analysis");

    await expect(page).toHaveURL(/\/login|\/welcome/, { timeout: 15000 });
  });

  test("keeps a visitor off the lesson page", async ({ page }) => {
    await mockAuthRoutes(page);
    await page.goto("/lesson");

    await expect(page).toHaveURL(/\/login|\/welcome/, { timeout: 15000 });
  });

  test("lets a visitor reach the password reset form", async ({ page }) => {
    await mockAuthRoutes(page);
    await page.goto("/reset-password");

    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toContain("/reset-password");
  });

  test("lets a visitor reach the landing page", async ({ page }) => {
    await mockAuthRoutes(page);
    await page.goto("/welcome");

    await expect(page.locator("body")).toBeVisible();
  });
});
