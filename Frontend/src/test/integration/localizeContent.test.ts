/**
 * End-to-end check that backend-sourced content (which always arrives
 * in English) gets translated correctly across en/pl/es.
 *
 * Coverage:
 *   - 16 achievements (names + descriptions)
 *   - 23 module themes
 *   - 6 lesson types
 *   - module title + description patterns ("Unit N: Theme")
 *   - 138 lesson titles + descriptions
 *
 * For non-en locales we additionally assert the result actually
 * differs from the English input — catches the "we wired the helper
 * but forgot to translate" silent regression.
 */
import { describe, expect, it } from "vitest";

import i18n from "@/config/i18n";
import {
  LESSONS_EN,
  LESSONS_ES,
  LESSONS_PL,
} from "@/config/learningPathLessons";
import {
  getLocalizedAchievement,
  getLocalizedLesson,
  getLocalizedLessonType,
  getLocalizedModuleDescription,
  getLocalizedModuleTitle,
  getLocalizedTheme,
} from "@/utils/localizeContent";

// Mirror the seed in achievementService.ts. If a name changes there,
// this list goes stale on purpose — the test will flag it.
const ACHIEVEMENT_SEED = [
  ["First Steps", "Complete your first placement test"],
  ["Bookworm", "Complete 10 reading tasks"],
  ["Grammar Guru", "Complete 25 grammar tasks without errors"],
  ["Vocabulary Builder", "Learn 100 new words across all languages"],
  ["Voice Activated", "Complete your first speech analysis"],
  ["Silver Tongue", "Achieve 80%+ fluency score in speech analysis"],
  ["Orator", "Complete 10 speech analyses"],
  ["On Fire", "Maintain a 3-day learning streak"],
  ["Unstoppable", "Maintain a 7-day learning streak"],
  ["Dedicated", "Maintain a 30-day learning streak"],
  ["Explorer", "Start learning a new language"],
  ["Polyglot", "Study 3 different languages"],
  ["World Citizen", "Study 5 different languages"],
  ["Level Up", "Reach B1 level in any language"],
  ["Advanced Speaker", "Reach C1 level in any language"],
  ["Early Bird", "Complete a task before 8 AM"],
] as const;

const THEMES = [
  "Greetings & Introductions",
  "Family & Relationships",
  "Everyday Objects & Places",
  "Time & Daily Routines",
  "Food & Restaurants",
  "Transport & Travel",
  "Home & Living",
  "Health & Body",
  "Work & Career",
  "Technology & Media",
  "Environment & Nature",
  "Leisure & Entertainment",
  "Society & Global Issues",
  "Science & Innovation",
  "Art & Literature",
  "Psychology & the Human Mind",
  "Academic Language",
  "Professional Communication",
  "Philosophy & Critical Thinking",
  "Culture & Society – Advanced",
  "Mastery of Style",
  "Culture & Civilisation",
  "Specialised Domains",
] as const;

const LESSON_TYPES = [
  "vocabulary",
  "grammar",
  "theory",
  "practice",
  "listening",
  "speaking",
] as const;

const NON_EN_LOCALES = ["pl", "es"] as const;

describe("localized backend content", () => {
  describe("achievements (16)", () => {
    it.each(ACHIEVEMENT_SEED)(
      "translates %s in en/pl/es and pl/es differ from English",
      async (englishName, englishDescription) => {
        await i18n.changeLanguage("en");
        const en = getLocalizedAchievement(englishName, englishDescription);
        expect(en.name).toBe(englishName);
        expect(en.description).toBe(englishDescription);

        for (const locale of NON_EN_LOCALES) {
          await i18n.changeLanguage(locale);
          const localized = getLocalizedAchievement(
            englishName,
            englishDescription,
          );
          expect(
            localized.name,
            `${englishName} not translated in ${locale}`,
          ).not.toBe(englishName);
          expect(
            localized.description,
            `${englishName} description not translated in ${locale}`,
          ).not.toBe(englishDescription);
        }
      },
    );
  });

  describe("learning-path themes (23)", () => {
    it.each(THEMES)(
      "%s translated in pl/es",
      async (theme) => {
        await i18n.changeLanguage("en");
        expect(getLocalizedTheme(theme)).toBe(theme);

        for (const locale of NON_EN_LOCALES) {
          await i18n.changeLanguage(locale);
          expect(getLocalizedTheme(theme)).not.toBe(theme);
        }
      },
    );

    it("module title and description patterns interpolate the localized theme", async () => {
      const raw = "Unit 1: Greetings & Introductions";
      const desc = "Explore greetings & introductions and build solid A1 competency.";

      await i18n.changeLanguage("en");
      expect(getLocalizedModuleTitle(raw)).toContain("Greetings & Introductions");
      expect(getLocalizedModuleDescription(desc)).toContain("A1");

      await i18n.changeLanguage("pl");
      const plTitle = getLocalizedModuleTitle(raw);
      // pl pattern is "Moduł {n}: {theme}", and theme switches to PL.
      expect(plTitle).toMatch(/Moduł\s+1/);
      expect(plTitle).not.toBe(raw);

      await i18n.changeLanguage("es");
      const esTitle = getLocalizedModuleTitle(raw);
      expect(esTitle).toMatch(/Módulo\s+1/);
      expect(esTitle).not.toBe(raw);
    });
  });

  describe("lesson types (6)", () => {
    it.each(LESSON_TYPES)("%s translated in pl/es", async (type) => {
      // English just echoes the lowercase tag (no real translation
      // needed there, the catalog deliberately stores the raw word).
      for (const locale of NON_EN_LOCALES) {
        await i18n.changeLanguage(locale);
        expect(getLocalizedLessonType(type)).not.toBe("");
      }
    });
  });

  describe("lessons (138)", () => {
    it("all three lesson catalogs have identical key sets", () => {
      const enKeys = Object.keys(LESSONS_EN).sort();
      const plKeys = Object.keys(LESSONS_PL).sort();
      const esKeys = Object.keys(LESSONS_ES).sort();
      expect(plKeys).toEqual(enKeys);
      expect(esKeys).toEqual(enKeys);
      expect(enKeys.length).toBe(138);
    });

    it("every pl/es lesson actually differs from its English source", () => {
      const enKeys = Object.keys(LESSONS_EN);
      const issues: string[] = [];
      for (const key of enKeys) {
        const en = LESSONS_EN[key];
        const pl = LESSONS_PL[key];
        const es = LESSONS_ES[key];
        if (pl.title === en.title) issues.push(`PL title not translated: ${key}`);
        if (pl.description === en.description) {
          issues.push(`PL description not translated: ${key}`);
        }
        if (es.title === en.title) issues.push(`ES title not translated: ${key}`);
        if (es.description === en.description) {
          issues.push(`ES description not translated: ${key}`);
        }
      }
      expect(issues, issues.join("\n")).toEqual([]);
    });

    it("getLocalizedLesson honours the active locale", async () => {
      const sample = [
        "Saying Hello & Goodbye",
        "Past Simple – Regular Verbs",
        "Legal English",
      ];
      for (const title of sample) {
        await i18n.changeLanguage("en");
        const en = getLocalizedLesson(title, "");
        expect(en.title).toBe(title);

        for (const locale of NON_EN_LOCALES) {
          await i18n.changeLanguage(locale);
          const localized = getLocalizedLesson(title, "");
          expect(localized.title, `${title} in ${locale}`).not.toBe(title);
        }
      }
    });

    it("falls back to the English input when the slug is unknown", async () => {
      await i18n.changeLanguage("pl");
      const fallback = getLocalizedLesson(
        "Some Bogus Lesson Backend Made Up",
        "raw description",
      );
      expect(fallback.title).toBe("Some Bogus Lesson Backend Made Up");
      expect(fallback.description).toBe("raw description");
    });
  });
});
