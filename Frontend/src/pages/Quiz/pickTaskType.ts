/**
 * Quiz task picker — three modalities (writing / listening / speaking)
 * surfaced behind a single Generate Task click.
 *
 * The catalog is two-level: first roll a category (writing /
 * listening / speaking), then roll a sub-type within it. Essay sits
 * inside the writing category but is gated to B1+ and weighted low
 * because it costs the user 5+ minutes.
 *
 * Speaking sub-formats are gated by level too — A-level learners
 * shouldn't be asked for a 90-second free monologue. Listening sub-
 * types follow the same rule (multi-speaker matching needs B1+).
 *
 * Returns a discriminated union so the renderer can dispatch on
 * `kind` and not have to enumerate a flat list of 18+ tokens.
 */

import type { ListeningQuestionType } from "@/types/responses/ListeningResponse";
import type { SpeakingFormat } from "@/types/responses/SpeakingResponse";

export type QuizWritingType =
  | "multiple_choice"
  | "fill_in_the_blank"
  | "true_false"
  | "multi_select_mc"
  | "matching"
  | "cloze_passage"
  | "open"
  | "essay";

export type QuizVariant =
  | { kind: "writing"; type: QuizWritingType }
  | { kind: "listening"; questionType: ListeningQuestionType }
  | { kind: "speaking"; format: SpeakingFormat };

/** Back-compat alias used by callers that still want the flat
 *  string for telemetry / logging. */
export type QuizTaskType = QuizWritingType;

export type QuizLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

const ESSAY_GATED_LEVELS: ReadonlySet<QuizLevel> = new Set([
  "B1",
  "B2",
  "C1",
  "C2",
]);

interface WeightedOption<T> {
  type: T;
  weight: number;
}

// ---------- Writing sub-weights ------------------------------------

const WRITING_BELOW_B1: WeightedOption<QuizWritingType>[] = [
  { type: "multiple_choice", weight: 40 },
  { type: "fill_in_the_blank", weight: 40 },
  { type: "true_false", weight: 20 },
];

const WRITING_FROM_B1: WeightedOption<QuizWritingType>[] = [
  { type: "multiple_choice", weight: 22 },
  { type: "fill_in_the_blank", weight: 22 },
  { type: "true_false", weight: 13 },
  { type: "multi_select_mc", weight: 12 },
  { type: "matching", weight: 12 },
  { type: "cloze_passage", weight: 7 },
  { type: "open", weight: 5 },
  // Heavy: 5+ minutes if it lands. Kept rare so the loop doesn't
  // feel like homework.
  { type: "essay", weight: 7 },
];

// ---------- Listening sub-weights ----------------------------------

const LISTENING_BELOW_B1: WeightedOption<ListeningQuestionType>[] = [
  { type: "multiple_choice", weight: 50 },
  { type: "fill_in_the_blank", weight: 30 },
  { type: "dictation", weight: 20 },
];

const LISTENING_FROM_B1: WeightedOption<ListeningQuestionType>[] = [
  { type: "multiple_choice", weight: 25 },
  { type: "fill_in_the_blank", weight: 20 },
  { type: "dictation", weight: 15 },
  { type: "true_false_not_given", weight: 18 },
  { type: "sentence_completion", weight: 12 },
  { type: "multi_speaker_matching", weight: 10 },
];

// ---------- Speaking sub-weights -----------------------------------

const SPEAKING_BELOW_B1: WeightedOption<SpeakingFormat>[] = [
  // Below B1, only the simple read-aloud + repeat formats. Free
  // monologue / picture description need productive vocab the
  // learner doesn't have yet.
  { type: "read_aloud", weight: 60 },
  { type: "repeat_after_me", weight: 40 },
];

const SPEAKING_FROM_B1: WeightedOption<SpeakingFormat>[] = [
  { type: "read_aloud", weight: 20 },
  { type: "repeat_after_me", weight: 20 },
  { type: "timed_response", weight: 25 },
  { type: "picture_description", weight: 20 },
  { type: "free_monologue", weight: 15 },
];

// ---------- Category-level weights ---------------------------------

const CATEGORY_WEIGHTS = {
  writing: 50,
  listening: 25,
  speaking: 25,
} as const;

// ---------- Helpers -------------------------------------------------

const rollWeighted = <T>(
  weights: WeightedOption<T>[],
  rng: () => number,
): T => {
  const total = weights.reduce((s, w) => s + w.weight, 0);
  let r = rng() * total;
  for (const opt of weights) {
    r -= opt.weight;
    if (r < 0) return opt.type;
  }
  return weights[weights.length - 1].type;
};

const isB1Plus = (level: string): boolean =>
  ESSAY_GATED_LEVELS.has((level || "").toUpperCase() as QuizLevel);

export const isEssayAllowedForLevel = isB1Plus;

// ---------- Public API ---------------------------------------------

export const pickQuizVariant = (
  level: string,
  rng: () => number = Math.random,
): QuizVariant => {
  // Step 1: pick the category.
  const category = rollWeighted<keyof typeof CATEGORY_WEIGHTS>(
    [
      { type: "writing", weight: CATEGORY_WEIGHTS.writing },
      { type: "listening", weight: CATEGORY_WEIGHTS.listening },
      { type: "speaking", weight: CATEGORY_WEIGHTS.speaking },
    ],
    rng,
  );

  // Step 2: pick the sub-type with the appropriate level table.
  const above = isB1Plus(level);
  if (category === "writing") {
    return {
      kind: "writing",
      type: rollWeighted(above ? WRITING_FROM_B1 : WRITING_BELOW_B1, rng),
    };
  }
  if (category === "listening") {
    return {
      kind: "listening",
      questionType: rollWeighted(
        above ? LISTENING_FROM_B1 : LISTENING_BELOW_B1,
        rng,
      ),
    };
  }
  return {
    kind: "speaking",
    format: rollWeighted(above ? SPEAKING_FROM_B1 : SPEAKING_BELOW_B1, rng),
  };
};

/** Legacy flat-string picker kept for tests / older callers that
 *  only care about the writing leaf. */
export const pickQuizTaskType = (
  level: string,
  rng: () => number = Math.random,
): QuizWritingType => {
  const above = isB1Plus(level);
  return rollWeighted(above ? WRITING_FROM_B1 : WRITING_BELOW_B1, rng);
};
