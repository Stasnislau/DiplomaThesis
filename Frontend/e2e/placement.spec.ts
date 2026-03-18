import {
  MOCK_API_RESPONSE,
  PLACEMENT_MOCK_ENGLISH_B2,
  PLACEMENT_MOCK_POLISH_A1,
} from "./mocks/aiTasks";
import { expect, test } from "@playwright/test";

test.describe("Placement Test Userflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "password123");

    await Promise.all([
      page.waitForNavigation(),
      page.click('button[type="submit"]'),
    ]);
  });

  test("completes placement test using mocked AI responses", async ({
    page,
  }) => {
    await page.route("**/api/gateway/bridge/placement/task", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_API_RESPONSE(PLACEMENT_MOCK_POLISH_A1)),
      });
    });

    await page.route(
      "**/api/gateway/bridge/writing/explainanswer",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            payload: {
              isCorrect: true,
              explanation:
                "Excellent! 'Mieszkam' is the correct first-person present tense form of 'mieszkać' (to live) in Polish.",
              topicsToReview: [],
            },
          }),
        });
      },
    );

    await page.route("**/api/gateway/user/placement", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          payload: {
            level: "A1",
            message: "Placement test completed successfully.",
          },
        }),
      });
    });

    await page.goto("/placement");

    await page.click('img[alt="Polish"]');
    await page.click('button:has-text("Start Test")');

    await expect(
      page.locator(
        `text=${PLACEMENT_MOCK_POLISH_A1.question.replace("_______", "")}`,
      ),
    ).toBeVisible();

    await page.click(
      `button:has-text("${PLACEMENT_MOCK_POLISH_A1.correctAnswer[0]}")`,
    );

    await page.click('button:has-text("Check Answer")');

    await expect(page.locator("text=Excellent!")).toBeVisible();

    await page.click('button:has-text("Continue")');

    await expect(page.locator("text=A1")).toBeVisible();
  });
});
