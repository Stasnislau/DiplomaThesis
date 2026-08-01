import type { ListeningQuestion } from "@/types/responses/ListeningResponse";

export type ListeningAnswerValue = string | Record<string, string>;

export interface ListeningRendererProps<
  Q extends ListeningQuestion = ListeningQuestion,
> {
  question: Q;
  answer: ListeningAnswerValue | undefined;
  onChange: (answer: ListeningAnswerValue) => void;
  revealed: boolean;
}
