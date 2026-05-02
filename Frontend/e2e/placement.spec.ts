import {
  MOCK_API_RESPONSE,
  PLACEMENT_MOCK_ENGLISH_B2,
  PLACEMENT_MOCK_POLISH_A1,
} from "./mocks/aiTasks";
import { expect, test } from "@playwright/test";
import { loginViaStorage } from "./helpers/auth";

test.describe("Placement Test Userflow", () => {
  test.beforeEach(async ({ page }) => {
    // Placement test only makes sense for a user who has not yet been
    // placed in any learning language — otherwise the page short-circuits.
    await loginViaStorage(page, {
      user: {
        languages: [
          {
            id: "ul-native-only",
            userId: "246f5d4e-1112-484a-a7bf-45ebbe7d0330",
            languageId: "5a82a913-9d9b-412a-8b02-389a97ea4b98",
            level: "NATIVE",
            isStarted: true,
            isNative: true,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
    });
  });

  // TODO: /placement renders only the layout shell when the Bridge stub
  // returns null. The page logic depends on a richer task payload than the
  // current generic mock supplies; flesh this out with proper /placement
  // route ordering (helper stub registered AFTER spec-specific routes).
  test.skip("completes placement test using mocked AI responses", async ({
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
