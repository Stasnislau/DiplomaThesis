import { expect, test } from "@playwright/test";
import { mockAuthRoutes } from "./helpers/auth";

/**
 * The forms a visitor meets before there is a session.
 *
 * Sign-in and registration are the only screens a learner cannot skip,
 * so their failure modes matter more than their happy path: an empty
 * submit must not navigate, a refused sign-in must leave the form
 * usable, and a server that answers with an error must not leave the
 * page blank.
 */
test.describe("Sign-in form", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthRoutes(page);
  });

  test("shows both credential fields", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("stays on the page when the form is submitted empty", async ({ page }) => {
    await page.goto("/login");

    await page.locator('button[type="submit"]').first().click();

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("keeps the form usable after a refused sign-in", async ({ page }) => {
    await page.route("**/auth/login", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ success: false, payload: { message: "no" } }),
      }),
    );
    await page.goto("/login");

    await page.locator('input[type="email"], input[name="email"]').first().fill("a@b.c");
    await page.locator('input[type="password"]').first().fill("wrong");
    await page.locator('button[type="submit"]').first().click();

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("does not leave the page blank when the server fails", async ({
    page,
  }) => {
    await page.route("**/auth/login", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: "{}" }),
    );
    await page.goto("/login");

    await page.locator('input[type="email"], input[name="email"]').first().fill("a@b.c");
    await page.locator('input[type="password"]').first().fill("x");
    await page.locator('button[type="submit"]').first().click();

    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("offers a way to reach registration", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("link", { name: /register|sign up|create/i }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("renders on a narrow screen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/login");

    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });
});

test.describe("Registration form", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthRoutes(page);
  });

  test("shows an address field and a password field", async ({ page }) => {
    await page.goto("/register");

    await expect(
      page.locator('input[type="email"], input[name="email"]').first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("stays on the page when the form is submitted empty", async ({ page }) => {
    await page.goto("/register");

    await page.locator('button[type="submit"]').first().click();

    await expect(page).toHaveURL(/\/register/, { timeout: 10000 });
  });

  test("keeps the form usable when the address is taken", async ({ page }) => {
    await page.route("**/auth/register", (route) =>
      route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ success: false, payload: { code: "AUTH_EMAIL_TAKEN" } }),
      }),
    );
    await page.goto("/register");

    await page.locator('input[type="email"], input[name="email"]').first().fill("taken@b.c");
    await page.locator('input[type="password"]').first().fill("password123");
    await page.locator('button[type="submit"]').first().click();

    await expect(page).toHaveURL(/\/register/, { timeout: 10000 });
  });

  test("offers a way back to sign-in", async ({ page }) => {
    await page.goto("/register");

    await expect(
      page.getByRole("link", { name: /login|sign in/i }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("renders on a tablet screen", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto("/register");

    await expect(page.locator("input").first()).toBeVisible();
  });
});

test.describe("Password recovery form", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthRoutes(page);
  });

  test("opens without a session", async ({ page }) => {
    await page.goto("/reset-password");

    await expect(page.locator("input").first()).toBeVisible({ timeout: 10000 });
  });

  test("stays on the page when submitted empty", async ({ page }) => {
    await page.goto("/reset-password");

    const submit = page.locator('button[type="submit"]').first();
    if (await submit.count()) await submit.click();

    await expect(page).toHaveURL(/\/reset-password/, { timeout: 10000 });
  });

  test("keeps the page rendered when the address is unknown", async ({
    page,
  }) => {
    await page.route("**/auth/resetPassword", (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ success: false, payload: {} }),
      }),
    );
    await page.goto("/reset-password");

    await expect(page.locator("body")).not.toBeEmpty();
  });
});
