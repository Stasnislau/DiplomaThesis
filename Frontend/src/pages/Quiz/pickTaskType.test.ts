import { describe, it, expect } from "vitest";
import {
  isEssayAllowedForLevel,
  pickQuizTaskType,
  pickQuizVariant,
  type QuizTaskType,
  type QuizVariant,
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

describe("pickQuizVariant", () => {
  const makeRng = (seed: number) => () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const collect = (level: string, n: number, seed = 1) => {
    const rng = makeRng(seed);
    const out: QuizVariant[] = [];
    for (let i = 0; i < n; i++) out.push(pickQuizVariant(level, rng));
    return out;
  };

  it("returns one of three category kinds", () => {
    const kinds = new Set(collect("B2", 3000).map((v) => v.kind));
    expect(kinds.has("writing")).toBe(true);
    expect(kinds.has("listening")).toBe(true);
    expect(kinds.has("speaking")).toBe(true);
    // Nothing else.
    for (const k of kinds) {
      expect(["writing", "listening", "speaking"]).toContain(k);
    }
  });

  it("speaking below B1 is restricted to read_aloud + repeat_after_me", () => {
    const speakingFormats = new Set(
      collect("A1", 4000, 17)
        .filter((v): v is Extract<QuizVariant, { kind: "speaking" }> =>
          v.kind === "speaking",
        )
        .map((v) => v.format),
    );
    // Forbidden below B1.
    expect(speakingFormats.has("free_monologue")).toBe(false);
    expect(speakingFormats.has("picture_description")).toBe(false);
    expect(speakingFormats.has("timed_response")).toBe(false);
    // Allowed below B1.
    expect(speakingFormats.has("read_aloud")).toBe(true);
    expect(speakingFormats.has("repeat_after_me")).toBe(true);
  });

  it("listening below B1 is restricted to MC + FIB + dictation", () => {
    const listeningTypes = new Set(
      collect("A2", 4000, 23)
        .filter((v): v is Extract<QuizVariant, { kind: "listening" }> =>
          v.kind === "listening",
        )
        .map((v) => v.questionType),
    );
    // Forbidden below B1.
    expect(listeningTypes.has("true_false_not_given")).toBe(false);
    expect(listeningTypes.has("sentence_completion")).toBe(false);
    expect(listeningTypes.has("multi_speaker_matching")).toBe(false);
    // Allowed below B1.
    expect(listeningTypes.has("multiple_choice")).toBe(true);
    expect(listeningTypes.has("fill_in_the_blank")).toBe(true);
    expect(listeningTypes.has("dictation")).toBe(true);
  });

  it("writing essay never appears below B1 in any rolled variant", () => {
    const writingTypes = collect("A1", 5000, 99)
      .filter((v): v is Extract<QuizVariant, { kind: "writing" }> =>
        v.kind === "writing",
      )
      .map((v) => v.type);
    for (const t of writingTypes) expect(t).not.toBe("essay");
  });

  it("at B2 every modality and every sub-type surfaces", () => {
    const variants = collect("B2", 8000, 3);

    const writingTypes = new Set(
      variants
        .filter((v) => v.kind === "writing")
        .map((v) => (v as Extract<QuizVariant, { kind: "writing" }>).type),
    );
    for (const t of [
      "multiple_choice",
      "fill_in_the_blank",
      "true_false",
      "multi_select_mc",
      "matching",
      "cloze_passage",
      "open",
      "essay",
    ] as const) {
      expect(writingTypes.has(t)).toBe(true);
    }

    const listeningTypes = new Set(
      variants
        .filter((v) => v.kind === "listening")
        .map(
          (v) =>
            (v as Extract<QuizVariant, { kind: "listening" }>).questionType,
        ),
    );
    for (const t of [
      "multiple_choice",
      "fill_in_the_blank",
      "dictation",
      "true_false_not_given",
      "sentence_completion",
      "multi_speaker_matching",
    ] as const) {
      expect(listeningTypes.has(t)).toBe(true);
    }

    const speakingFormats = new Set(
      variants
        .filter((v) => v.kind === "speaking")
        .map(
          (v) => (v as Extract<QuizVariant, { kind: "speaking" }>).format,
        ),
    );
    for (const t of [
      "read_aloud",
      "repeat_after_me",
      "timed_response",
      "picture_description",
      "free_monologue",
    ] as const) {
      expect(speakingFormats.has(t)).toBe(true);
    }
  });

  it("category split roughly matches 50/25/25 at B2 (±5pp)", () => {
    const variants = collect("B2", 8000, 5);
    const counts = { writing: 0, listening: 0, speaking: 0 };
    for (const v of variants) counts[v.kind]++;
    const pct = (n: number) => (n / variants.length) * 100;
    expect(pct(counts.writing)).toBeGreaterThan(45);
    expect(pct(counts.writing)).toBeLessThan(55);
    expect(pct(counts.listening)).toBeGreaterThan(20);
    expect(pct(counts.listening)).toBeLessThan(30);
    expect(pct(counts.speaking)).toBeGreaterThan(20);
    expect(pct(counts.speaking)).toBeLessThan(30);
  });
});
