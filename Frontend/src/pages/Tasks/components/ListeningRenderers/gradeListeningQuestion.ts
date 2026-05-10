import type { ListeningQuestion } from "@/types/responses/ListeningResponse";
import type { ListeningAnswerValue } from "./types";

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Per-type grading for a listening question. Returns true / false,
 * or null when there's no canonical right answer the FE can verify
 * (currently never — every listening type has a deterministic
 * correctAnswer; null is reserved for future open-mic types).
 *
 * Comparisons are case-insensitive and trim-tolerant for free-text
 * answers (dictation, sentence_completion). Punctuation differences
 * count for dictation only when they change the recognised tokens —
 * we strip everything except word characters and whitespace before
 * comparing so "Madrid." and "Madrid," both pass.
 */
export const gradeListeningQuestion = (
  q: ListeningQuestion,
  answer: ListeningAnswerValue | undefined,
): boolean | null => {
  if (answer === undefined) return false;

  switch (q.type) {
    case "multiple_choice":
    case "fill_in_the_blank":
      return typeof answer === "string" && norm(answer) === norm(q.correctAnswer);

    case "true_false_not_given":
      return typeof answer === "string" && answer === q.correctAnswer;

    case "dictation": {
      if (typeof answer !== "string") return false;
      // Punctuation-tolerant verbatim check: strip non-word, non-space
      // characters before comparing so a missed period doesn't fail
      // the whole transcription.
      const stripPunct = (s: string) =>
        norm(s).replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
      return stripPunct(answer) === stripPunct(q.correctAnswer);
    }

    case "sentence_completion": {
      if (typeof answer !== "string") return false;
      const expected = Array.isArray(q.correctAnswer)
        ? q.correctAnswer
        : [q.correctAnswer];
      return expected.some((e) => norm(e) === norm(answer));
    }

    case "multi_speaker_matching": {
      if (typeof answer !== "object" || answer === null) return false;
      const map = answer as Record<string, string>;
      // Every statement (by index) must be attributed to its
      // canonical speaker. We index by stringified position because
      // JSX-bound state stores keys as strings anyway.
      for (let i = 0; i < q.statements.length; i++) {
        if (norm(map[String(i)] ?? "") !== norm(q.statements[i].correctSpeaker)) {
          return false;
        }
      }
      return true;
    }
  }
};
