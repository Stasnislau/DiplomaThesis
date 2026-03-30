import { expect, test } from "@playwright/test";

test.describe("Tasks Page Navigation & Layout", () => {
  // Try to bypass auth or assume we either get redirected to login or we mock auth
  // If the app requires auth to see /tasks, we should mock the user state or do a quick login
  
  test.beforeEach(async ({ page }) => {
    // Quick login to ensure we can access the tasks page if it's protected
    await page.goto("/login");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "password123!");
    await page.click('button[type="submit"]');
    // Wait for redirect to dashboard or tasks, fallback to explicitly going to tasks
    await page.waitForTimeout(500); 
    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");
  });

  test("should render the main tasks tabs", async ({ page }) => {
    // Check if the Tasks page header exists
    await expect(page.locator("h1").locator("text=Tasks")).toBeVisible();

    // Verify all four tabs are present
    const tabs = page.getByRole("tablist");
    await expect(tabs).toBeVisible();
    await expect(page.getByRole("tab", { name: /Writing/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Speaking/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Listening/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Materials/i })).toBeVisible();
  });

  test("should switch between task types", async ({ page }) => {
    // Click Speaking tab
    await page.getByRole("tab", { name: /Speaking/i }).click();
    await expect(page.getByRole("button", { name: /Generate Speaking Task/i })).toBeVisible();

    // Click Listening tab
    await page.getByRole("tab", { name: /Listening/i }).click();
    await expect(page.getByRole("button", { name: /Generate Listening Task/i })).toBeVisible();
    
    // Click PDF Materials tab
    await page.getByRole("tab", { name: /Materials/i }).click();
    await expect(page.getByText(/Upload PDF/i)).toBeVisible();
  });

  test("should allow selecting language and level in Listening task", async ({ page }) => {
    // Go to Listening
    await page.getByRole("tab", { name: /Listening/i }).click();
    
    // Check Language Selection
    await page.getByText("Spanish").click();
    
    // Check Level Selection
    await page.getByText("B1").click();
    
    // Generate button should now be enabled (or at least visible and clickable)
    const generateBtn = page.getByRole("button", { name: /Generate Listening Task/i });
    await expect(generateBtn).toBeVisible();
    await expect(generateBtn).not.toBeDisabled();
  });
});
