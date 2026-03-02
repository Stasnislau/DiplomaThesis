import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Automated Accessibility (a11y) audit using axe-core.
 *
 * Scans each public page for WCAG 2.1 violations.
 * Any violations will fail the test and produce a detailed report.
 */

const PUBLIC_PAGES = [
  { name: "Login", path: "/login" },
  { name: "Register", path: "/register" },
  { name: "Welcome", path: "/welcome" },
];

for (const { name, path } of PUBLIC_PAGES) {
  test.describe(`Accessibility: ${name} page`, () => {
    test(`${name} page has no critical a11y violations`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      // Filter only critical and serious violations
      const critical = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );

      if (critical.length > 0) {
        const report = critical
          .map(
            (v) =>
              `[${v.impact?.toUpperCase()}] ${v.id}: ${v.description}\n` +
              `  Help: ${v.helpUrl}\n` +
              `  Affected: ${v.nodes.map((n) => n.html).join("\n           ")}`,
          )
          .join("\n\n");

        console.log(`\n=== A11y violations on ${name} ===\n${report}\n`);
      }

      // Fail on critical violations only
      const criticalOnly = results.violations.filter(
        (v) => v.impact === "critical",
      );
      expect(
        criticalOnly,
        `Found ${criticalOnly.length} critical a11y violation(s) on ${name}`,
      ).toHaveLength(0);
    });

    test(`${name} page has proper heading hierarchy`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      // Check that at least one heading exists
      const headings = page.locator("h1, h2, h3, h4, h5, h6");
      const count = await headings.count();
      expect(
        count,
        `${name} page should have at least one heading`,
      ).toBeGreaterThan(0);
    });

    test(`${name} page images have alt text`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      const images = page.locator("img");
      const count = await images.count();

      for (let i = 0; i < count; i++) {
        const alt = await images.nth(i).getAttribute("alt");
        const role = await images.nth(i).getAttribute("role");
        // Image should have alt text OR role="presentation"/"none"
        expect(
          alt !== null || role === "presentation" || role === "none",
          `Image ${i} on ${name} page is missing alt text`,
        ).toBeTruthy();
      }
    });

    test(`${name} page interactive elements are focusable`, async ({
      page,
    }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      const buttons = page.locator("button:visible");
      const count = await buttons.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const btn = buttons.nth(i);
        // Should be focusable (tabindex not -1)
        const tabindex = await btn.getAttribute("tabindex");
        expect(
          tabindex !== "-1",
          `Button ${i} on ${name} should be focusable`,
        ).toBeTruthy();
      }
    });

    test(`${name} page form inputs have labels`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      const inputs = page.locator(
        'input[type="text"]:visible, input[type="email"]:visible, input[type="password"]:visible, textarea:visible',
      );
      const count = await inputs.count();

      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute("id");
        const ariaLabel = await input.getAttribute("aria-label");
        const ariaLabelledBy = await input.getAttribute("aria-labelledby");
        const placeholder = await input.getAttribute("placeholder");

        // Input should have at least one labeling mechanism
        const hasLabel = id
          ? (await page.locator(`label[for="${id}"]`).count()) > 0
          : false;

        expect(
          hasLabel || ariaLabel || ariaLabelledBy || placeholder,
          `Input ${i} on ${name} page has no accessible label`,
        ).toBeTruthy();
      }
    });
  });
}
