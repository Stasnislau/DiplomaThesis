/**
 * Cross-service catalog test: for every error code declared in any
 * backend (Bridge / Auth / User), the frontend i18n catalog must
 * have a translation in en, pl, and es.
 *
 * Without this, adding a new code to the backend silently produces
 * raw `errors.codes.MY_NEW_CODE` strings on the user's screen until
 * someone notices in QA. This test runs in CI on every commit and
 * fails fast.
 *
 * It reads the source files directly (regex over constants) instead
 * of importing them, because Bridge is Python and the Nest files
 * use NestJS-only imports we don't want to drag into vitest.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import i18n from "@/config/i18n";

// Frontend lives at <repo>/Frontend; the backends sit one level up.
const REPO_ROOT = join(__dirname, "../../../..");

interface CodeSource {
  label: string;
  path: string;
  /** Matches lines of the form `export const NAME = "NAME"` (TS) or
   *  `NAME = "NAME"` (Python). The capture group is the constant
   *  name — by convention that's also the wire code. */
  regex: RegExp;
}

const SOURCES: CodeSource[] = [
  {
    label: "Bridge",
    path: "Backend/BridgeMicroservice/utils/error_codes.py",
    regex: /^([A-Z][A-Z0-9_]+)\s*=\s*"\1"/gm,
  },
  {
    label: "Auth",
    path: "Backend/AuthMicroservice/src/utils/errorCodes.ts",
    regex: /export const ([A-Z][A-Z0-9_]+)\s*=\s*"\1"/g,
  },
  {
    label: "User",
    path: "Backend/UserMicroservice/src/utils/errorCodes.ts",
    regex: /export const ([A-Z][A-Z0-9_]+)\s*=\s*"\1"/g,
  },
];

function extractCodes(src: CodeSource): string[] {
  const text = readFileSync(join(REPO_ROOT, src.path), "utf8");
  const codes = new Set<string>();
  for (const m of text.matchAll(src.regex)) {
    codes.add(m[1]);
  }
  return [...codes];
}

const allCodes = SOURCES.flatMap((src) =>
  extractCodes(src).map((code) => ({ source: src.label, code })),
);

describe("error-code catalog consistency", () => {
  it("at least one code was extracted from each backend", () => {
    for (const src of SOURCES) {
      const codes = extractCodes(src);
      expect(codes.length, `no codes parsed from ${src.label}`).toBeGreaterThan(0);
    }
  });

  describe.each(["en", "pl", "es"] as const)(
    "%s catalog has every backend code",
    (locale) => {
      it.each(allCodes)(
        "$source $code → errors.codes.$code",
        async ({ code }) => {
          await i18n.changeLanguage(locale);
          const text = i18n.t(`errors.codes.${code}`);
          // i18next returns the key itself when missing.
          expect(text, `${locale} missing errors.codes.${code}`).not.toBe(
            `errors.codes.${code}`,
          );
          expect(text.trim().length).toBeGreaterThan(0);
        },
      );
    },
  );
});
