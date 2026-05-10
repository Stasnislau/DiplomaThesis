import { describe, it, expect } from "vitest";
import { gradeListeningQuestion } from "./gradeListeningQuestion";
import type {
  ListeningMultipleChoiceQuestion,
  ListeningFillInTheBlankQuestion,
  ListeningDictationQuestion,
  ListeningTrueFalseNotGivenQuestion,
  ListeningSentenceCompletionQuestion,
  ListeningMultiSpeakerMatchingQuestion,
} from "@/types/responses/ListeningResponse";

describe("gradeListeningQuestion", () => {
  it("multiple_choice — case-insensitive trim-tolerant", () => {
    const q: ListeningMultipleChoiceQuestion = {
      type: "multiple_choice",
      question: "?",
      options: ["Berlin", "Paris"],
      correctAnswer: "Berlin",
    };
    expect(gradeListeningQuestion(q, "  berlin")).toBe(true);
    expect(gradeListeningQuestion(q, "Paris")).toBe(false);
  });

  it("fill_in_the_blank — case-insensitive", () => {
    const q: ListeningFillInTheBlankQuestion = {
      type: "fill_in_the_blank",
      question: "?",
      correctAnswer: "Tuesday",
    };
    expect(gradeListeningQuestion(q, "tuesday")).toBe(true);
  });

  it("true_false_not_given — exact literal match required", () => {
    const q: ListeningTrueFalseNotGivenQuestion = {
      type: "true_false_not_given",
      question: "?",
      correctAnswer: "not_given",
    };
    expect(gradeListeningQuestion(q, "not_given")).toBe(true);
    expect(gradeListeningQuestion(q, "true")).toBe(false);
  });

  it("dictation — punctuation-tolerant verbatim", () => {
    const q: ListeningDictationQuestion = {
      type: "dictation",
      question: "Type what you heard.",
      correctAnswer: "She left for Madrid on Tuesday morning.",
    };
    expect(
      gradeListeningQuestion(q, "she Left for madrid on tuesday morning"),
    ).toBe(true);
    expect(
      gradeListeningQuestion(q, "she left to Madrid on Tuesday morning"),
    ).toBe(false);
  });

  it("sentence_completion — accepts any of multiple variants", () => {
    const q: ListeningSentenceCompletionQuestion = {
      type: "sentence_completion",
      question: "The speaker mentions ___ as the reason.",
      correctAnswer: ["climate change", "global warming"],
    };
    expect(gradeListeningQuestion(q, "Climate change")).toBe(true);
    expect(gradeListeningQuestion(q, "global warming")).toBe(true);
    expect(gradeListeningQuestion(q, "rain")).toBe(false);
  });

  it("multi_speaker_matching — every statement must match", () => {
    const q: ListeningMultiSpeakerMatchingQuestion = {
      type: "multi_speaker_matching",
      question: "?",
      speakers: ["S1", "S2"],
      statements: [
        { statement: "A", correctSpeaker: "S1" },
        { statement: "B", correctSpeaker: "S2" },
      ],
    };
    expect(gradeListeningQuestion(q, { "0": "S1", "1": "S2" })).toBe(true);
    expect(gradeListeningQuestion(q, { "0": "S2", "1": "S2" })).toBe(false);
    expect(gradeListeningQuestion(q, { "0": "S1" })).toBe(false);
  });

  it("returns false for undefined", () => {
    const q: ListeningMultipleChoiceQuestion = {
      type: "multiple_choice",
      question: "?",
      options: ["A"],
      correctAnswer: "A",
    };
    expect(gradeListeningQuestion(q, undefined)).toBe(false);
  });
});
