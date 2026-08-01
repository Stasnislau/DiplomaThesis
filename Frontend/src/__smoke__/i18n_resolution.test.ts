
import { describe, it, beforeAll } from "vitest";
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

const EXCLUDED_PREFIXES = new Set([
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
  "format",
  "type",
  "promptText",
  "targetPhrase",
  "uiLocale",
  "userId",
]);

const EXCLUDED_KEYS = new Set<string>([
  "tasks.questionType",
  "tasks.speakingFormat",
  "errors.codes.",
  "errors.codes",
]);

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
  const staticRe = /\bt\(\s*([`"'])([a-zA-Z][\w.]*)\1\s*(,\s*\{[^}]*})?/g;
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
      if (full.endsWith("i18n.ts")) continue;
      if (/\.test\.(ts|tsx)$/.test(entry.name)) continue;
      const src = fs.readFileSync(full, "utf-8");
      let m: RegExpExecArray | null;
      while ((m = staticRe.exec(src)) !== null) {
        const key = m[2];
        const opts = m[3] || "";
        const hasDefaultValue = /\bdefaultValue\s*:/.test(opts);
        if (key.indexOf(".") < 0) continue;
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
  });

  for (const lng of ["en", "pl", "es"] as const) {
    describe(lng, () => {
      beforeAll(async () => {
        await i18n.changeLanguage(lng);
      });

      for (const key of UNIQUE_KEYS) {
        const allHits = ALL_HITS.filter((h) => h.key === key);
        const everyCallSiteHasDefault = allHits.every(
          (h) => h.hasDefaultValue,
        );
        it(`resolves "${key}"`, () => {
          const value = i18n.t(key);
          if (value !== key && value.length > 0) return;
          if (hasPluralVariant(i18n, key)) return;
          if (everyCallSiteHasDefault) return;
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
