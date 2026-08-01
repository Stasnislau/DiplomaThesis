import type { QuizQuestion } from "@/api/mutations/generateQuiz";

export type UserAnswerValue =
  | string
  | string[]
  | Record<string, string>;

export interface QuestionRendererProps<Q extends QuizQuestion = QuizQuestion> {
  question: Q;
  answer: UserAnswerValue | undefined;
  onChange: (answer: UserAnswerValue) => void;
  revealed: boolean;
}
