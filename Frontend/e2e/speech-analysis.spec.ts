import { expect, test } from "@playwright/test";
import { loginViaStorage } from "./helpers/auth";

/**
 * Smoke: /speech-analysis opens for an authenticated user and offers
 * at least one entry path (file upload, drag-and-drop hint, or record).
 */
test.describe("Speech Analysis Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaStorage(page);
    await page.goto("/speech-analysis");
    await page.waitForLoadState("networkidle");
  });

  test("renders /speech-analysis for authenticated user", async ({ page }) => {
    expect(page.url()).toContain("/speech-analysis");
    expect(page.url()).not.toMatch(/\/login|\/welcome/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("exposes at least one audio-source entry point", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();
    const uploadHint = page
      .locator("text=/Upload|Drag and drop|Choose file/i")
      .first();
    const recordButton = page
      .locator("button")
      .filter({ hasText: /Record|Start|Mic/i })
      .first();
    const choosePrompt = page
      .locator("text=/Choose Language|Select.*language/i")
      .first();

    await expect(
      fileInput.or(uploadHint).or(recordButton).or(choosePrompt).first(),
    ).toBeVisible({ timeout: 10000 });
  });
});
