/**
 * Listening question variants — mirrors the discriminated union in
 * Backend/BridgeMicroservice/models/responses/listening_task_response.py.
 * Wire field names stay camelCase to match the existing
 * `correctAnswer` convention from the original two listening types.
 */

interface ListeningQuestionBase {
  question: string;
}

export interface ListeningMultipleChoiceQuestion extends ListeningQuestionBase {
  type: "multiple_choice";
  options: string[];
  correctAnswer: string;
}

export interface ListeningFillInTheBlankQuestion extends ListeningQuestionBase {
  type: "fill_in_the_blank";
  correctAnswer: string;
}

export interface ListeningDictationQuestion extends ListeningQuestionBase {
  type: "dictation";
  correctAnswer: string;
}

export interface ListeningTrueFalseNotGivenQuestion
  extends ListeningQuestionBase {
  type: "true_false_not_given";
  correctAnswer: "true" | "false" | "not_given";
}

export interface ListeningSentenceCompletionQuestion
  extends ListeningQuestionBase {
  type: "sentence_completion";
  correctAnswer: string | string[];
}

export interface ListeningSpeakerStatement {
  statement: string;
  correctSpeaker: string;
}

export interface ListeningMultiSpeakerMatchingQuestion
  extends ListeningQuestionBase {
  type: "multi_speaker_matching";
  speakers: string[];
  statements: ListeningSpeakerStatement[];
}

export type ListeningQuestion =
  | ListeningMultipleChoiceQuestion
  | ListeningFillInTheBlankQuestion
  | ListeningDictationQuestion
  | ListeningTrueFalseNotGivenQuestion
  | ListeningSentenceCompletionQuestion
  | ListeningMultiSpeakerMatchingQuestion;

/** Canonical question-type tokens accepted by the backend. */
export const LISTENING_QUESTION_TYPES = [
  "multiple_choice",
  "fill_in_the_blank",
  "dictation",
  "true_false_not_given",
  "sentence_completion",
  "multi_speaker_matching",
] as const;

export type ListeningQuestionType = (typeof LISTENING_QUESTION_TYPES)[number];
