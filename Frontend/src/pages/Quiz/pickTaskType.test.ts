import { describe, it, expect } from "vitest";
import {
  isEssayAllowedForLevel,
  pickQuizTaskType,
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
  it("never returns essay below B1, even at the extreme RNG edges", () => {
    // Walk the full [0,1) RNG range — essay weight 0 below B1
    // means the picker MUST never select it regardless of where
    // the random point lands.
    for (let i = 0; i < 1000; i++) {
      const r = i / 1000;
      const t = pickQuizTaskType("A1", () => r);
      expect(t).not.toBe("essay");
    }
  });

  it("can return essay at B1+ but only inside its weight bucket", () => {
    // B1+ weights are MC=45, FIB=45, essay=10 → total 100.
    // Cumulative: rng [0, 0.45) → MC, [0.45, 0.90) → FIB,
    // [0.90, 1.0) → essay. Probe each bucket.
    expect(pickQuizTaskType("B1", () => 0.0)).toBe("multiple_choice");
    expect(pickQuizTaskType("B1", () => 0.44)).toBe("multiple_choice");
    expect(pickQuizTaskType("B1", () => 0.5)).toBe("fill_in_the_blank");
    expect(pickQuizTaskType("B1", () => 0.89)).toBe("fill_in_the_blank");
    expect(pickQuizTaskType("B1", () => 0.91)).toBe("essay");
    expect(pickQuizTaskType("B1", () => 0.999)).toBe("essay");
  });

  it("hits essay for ~10% of B2 picks across many rolls", () => {
    // Use a deterministic LCG so the test is reproducible without
    // depending on Math.random ordering.
    let seed = 12345;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const counts = { multiple_choice: 0, fill_in_the_blank: 0, essay: 0 };
    for (let i = 0; i < 5000; i++) {
      counts[pickQuizTaskType("B2", rng)]++;
    }
    // Essay should be ~10% — allow ±3pp wobble for sample noise.
    const essayPct = (counts.essay / 5000) * 100;
    expect(essayPct).toBeGreaterThan(7);
    expect(essayPct).toBeLessThan(13);
  });

  it("splits A1 picks roughly 50/50 between MC and FIB", () => {
    let seed = 42;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const counts = { multiple_choice: 0, fill_in_the_blank: 0, essay: 0 };
    for (let i = 0; i < 5000; i++) {
      counts[pickQuizTaskType("A1", rng)]++;
    }
    expect(counts.essay).toBe(0);
    const mcPct = (counts.multiple_choice / 5000) * 100;
    expect(mcPct).toBeGreaterThan(45);
    expect(mcPct).toBeLessThan(55);
  });
});
