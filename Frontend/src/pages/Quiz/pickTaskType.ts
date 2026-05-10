/**
 * Quiz task-type picker.
 *
 * The Quiz page asks the user for a language + level, then picks ONE
 * task variant to render. Mix and gating rules:
 *
 *   - `multiple_choice` and `fill_in_the_blank` are the bread-and-butter
 *     practice — they appear at every level, with equal frequency.
 *   - `essay` is **only available from B1 upward** (CEFR users below
 *     that don't have the productive vocab to write a coherent
 *     paragraph) and is **rare** (~10% of picks at qualifying levels)
 *     so the user mostly hits quick-fire MC/FIB and occasionally
 *     gets a heavier essay drill.
 *
 * Returns the chosen variant. The picker takes an optional `rng`
 * (defaults to Math.random) so tests can drive deterministic
 * scenarios.
 */
export type QuizTaskType =
  | "multiple_choice"
  | "fill_in_the_blank"
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

const WEIGHTS_BELOW_B1: WeightedOption[] = [
  { type: "multiple_choice", weight: 50 },
  { type: "fill_in_the_blank", weight: 50 },
];

const WEIGHTS_FROM_B1: WeightedOption[] = [
  { type: "multiple_choice", weight: 45 },
  { type: "fill_in_the_blank", weight: 45 },
  // Rare on purpose. An essay takes the user 5+ minutes; if it
  // appeared 1/3 of clicks the practice loop would feel like
  // homework, not warm-up.
  { type: "essay", weight: 10 },
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
