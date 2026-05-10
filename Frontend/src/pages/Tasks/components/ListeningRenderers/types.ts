import type { ListeningQuestion } from "@/types/responses/ListeningResponse";

/**
 * Per-question user answer. Shape varies by question type:
 *  - `string` — MC, FIB, dictation, TFNG, sentence completion.
 *  - `Record<statementIndex, speakerLabel>` — multi_speaker_matching.
 */
export type ListeningAnswerValue = string | Record<string, string>;

export interface ListeningRendererProps<
  Q extends ListeningQuestion = ListeningQuestion,
> {
  question: Q;
  answer: ListeningAnswerValue | undefined;
  onChange: (answer: ListeningAnswerValue) => void;
  /** When true, renderer shows right/wrong feedback and disables input. */
  revealed: boolean;
}
