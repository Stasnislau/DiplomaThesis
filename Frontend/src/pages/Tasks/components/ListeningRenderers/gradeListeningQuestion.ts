import type { ListeningQuestion } from "@/types/responses/ListeningResponse";
import type { ListeningAnswerValue } from "./types";

const norm = (s: string) => s.trim().toLowerCase();

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
      for (let i = 0; i < q.statements.length; i++) {
        if (norm(map[String(i)] ?? "") !== norm(q.statements[i].correctSpeaker)) {
          return false;
        }
      }
      return true;
    }
  }
};
