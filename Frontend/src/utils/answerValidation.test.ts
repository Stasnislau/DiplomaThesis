import { describe, it, expect } from "vitest";
import { isAnswerCorrect } from "./answerValidation";

describe("isAnswerCorrect", () => {
  // ── Exact match (tolerance = 0) ──────────────────────────────────────────
  describe("exact match (default tolerance=0)", () => {
    it("returns true for identical strings", () => {
      expect(isAnswerCorrect("hello", "hello")).toBe(true);
    });

    it("is case-insensitive by default", () => {
      expect(isAnswerCorrect("Hello", "hello")).toBe(true);
      expect(isAnswerCorrect("HELLO", "hello")).toBe(true);
    });

    it("trims whitespace by default", () => {
      expect(isAnswerCorrect("  hello  ", "hello")).toBe(true);
      expect(isAnswerCorrect("hello", "  hello  ")).toBe(true);
    });

    it("rejects different strings with tolerance=0", () => {
      expect(isAnswerCorrect("helo", "hello")).toBe(false);
    });

    it("respects case-sensitive mode", () => {
      expect(isAnswerCorrect("Hello", "hello", { ignoreCase: false })).toBe(
        false,
      );
    });

    it("respects trim=false", () => {
      expect(isAnswerCorrect("  hello", "hello", { trim: false })).toBe(false);
    });
  });

  // ── Fuzzy match (tolerance > 0) ──────────────────────────────────────────
  describe("fuzzy match (tolerance > 0)", () => {
    it("accepts 1-char typo with tolerance=1", () => {
      // "helo" → "hello" = distance 1
      expect(isAnswerCorrect("helo", "hello", { tolerance: 1 })).toBe(true);
    });

    it("accepts 2-char typo with tolerance=2", () => {
      // "hllo" → "hello" = distance 1, ok
      expect(isAnswerCorrect("hllo", "hello", { tolerance: 2 })).toBe(true);
      // "belo" → "hello" = distance 2 (b→h, missing l), ok
      expect(isAnswerCorrect("hlo", "hello", { tolerance: 2 })).toBe(true);
    });

    it("rejects when distance exceeds tolerance", () => {
      // "xyz" → "hello" = distance 5
      expect(isAnswerCorrect("xyz", "hello", { tolerance: 2 })).toBe(false);
    });

    it("works with tolerance=0 as exact match", () => {
      expect(isAnswerCorrect("helo", "hello", { tolerance: 0 })).toBe(false);
    });
  });

  // ── Array of correct answers (synonyms) ──────────────────────────────────
  describe("multiple correct answers (synonyms)", () => {
    const synonyms = ["book", "novel", "tome"];

    it("accepts any synonym with exact match", () => {
      expect(isAnswerCorrect("book", synonyms)).toBe(true);
      expect(isAnswerCorrect("novel", synonyms)).toBe(true);
      expect(isAnswerCorrect("tome", synonyms)).toBe(true);
    });

    it("rejects non-matching string", () => {
      expect(isAnswerCorrect("car", synonyms)).toBe(false);
    });

    it("accepts fuzzy match on any synonym", () => {
      // "bok" → "book" = distance 1
      expect(isAnswerCorrect("bok", synonyms, { tolerance: 1 })).toBe(true);
      // "novl" → "novel" = distance 1
      expect(isAnswerCorrect("novl", synonyms, { tolerance: 1 })).toBe(true);
    });

    it("rejects if no synonym is close enough", () => {
      expect(isAnswerCorrect("airplane", synonyms, { tolerance: 2 })).toBe(
        false,
      );
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────────
  describe("edge cases", () => {
    it("handles empty user answer", () => {
      expect(isAnswerCorrect("", "hello")).toBe(false);
    });

    it("handles empty correct answer", () => {
      expect(isAnswerCorrect("hello", "")).toBe(false);
    });

    it("handles empty array of correct answers", () => {
      expect(isAnswerCorrect("hello", [])).toBe(false);
    });

    it("handles single-element array same as string", () => {
      expect(isAnswerCorrect("hello", ["hello"])).toBe(true);
    });

    it("handles unicode characters", () => {
      expect(isAnswerCorrect("привет", "привет")).toBe(true);
      expect(isAnswerCorrect("Привет", "привет")).toBe(true);
    });

    it("handles special characters", () => {
      expect(isAnswerCorrect("it's", "it's")).toBe(true);
      expect(isAnswerCorrect("it's", ["it's", "it is"])).toBe(true);
    });
  });
});
