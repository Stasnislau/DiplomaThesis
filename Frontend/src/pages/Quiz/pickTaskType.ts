/**
 * Quiz task-type picker.
 *
 * Quiz surfaces the full Materials-style catalog so a single
 * Generate Task click can land on any of the 8 supported variants —
 * not just the historic MC/FIB pair. Mix and gating rules:
 *
 *   - `multiple_choice`, `fill_in_the_blank`, `true_false` are
 *     bread-and-butter quick-fire drills available at every level.
 *   - `multi_select_mc`, `matching`, `cloze_passage`, `open` need
 *     enough productive vocab to make sense — gated to B1+.
 *   - `essay` is heavy practice (5+ minutes); B1+ only and rare
 *     (~5%) so the loop doesn't feel like homework.
 *
 * Returns the chosen variant. The picker takes an optional `rng`
 * (defaults to Math.random) so tests can drive deterministic
 * scenarios.
 */
export type QuizTaskType =
  | "multiple_choice"
  | "fill_in_the_blank"
  | "true_false"
  | "multi_select_mc"
  | "matching"
  | "cloze_passage"
  | "open"
  | "essay";

export type QuizLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

const ESSAY_GATED_LEVELS: ReadonlySet<QuizLevel> = new Set([
  "B1",
  "B2",
  "C1",
  "C2",
]);

interface WeightedOption {
  type: QuizTaskType;
  weight: number;
}

// A1 / A2: only types a beginner can engage with productively.
const WEIGHTS_BELOW_B1: WeightedOption[] = [
  { type: "multiple_choice", weight: 35 },
  { type: "fill_in_the_blank", weight: 35 },
  { type: "true_false", weight: 30 },
];

// B1+: full catalog. Essay rare, cloze/matching moderate, MC/FIB
// still the most common because they're fast.
const WEIGHTS_FROM_B1: WeightedOption[] = [
  { type: "multiple_choice", weight: 22 },
  { type: "fill_in_the_blank", weight: 22 },
  { type: "true_false", weight: 15 },
  { type: "multi_select_mc", weight: 12 },
  { type: "matching", weight: 12 },
  { type: "cloze_passage", weight: 7 },
  { type: "open", weight: 5 },
  // Heavy by design: a 5-minute drill if it lands. Keep it rare so
  // the practice loop doesn't feel like homework but exposes the
  // learner to it occasionally.
  { type: "essay", weight: 5 },
];

export const isEssayAllowedForLevel = (level: string): boolean =>
  ESSAY_GATED_LEVELS.has((level || "").toUpperCase() as QuizLevel);

export const pickQuizTaskType = (
  level: string,
  rng: () => number = Math.random,
): QuizTaskType => {
  const weights = isEssayAllowedForLevel(level)
    ? WEIGHTS_FROM_B1
    : WEIGHTS_BELOW_B1;
  const total = weights.reduce((s, w) => s + w.weight, 0);
  // rng() returns [0, 1); scaling by total gives a point in
  // [0, total) which we walk through the cumulative buckets.
  let r = rng() * total;
  for (const opt of weights) {
    r -= opt.weight;
    if (r < 0) return opt.type;
  }
  // Defensive: floating-point rounding edge case.
  return weights[weights.length - 1].type;
};
