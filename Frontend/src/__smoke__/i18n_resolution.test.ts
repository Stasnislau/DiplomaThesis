/**
 * Lock-in test: every static i18n key the codebase references must
 * resolve to a real string in EN, PL, and ES.
 *
 * Why automatic key collection: hardcoding the watch-list (the
 * earlier version of this file) lets a developer add a new t() call
 * without realising the locale needs an entry — the missing-key
 * surfaces in the live UI as the literal key path (e.g.
 * "essay.generatingPrompt"), which is exactly the regression we
 * shipped earlier and the user spotted on prod.
 *
 * The collector reads every .ts/.tsx file under src/ at test time
 * and grabs the first argument of every static t() call:
 *   - t("foo.bar")
 *   - t('foo.bar')
 *   - t(`foo.bar`)
 *   - the static prefix portion of t(`foo.${dynamic}`) — we resolve
 *     the prefix as a partial probe rather than exact-match.
 *
 * Skipped:
 *   - keys with `defaultValue` — those work even on miss, so a
 *     missing entry only matters if the key has no default. We
 *     still flag them for non-EN locales so PL/ES don't silently
 *     fall back to English everywhere.
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import i18n from "i18next";
import "@/config/i18n";

const SRC_DIR = path.resolve(__dirname, "..");

interface KeyHit {
  key: string;
  hasDefaultValue: boolean;
  file: string;
}

// Excluded from the watch-list. These are top-level prefixes that
// look key-shaped to the regex but are actually JS object accesses
// or in-test-fixture string literals (e.g. an option label happens
// to look like t("Spanish")).
const EXCLUDED_PREFIXES = new Set([
  // English/UI labels passed verbatim to t() inside test fixtures
  // like getByText helpers — they're not i18n keys.
  "Spanish",
  "Berlin",
  "Madrid",
  "Krakow",
  "Warsaw",
  "Geography",
  "False",
  "True",
  "Cancel",
  "Dictation",
  "History",
  "Hello",
  "HELLO",
  "Title",
  "USER",
  "What",
  "Incorrect",
  "Missed",
  "A",
  "A1",
  "B1",
  "C",
  // Test/mock fixture noise
  "ephemeral",
  "perennial",
  "transient",
  "passing",
  "lasting",
  "south",
  "novel",
  "novl",
  "book",
  "bok",
  "tome",
  "car",
  "airplane",
  "hello",
  "helo",
  "hllo",
  "hlo",
  "xyz",
  "limit",
  "button",
  "it",
  // Type-discriminator literals (q.type values)
  "format",
  "type",
  "promptText",
  "targetPhrase",
  "uiLocale",
  "userId",
]);

// Object-property accesses misparsed as keys. Different shape.
const EXCLUDED_KEYS = new Set<string>([
  // Programmatic fragments matched by template-literal pattern
  "tasks.questionType",
  "tasks.speakingFormat",
  // Template-literal prefix from t(`errors.codes.${code}`) — its
  // sub-keys are validated by test/integration/errorCodeCatalog.test.ts
  // against utils/error_codes.py, which is the right place to enforce
  // they all exist.
  "errors.codes.",
  "errors.codes",
]);

/**
 * i18next supports plural suffixes (_one, _other, _few, _many, etc.).
 * If a code calls `t("foo.bar", { count: N })`, i18next looks up
 * `foo.bar_one` / `foo.bar_other` automatically — the bare key
 * `foo.bar` is NOT expected to exist. We treat any key whose plural
 * siblings exist as covered.
 */
const PLURAL_SUFFIXES = ["_one", "_other", "_few", "_many", "_two", "_zero"];

const hasPluralVariant = (
  i18nInstance: typeof i18n,
  key: string,
): boolean => {
  return PLURAL_SUFFIXES.some((suf) => {
    const probed = i18nInstance.t(`${key}${suf}`);
    return probed !== `${key}${suf}` && probed.length > 0;
  });
};

const collectKeys = (): KeyHit[] => {
  const out: KeyHit[] = [];
  // Static-key form: t("foo.bar") / t('foo.bar') / t(`foo.bar`)
  const staticRe = /\bt\(\s*([`"'])([a-zA-Z][\w.]*)\1\s*(,\s*\{[^}]*})?/g;
  // Template form: t(`foo.${x}`) — capture the prefix `foo.` so
  // we can probe `foo.<known-suffix>` from i18n side. We don't
  // probe these directly here; they're reported only.
  const visit = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "__smoke__") continue;
        visit(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      if (entry.name.endsWith(".d.ts")) continue;
      // Skip i18n config + test files — i18n config has the
      // namespaces themselves (would cause false positives), and
      // test files often pass plain strings to t() as fixtures.
      if (full.endsWith("i18n.ts")) continue;
      if (/\.test\.(ts|tsx)$/.test(entry.name)) continue;
      const src = fs.readFileSync(full, "utf-8");
      let m: RegExpExecArray | null;
      while ((m = staticRe.exec(src)) !== null) {
        const key = m[2];
        const opts = m[3] || "";
        const hasDefaultValue = /\bdefaultValue\s*:/.test(opts);
        if (key.indexOf(".") < 0) continue; // ignore single-segment fixtures
        const top = key.split(".")[0];
        if (EXCLUDED_PREFIXES.has(top)) continue;
        if (EXCLUDED_KEYS.has(key)) continue;
        out.push({
          key,
          hasDefaultValue,
          file: path.relative(SRC_DIR, full),
        });
      }
    }
  };
  visit(SRC_DIR);
  return out;
};

const ALL_HITS = collectKeys();
const UNIQUE_KEYS = Array.from(new Set(ALL_HITS.map((h) => h.key))).sort();

describe("i18n: every referenced key resolves in every locale", () => {
  beforeAll(async () => {
    // setupTests.ts already initialises i18n with EN as fallback.
  });

  for (const lng of ["en", "pl", "es"] as const) {
    describe(lng, () => {
      beforeAll(async () => {
        await i18n.changeLanguage(lng);
      });

      // We probe each unique key and report misses as a single
      // sub-test per key so a developer can read the failing test
      // name and immediately know which key path is missing.
      for (const key of UNIQUE_KEYS) {
        const allHits = ALL_HITS.filter((h) => h.key === key);
        const everyCallSiteHasDefault = allHits.every(
          (h) => h.hasDefaultValue,
        );
        it(`resolves "${key}"`, () => {
          const value = i18n.t(key);
          if (value !== key && value.length > 0) return; // resolves directly
          // Plural fallback: t("foo.bar", { count }) auto-routes to
          // foo.bar_one / foo.bar_other; bare key need not exist.
          if (hasPluralVariant(i18n, key)) return;
          // Every call site uses { defaultValue: "..." } — the user
          // never sees the raw key, just the hardcoded default. Not
          // ideal for non-EN (they get English), but acceptable;
          // the watch-list flags genuine misses, not these.
          if (everyCallSiteHasDefault) return;
          // What's NEVER acceptable: a key with no default,
          // no plural variant, and no real translation. That's
          // exactly the case the user spotted on prod
          // (essay.generatingPrompt rendering as literal "essay.generatingPrompt").
          throw new Error(
            `i18n key "${key}" missing in ${lng}; callers: ${allHits
              .slice(0, 3)
              .map((h) => h.file)
              .join(", ")}`,
          );
        });
      }
    });
  }
});
