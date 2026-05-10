import type { QuizQuestion } from "@/api/mutations/generateQuiz";
import type { UserAnswerValue } from "./types";

/**
 * Per-type grading. Returns true iff the user's answer is correct
 * for that question type.
 *
 * Notes:
 *  - Comparison is case-insensitive and trim-tolerant for free-text
 *    answers — language learners commonly add a trailing space or
 *    inconsistent capitalisation, and we don't want to reject those.
 *  - For multi-answer types (multi_select_mc, matching, cloze) we
 *    treat order as irrelevant for selections but require every
 *    expected slot to be filled correctly.
 *  - "open" returns null because there's no canonical right answer
 *    on the FE — that question type is a teacher-graded reference.
 *    Renderers handle this by hiding the right/wrong badge and just
 *    showing the reference answer when revealed.
 */
export const gradeQuestion = (
  q: QuizQuestion,
  answer: UserAnswerValue | undefined,
): boolean | null => {
  if (answer === undefined) return false;

  switch (q.type) {
    case "multiple_choice":
      return typeof answer === "string" && norm(answer) === norm(q.correct_answer);

    case "true_false":
      return typeof answer === "string" && norm(answer) === norm(q.correct_answer);

    case "fill_in_the_blank":
    case "gap_fill_grammar":
    case "gap_fill_vocab": {
      if (typeof answer !== "string") return false;
      const expected = Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer];
      return expected.some((e) => norm(e) === norm(answer));
    }

    case "open":
      // No deterministic ground-truth on the FE for free-text answers;
      // the reference answer is shown when revealed but we don't claim
      // correctness either way.
      return null;

    case "multi_select_mc": {
      if (!Array.isArray(answer)) return false;
      const got = new Set(answer.map(norm));
      const expected = new Set(q.correct_answers.map(norm));
      if (got.size !== expected.size) return false;
      for (const e of expected) {
        if (!got.has(e)) return false;
      }
      return true;
    }

    case "matching": {
      if (typeof answer !== "object" || answer === null || Array.isArray(answer)) {
        return false;
      }
      const map = answer as Record<string, string>;
      // Every left side must be matched, and to the canonical right.
      for (const pair of q.pairs) {
        if (norm(map[pair.left] ?? "") !== norm(pair.right)) return false;
      }
      return true;
    }

    case "cloze_passage": {
      if (typeof answer !== "object" || answer === null || Array.isArray(answer)) {
        return false;
      }
      const map = answer as Record<string, string>;
      for (const blank of q.blanks) {
        const got = norm(map[blank.id] ?? "");
        const accepted = Array.isArray(blank.correct_answer)
          ? blank.correct_answer.map(norm)
          : [norm(blank.correct_answer)];
        if (!accepted.includes(got)) return false;
      }
      return true;
    }
  }
};

const norm = (s: string): string => s.trim().toLowerCase();
