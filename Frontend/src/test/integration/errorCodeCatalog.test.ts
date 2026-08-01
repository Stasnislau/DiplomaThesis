import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import i18n from "@/config/i18n";

const REPO_ROOT = join(__dirname, "../../../..");

interface CodeSource {
  label: string;
  path: string;
  regex: RegExp;
}

const SOURCES: CodeSource[] = [
  {
    label: "AI",
    path: "Backend/AIMicroservice/utils/error_codes.py",
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
          expect(text, `${locale} missing errors.codes.${code}`).not.toBe(
            `errors.codes.${code}`,
          );
          expect(text.trim().length).toBeGreaterThan(0);
        },
      );
    },
  );
});
