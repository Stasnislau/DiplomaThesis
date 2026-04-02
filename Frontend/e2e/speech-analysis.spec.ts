import { expect, test } from "@playwright/test";

test.describe("Speech Analysis Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate
    await page.goto("/login");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "password123!");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    
    // Go to speech analysis page
    await page.goto("/speech-analysis");
    await page.waitForLoadState("networkidle");
  });

  test("should render speech analysis upload and record controls", async ({ page }) => {
    // Check for main title
    await expect(page.locator("h1", { hasText: /Speech Analysis/i }).first()).toBeVisible();

    // Verify microphone/recording button exists
    const recordButton = page.locator("button", { hasText: /Record|Start/i }).first();
    await expect(recordButton).toBeVisible();
  });

  test("should handle file upload input for speech analysis", async ({ page }) => {
    // Check for file input or drag-and-drop zone
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await expect(fileInput).toBeAttached();
    } else {
      const uploadArea = page.locator("text=/Upload|Drag and drop/i").first();
      await expect(uploadArea).toBeVisible();
    }
  });

});
