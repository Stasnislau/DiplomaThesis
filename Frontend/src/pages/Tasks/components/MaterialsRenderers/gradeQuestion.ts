import type { QuizQuestion } from "@/api/mutations/generateQuiz";
import type { UserAnswerValue } from "./types";

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
