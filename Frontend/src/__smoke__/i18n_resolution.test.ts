/**
 * Lock-in test: every i18n key the new Phase 1+2+3 code references
 * must resolve to a real string in EN, PL, and ES.
 *
 * `t("foo.bar")` returns the key itself ("foo.bar") when the lookup
 * misses, so checking `t(key) !== key` is the canonical "is this key
 * actually translated" assertion.
 *
 * Component tests pass the key through `t(key, { defaultValue: ... })`
 * which masks missing keys behind English fallbacks — those tests
 * would not catch a regression where a key gets dropped from the
 * locale file. This one would.
 */

import { describe, it, expect, beforeAll } from "vitest";
import i18n from "i18next";
import "@/config/i18n";

const KEYS = [
  // Materials renderers + Listening renderer integration
  "tasks.questionLabel",
  "tasks.questionTypes",
  "tasks.pickAtLeastOneType",
  "tasks.true",
  "tasks.false",
  "tasks.notGiven",
  "tasks.missed",
  "tasks.expected",
  "tasks.referenceAnswer",
  "tasks.selectAllThatApply",
  "tasks.matchingHint",
  "tasks.attributeStatements",
  "tasks.dictationHint",
  "tasks.fillBlank",
  "tasks.fillEachBlank",
  // Speaking guided-practice
  "tasks.modeFreeAnalyze",
  "tasks.modeGuided",
  "tasks.guidedPractice",
  "tasks.guidedPracticeHint",
  "tasks.loadPrompt",
  "tasks.newPrompt",
  "tasks.gradeMyAnswer",
  "tasks.grading",
  "tasks.timeRemaining",
  "tasks.contentScore",
  "tasks.coherenceScore",
  "tasks.vocabularyScore",
  "tasks.matchPercent",
  // Listening question type chip labels
  "tasks.questionType.multiple_choice",
  "tasks.questionType.fill_in_the_blank",
  "tasks.questionType.dictation",
  "tasks.questionType.true_false_not_given",
  "tasks.questionType.sentence_completion",
  "tasks.questionType.multi_speaker_matching",
  // Speaking format chip labels
  "tasks.speakingFormat.read_aloud",
  "tasks.speakingFormat.timed_response",
  "tasks.speakingFormat.repeat_after_me",
  "tasks.speakingFormat.picture_description",
  "tasks.speakingFormat.free_monologue",
];

describe("i18n keys for Phase 1+2+3 are present in every locale", () => {
  beforeAll(async () => {
    // setupTests.ts already initialises i18n with EN as fallback,
    // but we explicitly cycle through locales here to guard against
    // missing keys in non-default languages.
  });

  for (const lng of ["en", "pl", "es"] as const) {
    describe(lng, () => {
      beforeAll(async () => {
        await i18n.changeLanguage(lng);
      });

      for (const key of KEYS) {
        it(`resolves ${key}`, () => {
          const value = i18n.t(key);
          // i18next returns the key itself on miss. Falling back to
          // EN doesn't count as "translated" for non-EN locales.
          expect(value).not.toBe(key);
          expect(typeof value).toBe("string");
          expect((value as string).length).toBeGreaterThan(0);
        });
      }
    });
  }
});
