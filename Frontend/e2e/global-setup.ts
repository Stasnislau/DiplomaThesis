import type { FullConfig } from "@playwright/test";

/**
 * Refuse to run against somebody else's dev server.
 *
 * Playwright reuses whatever already listens on the configured port, and port
 * 3000 is a popular choice. A server from another project answers every request
 * happily, the browser gets redirected to that project's login, and the run ends
 * with dozens of failures that have nothing to do with this code. Checking the
 * page title once turns that into one clear message.
 */
const EXPECTED_TITLE = "Easy Language";

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL;
  if (!baseURL) return;

  const response = await fetch(baseURL);
  const html = await response.text();
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();

  if (title !== EXPECTED_TITLE) {
    throw new Error(
      `${baseURL} is serving "${title ?? "an unknown page"}", not "${EXPECTED_TITLE}". ` +
        `Another project is holding that port. Stop it, or start this client there, then run the tests again.`,
    );
  }
}
