import { expect, test } from "@playwright/test";

test.describe("Tasks Page Navigation & Layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "password123!");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");
  });

  test("should render the main tasks tabs", async ({ page }) => {
    await expect(page.locator("h1").locator("text=Tasks")).toBeVisible();

    const tabs = page.getByRole("tablist");
    await expect(tabs).toBeVisible();
    await expect(page.getByRole("tab", { name: /Writing/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Speaking/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Listening/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Materials/i })).toBeVisible();
  });

  test("should switch between task types", async ({ page }) => {
    await page.getByRole("tab", { name: /Speaking/i }).click();
    await expect(
      page.getByRole("button", { name: /Generate Speaking Task/i }),
    ).toBeVisible();

    await page.getByRole("tab", { name: /Listening/i }).click();
    await expect(
      page.getByRole("button", { name: /Generate Listening Task/i }),
    ).toBeVisible();

    await page.getByRole("tab", { name: /Materials/i }).click();
    await expect(page.getByText(/Upload PDF/i)).toBeVisible();
  });

  test("should allow selecting language and level in Listening task", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: /Listening/i }).click();

    await page.getByText("Spanish").click();

    await page.getByText("B1").click();

    const generateBtn = page.getByRole("button", {
      name: /Generate Listening Task/i,
    });
    await expect(generateBtn).toBeVisible();
    await expect(generateBtn).not.toBeDisabled();
  });
});
