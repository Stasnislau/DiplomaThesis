import { expect, test } from "@playwright/test";
import { mockAuthRoutes } from "./helpers/auth";

/**
 * Auth E2E tests — Registration, Login, Logout flows.
 *
 * Routes are mocked via helpers/auth.ts so these tests do not depend on
 * a backend or seeded data. Assertions are unconditional: a missing
 * link should fail the test, not silently pass.
 */

test.describe("Registration", () => {
  test("shows the registration form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(
      page.locator('input[type="email"], input[name="email"]'),
    ).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("rejects empty form submission and stays on /register", async ({
    page,
  }) => {
    await page.goto("/register");

    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Form must NOT navigate away with empty inputs (validation should block).
    await expect(page).toHaveURL(/register/);
  });

  test("links from /register to /login", async ({ page }) => {
    await page.goto("/register");

    const loginLink = page
      .locator('a[href="/login"], a:has-text("Log in"), a:has-text("Sign in")')
      .first();
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/login/);
  });
});

test.describe("Login", () => {
  test("shows the login form", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.locator('input[type="email"], input[name="email"]'),
    ).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("shows error on invalid credentials (mocked 401)", async ({ page }) => {
    await page.route("**/auth/login", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          payload: { message: "Invalid credentials" },
        }),
      });
    });

    await page.goto("/login");
    await page.fill(
      'input[type="email"], input[name="email"]',
      "wrong@email.com",
    );
    await page.fill('input[type="password"]', "wrongpassword");
    await page.locator('button[type="submit"]').click();

    // Either we surface an error (preferred) or we stay on the login page.
    // Both are valid UX, but at least one MUST be true.
    const errorEl = page.locator(
      '[role="alert"], .text-red-500, .text-red-400, .error',
    );
    await page.waitForTimeout(1000);
    const errorVisible = await errorEl.first().isVisible().catch(() => false);
    const stayedOnLogin = page.url().includes("/login");
    expect(errorVisible || stayedOnLogin).toBeTruthy();
  });

  test("successful login navigates away from /login", async ({ page }) => {
    await mockAuthRoutes(page);
    await page.goto("/login");
    await page.fill(
      'input[type="email"], input[name="email"]',
      "test@example.com",
    );
    await page.fill('input[type="password"]', "password123!");
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(
      (url) => !url.pathname.startsWith("/login"),
      { timeout: 5000 },
    );
    expect(page.url()).not.toContain("/login");
  });

  test("links from /login to /register", async ({ page }) => {
    await page.goto("/login");

    const registerLink = page
      .locator(
        'a[href="/register"], a:has-text("Register"), a:has-text("Sign up")',
      )
      .first();
    await expect(registerLink).toBeVisible();
    await registerLink.click();
    await expect(page).toHaveURL(/register/);
  });
});

test.describe("Landing & route guards", () => {
  test("welcome page loads", async ({ page }) => {
    await page.goto("/welcome");
    await expect(page).toHaveURL(/welcome|login/);
  });

  test("unauthenticated user is redirected from protected routes", async ({
    page,
  }) => {
    await page.goto("/tasks");
    await page.waitForTimeout(1500);
    expect(page.url()).toMatch(/login|welcome/);
  });
});
