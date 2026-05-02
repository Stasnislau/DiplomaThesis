import { expect, test } from "@playwright/test";
import { loginViaStorage } from "./helpers/auth";

/**
 * Smoke: /learning-path opens for an authenticated user and renders
 * either the populated path, an empty state, or a graceful service-down
 * fallback. Without a fully-mocked Bridge backend we accept any of those.
 */
test.describe("Learning Path Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaStorage(page);
    await page.goto("/learning-path");
    await page.waitForLoadState("networkidle");
  });

  test("renders /learning-path for authenticated user", async ({ page }) => {
    expect(page.url()).toContain("/learning-path");
    expect(page.url()).not.toMatch(/\/login|\/welcome/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("renders one of: populated path, empty state, or service fallback", async ({
    page,
  }) => {
    const populated = page
      .locator(".module-card")
      .or(page.locator("text=/Module 1/i"))
      .first();
    const empty = page
      .locator("text=/No path generated|Generate path|Start your journey/i")
      .first();
    const fallback = page
      .locator("text=/Failed to load|service is running|Bridge service/i")
      .first();

    await expect(populated.or(empty).or(fallback).first()).toBeVisible({
      timeout: 10000,
    });
  });
});
