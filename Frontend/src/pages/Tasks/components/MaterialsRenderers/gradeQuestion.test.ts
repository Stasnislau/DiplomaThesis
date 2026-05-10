import { describe, it, expect } from "vitest";
import { gradeQuestion } from "./gradeQuestion";
import type {
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  FillInTheBlankQuestion,
  OpenQuestion,
  MultiSelectMCQuestion,
  MatchingQuestion,
  ClozePassageQuestion,
} from "@/api/mutations/generateQuiz";

describe("gradeQuestion", () => {
  it("multiple_choice — exact match", () => {
    const q: MultipleChoiceQuestion = {
      type: "multiple_choice",
      question: "Q?",
      options: ["A", "B", "C"],
      correct_answer: "B",
    };
    expect(gradeQuestion(q, "B")).toBe(true);
    expect(gradeQuestion(q, "A")).toBe(false);
  });

  it("multiple_choice — case-insensitive trim-tolerant", () => {
    const q: MultipleChoiceQuestion = {
      type: "multiple_choice",
      question: "Q?",
      options: ["Berlin", "Paris"],
      correct_answer: "Berlin",
    };
    expect(gradeQuestion(q, "  berlin ")).toBe(true);
  });

  it("true_false — only literal 'true' or 'false' grade correct", () => {
    const q: TrueFalseQuestion = {
      type: "true_false",
      question: "Sky is blue.",
      correct_answer: "true",
    };
    expect(gradeQuestion(q, "true")).toBe(true);
    expect(gradeQuestion(q, "false")).toBe(false);
  });

  it("fill_in_the_blank — accepts any of multiple variants", () => {
    const q: FillInTheBlankQuestion = {
      type: "fill_in_the_blank",
      question: "She ___ home.",
      options: [],
      correct_answer: ["went", "left for"],
    };
    expect(gradeQuestion(q, "went")).toBe(true);
    expect(gradeQuestion(q, "Left For")).toBe(true);
    expect(gradeQuestion(q, "go")).toBe(false);
  });

  it("open — returns null (no FE-side ground truth)", () => {
    const q: OpenQuestion = {
      type: "open",
      question: "Why?",
      options: [],
      correct_answer: "Because of climate.",
    };
    expect(gradeQuestion(q, "anything goes")).toBe(null);
  });

  it("multi_select_mc — set equality required", () => {
    const q: MultiSelectMCQuestion = {
      type: "multi_select_mc",
      question: "Pick all true.",
      options: ["A", "B", "C", "D"],
      correct_answers: ["A", "C"],
    };
    expect(gradeQuestion(q, ["A", "C"])).toBe(true);
    expect(gradeQuestion(q, ["C", "A"])).toBe(true); // order doesn't matter
    expect(gradeQuestion(q, ["A"])).toBe(false); // missing one
    expect(gradeQuestion(q, ["A", "C", "D"])).toBe(false); // extra wrong
  });

  it("matching — every left must map to its canonical right", () => {
    const q: MatchingQuestion = {
      type: "matching",
      question: "Match.",
      pairs: [
        { left: "ephemeral", right: "short-lived" },
        { left: "perennial", right: "lasting" },
      ],
    };
    expect(
      gradeQuestion(q, {
        ephemeral: "short-lived",
        perennial: "lasting",
      }),
    ).toBe(true);
    expect(
      gradeQuestion(q, {
        ephemeral: "short-lived",
        perennial: "short-lived", // wrong pairing
      }),
    ).toBe(false);
    expect(gradeQuestion(q, { ephemeral: "short-lived" })).toBe(false); // missing
  });

  it("cloze_passage — every blank must hit accepted answer", () => {
    const q: ClozePassageQuestion = {
      type: "cloze_passage",
      question: "Fill blanks.",
      passage_with_blanks: "Birds fly {{1}} for {{2}}.",
      blanks: [
        { id: "1", correct_answer: "south" },
        { id: "2", correct_answer: ["winter", "the cold"] },
      ],
    };
    expect(gradeQuestion(q, { "1": "south", "2": "winter" })).toBe(true);
    expect(gradeQuestion(q, { "1": "south", "2": "the cold" })).toBe(true);
    expect(gradeQuestion(q, { "1": "north", "2": "winter" })).toBe(false);
    expect(gradeQuestion(q, { "1": "south" })).toBe(false); // missing blank
  });

  it("undefined answer always grades false", () => {
    const q: MultipleChoiceQuestion = {
      type: "multiple_choice",
      question: "Q?",
      options: ["A"],
      correct_answer: "A",
    };
    expect(gradeQuestion(q, undefined)).toBe(false);
  });
});
