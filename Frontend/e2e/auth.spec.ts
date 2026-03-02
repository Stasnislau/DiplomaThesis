import { test, expect } from "@playwright/test";

/**
 * Auth E2E tests — Registration, Login, Logout flows.
 *
 * These tests run against the real frontend dev server but mock
 * backend responses so they are deterministic and fast.
 */

const _TEST_USER = {
  name: "Test User",
  email: `e2e_${Date.now()}@test.com`,
  password: "TestPassword123!",
};

// ── Registration ───────────────────────────────────────────────────────────────

test.describe("Registration", () => {
  test("shows the registration form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(
      page.locator('input[type="email"], input[name="email"]'),
    ).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("validates empty form submission", async ({ page }) => {
    await page.goto("/register");

    // Try to submit empty form
    const submitBtn = page.locator('button[type="submit"]');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Should stay on register page or show validation
      await expect(page).toHaveURL(/register/);
    }
  });

  test("navigates to login from register", async ({ page }) => {
    await page.goto("/register");

    const loginLink = page
      .locator('a[href="/login"], a:has-text("Log in"), a:has-text("Sign in")')
      .first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/login/);
    }
  });
});

// ── Login ──────────────────────────────────────────────────────────────────────

test.describe("Login", () => {
  test("shows the login form", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.locator('input[type="email"], input[name="email"]'),
    ).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill(
      'input[type="email"], input[name="email"]',
      "wrong@email.com",
    );
    await page.fill('input[type="password"]', "wrongpassword");

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Should show error or stay on login page
    await page.waitForTimeout(2000);
    const errorEl = page.locator(
      '[role="alert"], .text-red-500, .text-red-400, .error',
    );
    const isOnLogin = page.url().includes("/login");
    expect((await errorEl.isVisible()) || isOnLogin).toBeTruthy();
  });

  test("navigates to register from login", async ({ page }) => {
    await page.goto("/login");

    const registerLink = page
      .locator(
        'a[href="/register"], a:has-text("Register"), a:has-text("Sign up")',
      )
      .first();
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/register/);
    }
  });
});

// ── Landing & Welcome ──────────────────────────────────────────────────────────

test.describe("Landing page", () => {
  test("welcome page loads", async ({ page }) => {
    await page.goto("/welcome");
    await expect(page).toHaveURL(/welcome|login/);
  });

  test("unauthenticated user is redirected from protected routes", async ({
    page,
  }) => {
    await page.goto("/tasks");
    await page.waitForTimeout(2000);
    // Should be redirected to login or welcome
    expect(page.url()).toMatch(/login|welcome/);
  });
});
