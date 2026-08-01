import type { FullConfig } from "@playwright/test";

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
