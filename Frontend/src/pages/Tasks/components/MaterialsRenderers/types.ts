import type { QuizQuestion } from "@/api/mutations/generateQuiz";

/**
 * Catch-all answer shape stored per question in MaterialsTask state.
 *
 * - `string` — MC, open, T/F, fill-in-the-blank single answer.
 * - `string[]` — multi_select_mc, FIB with multiple accepted variants
 *               (we still only store the user's typed/selected list).
 * - `Record<string, string>` — matching (left → user-picked right) and
 *               cloze_passage (blank id → user-entered text).
 */
export type UserAnswerValue =
  | string
  | string[]
  | Record<string, string>;

export interface QuestionRendererProps<Q extends QuizQuestion = QuizQuestion> {
  question: Q;
  /** Undefined until the user interacts with the question. */
  answer: UserAnswerValue | undefined;
  onChange: (answer: UserAnswerValue) => void;
  /** When true, the renderer paints right/wrong feedback and disables input. */
  revealed: boolean;
}
