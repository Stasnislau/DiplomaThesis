import { Page } from "@playwright/test";

/**
 * Test fixtures shared across e2e specs.
 *
 * The frontend persists the access token in localStorage and the refresh
 * token in a `refreshToken` cookie, then decodes the JWT to read the
 * user role. Anything we put in `tokenPayload` must therefore be valid
 * base64-encoded JSON with `exp` in the future.
 */

const TEST_USER_ID = "246f5d4e-1112-484a-a7bf-45ebbe7d0330";
const TEST_USER_EMAIL = "test@example.com";

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/** Build an unsigned but structurally valid JWT for tests. */
export function makeTestJwt(role: "USER" | "ADMIN" = "USER"): string {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    email: TEST_USER_EMAIL,
    sub: TEST_USER_ID,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  return [
    base64UrlEncode(JSON.stringify(header)),
    base64UrlEncode(JSON.stringify(payload)),
    "test-signature",
  ].join(".");
}

interface MockAuthOptions {
  role?: "USER" | "ADMIN";
  /** Override the user payload returned from /user/me. */
  user?: Partial<{
    id: string;
    email: string;
    name: string;
    surname: string;
    languages: unknown[];
  }>;
}

const TEST_LANG_EN = "5a82a913-9d9b-412a-8b02-389a97ea4b98";
const TEST_LANG_RU = "051bf9fd-ccc7-41aa-8e78-06a1da7fe4f9";

/** Default user has English as native + Russian B1 in progress so the
 *  app skips the language-onboarding screen and goes straight to /tasks. */
const DEFAULT_USER_LANGUAGES = [
  {
    id: "ul-native",
    userId: TEST_USER_ID,
    languageId: TEST_LANG_EN,
    level: "NATIVE",
    isStarted: true,
    isNative: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ul-learning",
    userId: TEST_USER_ID,
    languageId: TEST_LANG_RU,
    level: "B1",
    isStarted: true,
    isNative: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

/**
 * Wire up route mocks for the auth + user endpoints touched by the login
 * flow and most authenticated pages. Call this in beforeEach **before**
 * `page.goto()` so the routes are registered when the app boots.
 */
export async function mockAuthRoutes(
  page: Page,
  options: MockAuthOptions = {},
): Promise<{ accessToken: string; refreshToken: string }> {
  const role = options.role ?? "USER";
  const accessToken = makeTestJwt(role);
  const refreshToken = makeTestJwt(role);

  await page.route("**/auth/login", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        payload: { accessToken, refreshToken },
      }),
    });
  });

  await page.route("**/auth/register", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ success: true, payload: true }),
    });
  });

  await page.route("**/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        payload: { accessToken, refreshToken },
      }),
    });
  });

  await page.route("**/user/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        payload: {
          id: options.user?.id ?? TEST_USER_ID,
          email: options.user?.email ?? TEST_USER_EMAIL,
          name: options.user?.name ?? "Test",
          surname: options.user?.surname ?? "User",
          role,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          languages: options.user?.languages ?? DEFAULT_USER_LANGUAGES,
        },
      }),
    });
  });

  await page.route("**/user/languages", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        payload: [
          { id: TEST_LANG_EN, name: "English", code: "en" },
          { id: "lang-pl", name: "Polish", code: "pl" },
          { id: "lang-es", name: "Spanish", code: "es" },
          { id: "lang-fr", name: "French", code: "fr" },
          { id: TEST_LANG_RU, name: "Russian", code: "ru" },
        ],
      }),
    });
  });

  // AI tokens — return at least one token so the "Add your AI token" modal
  // does not block the UI.
  await page.route("**/user/ai-tokens*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        payload: [
          {
            id: "tok-1",
            userId: TEST_USER_ID,
            token: "test-key-***",
            aiProviderId: "groq",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            isDefault: true,
            aiProvider: { id: "groq", name: "Groq" },
          },
        ],
      }),
    });
  });

  // Generic stub for Bridge calls — returns an empty success payload so
  // pages do not render their "service down" fallbacks. Specific specs
  // can override individual routes in their own test bodies.
  await page.route("**/api/gateway/bridge/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, payload: null }),
    });
  });

  return { accessToken, refreshToken };
}

/**
 * Plant the access token directly in localStorage and the refresh token in
 * a cookie, bypassing the login UI. Faster and more deterministic than
 * filling the form when the test does not specifically exercise login.
 */
export async function loginViaStorage(
  page: Page,
  options: MockAuthOptions = {},
): Promise<void> {
  const { accessToken, refreshToken } = await mockAuthRoutes(page, options);

  await page.addInitScript(
    ({ accessToken, refreshToken }) => {
      window.localStorage.setItem("accessToken", accessToken);
      document.cookie = `refreshToken=${refreshToken}; path=/; SameSite=Lax`;
    },
    { accessToken, refreshToken },
  );
}

/**
 * Submit the login form against the mocked /auth/login endpoint.
 * Use this when the test needs to assert the login UI itself.
 */
export async function loginViaUI(
  page: Page,
  email = TEST_USER_EMAIL,
  password = "password123!",
): Promise<void> {
  await mockAuthRoutes(page);
  await page.goto("/login");
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 5000,
  });
}
