import { describe, it, expect } from "vitest";
import {
  isEssayAllowedForLevel,
  pickQuizTaskType,
  type QuizTaskType,
} from "./pickTaskType";

describe("isEssayAllowedForLevel", () => {
  it("returns false for sub-B1 levels", () => {
    expect(isEssayAllowedForLevel("A1")).toBe(false);
    expect(isEssayAllowedForLevel("A2")).toBe(false);
  });

  it("returns true from B1 upwards", () => {
    expect(isEssayAllowedForLevel("B1")).toBe(true);
    expect(isEssayAllowedForLevel("B2")).toBe(true);
    expect(isEssayAllowedForLevel("C1")).toBe(true);
    expect(isEssayAllowedForLevel("C2")).toBe(true);
  });

  it("is case-insensitive and tolerates empty input", () => {
    expect(isEssayAllowedForLevel("b2")).toBe(true);
    expect(isEssayAllowedForLevel("")).toBe(false);
  });
});

describe("pickQuizTaskType", () => {
  // Make a deterministic LCG so the Monte Carlo runs are
  // reproducible and don't hammer Math.random ordering.
  const makeRng = (seed: number) => () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  it("never returns essay below B1, even at every RNG point in [0, 1)", () => {
    for (let i = 0; i < 1000; i++) {
      const r = i / 1000;
      const t = pickQuizTaskType("A1", () => r);
      expect(t).not.toBe("essay");
    }
  });

  it("never returns B1+-only types below B1", () => {
    // matching, multi_select_mc, cloze_passage, open are also gated.
    const forbidden: QuizTaskType[] = [
      "essay",
      "multi_select_mc",
      "matching",
      "cloze_passage",
      "open",
    ];
    const seen = new Set<QuizTaskType>();
    const rng = makeRng(99);
    for (let i = 0; i < 5000; i++) {
      seen.add(pickQuizTaskType("A2", rng));
    }
    for (const f of forbidden) {
      expect(seen.has(f)).toBe(false);
    }
    // A1/A2 catalog is MC + FIB + true_false.
    expect(seen.has("multiple_choice")).toBe(true);
    expect(seen.has("fill_in_the_blank")).toBe(true);
    expect(seen.has("true_false")).toBe(true);
  });

  it("hits all 8 variants at B2 across many rolls", () => {
    const seen = new Set<QuizTaskType>();
    const rng = makeRng(12345);
    for (let i = 0; i < 5000; i++) {
      seen.add(pickQuizTaskType("B2", rng));
    }
    const expected: QuizTaskType[] = [
      "multiple_choice",
      "fill_in_the_blank",
      "true_false",
      "multi_select_mc",
      "matching",
      "cloze_passage",
      "open",
      "essay",
    ];
    for (const t of expected) {
      expect(seen.has(t)).toBe(true);
    }
  });

  it("essay stays rare on B2 (~5%, ±2pp tolerance)", () => {
    let count = 0;
    const rng = makeRng(7);
    const N = 8000;
    for (let i = 0; i < N; i++) {
      if (pickQuizTaskType("B2", rng) === "essay") count++;
    }
    const pct = (count / N) * 100;
    expect(pct).toBeGreaterThan(3);
    expect(pct).toBeLessThan(7);
  });

  it("MC + FIB are still the most common B1+ picks combined", () => {
    let mcOrFib = 0;
    const rng = makeRng(42);
    const N = 5000;
    for (let i = 0; i < N; i++) {
      const t = pickQuizTaskType("B1", rng);
      if (t === "multiple_choice" || t === "fill_in_the_blank") mcOrFib++;
    }
    // 22 + 22 = 44 → ~44%. Allow ±5pp.
    const pct = (mcOrFib / N) * 100;
    expect(pct).toBeGreaterThan(38);
    expect(pct).toBeLessThan(50);
  });
});
