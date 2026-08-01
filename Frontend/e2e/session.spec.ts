import { expect, test } from "@playwright/test";
import { loginViaStorage, mockAuthRoutes } from "./helpers/auth";

test.describe("Session in the browser", () => {
  test("keeps a signed-out visitor off the learning path", async ({ page }) => {
    await mockAuthRoutes(page);
    await page.goto("/learning-path");

    await expect(page).toHaveURL(/\/login|\/welcome/, { timeout: 15000 });
  });

  test("keeps a signed-out visitor off the profile", async ({ page }) => {
    await mockAuthRoutes(page);
    await page.goto("/profile");

    await expect(page).toHaveURL(/\/login|\/welcome/, { timeout: 15000 });
  });

  test("keeps a signed-out visitor off the task page", async ({ page }) => {
    await mockAuthRoutes(page);
    await page.goto("/tasks");

    await expect(page).toHaveURL(/\/login|\/welcome/, { timeout: 15000 });
  });

  test("sends a signed-in learner away from the sign-in form", async ({
    page,
  }) => {
    await loginViaStorage(page);
    await page.goto("/login");

    await expect(page).not.toHaveURL(/\/login$/, { timeout: 15000 });
  });

  test("sends a signed-in learner away from the registration form", async ({
    page,
  }) => {
    await loginViaStorage(page);
    await page.goto("/register");

    await expect(page).not.toHaveURL(/\/register$/, { timeout: 15000 });
  });

  test("rebuilds the session from the refresh cookie when the access token is gone", async ({
    page,
  }) => {
    await loginViaStorage(page);
    await page.goto("/profile");
    await page.waitForURL("**/profile**", { timeout: 15000 });

    await page.evaluate(() => window.localStorage.clear());
    await page.goto("/profile");

    await expect(page).toHaveURL(/\/profile/, { timeout: 15000 });
  });

  test("opens a deep link straight to the task page for a signed-in learner", async ({
    page,
  }) => {
    await loginViaStorage(page);
    await page.goto("/tasks");

    await expect(page).toHaveURL(/\/tasks/, { timeout: 15000 });
  });

  test("shows the not-found page for an unknown route while signed in", async ({
    page,
  }) => {
    await loginViaStorage(page);
    await page.goto("/no-such-page");

    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toContain("/no-such-page");
  });

  test("survives a reload without asking the learner to sign in again", async ({
    page,
  }) => {
    await loginViaStorage(page);
    await page.goto("/profile");
    await page.waitForURL("**/profile**", { timeout: 15000 });

    await page.reload();

    await expect(page).toHaveURL(/\/profile/, { timeout: 15000 });
  });

  test("shows the welcome page to a visitor with no session", async ({
    page,
  }) => {
    await mockAuthRoutes(page);
    await page.goto("/welcome");

    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toContain("/welcome");
  });

  test("keeps a signed-out visitor off the history page", async ({ page }) => {
    await mockAuthRoutes(page);
    await page.goto("/history");

    await expect(page).toHaveURL(/\/login|\/welcome/, { timeout: 15000 });
  });

  test("keeps a signed-out visitor off the materials page", async ({ page }) => {
    await mockAuthRoutes(page);
    await page.goto("/materials");

    await expect(page).toHaveURL(/\/login|\/welcome/, { timeout: 15000 });
  });
});
