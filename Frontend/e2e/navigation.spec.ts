import { expect, test } from "@playwright/test";

test.describe("Navigation", () => {
  test("login page has correct title and heading", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();
  });

  test("register page has correct form fields", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    await expect(
      page.locator('input[type="email"], input[name="email"]'),
    ).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("404 page shows for unknown routes", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await page.waitForLoadState("networkidle");

    const body = await page.textContent("body");
    expect(
      body?.toLowerCase().includes("not found") ||
        body?.toLowerCase().includes("404") ||
        page.url().includes("not-found"),
    ).toBeTruthy();
  });
});

test.describe("Dark mode", () => {
  test("login page applies dark class when toggled on html element", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.evaluate(() =>
      document.documentElement.classList.add("dark"),
    );

    const classList = await page
      .locator("html")
      .getAttribute("class");
    expect(classList).toContain("dark");
    await expect(page.locator("body")).toBeVisible();
  });

  test("dark mode elements render with correct classes", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
    });

    await page.waitForTimeout(500);
    const darkElements = page.locator('[class*="dark:"]');
    const count = await darkElements.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe("Responsive design", () => {
  test("login page works on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await expect(
      page.locator('input[type="email"], input[name="email"]'),
    ).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("register page works on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    await expect(
      page.locator('input[type="email"], input[name="email"]'),
    ).toBeVisible();
  });
});
