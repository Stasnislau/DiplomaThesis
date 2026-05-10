import type { ListeningQuestion } from "./ListeningResponse";

export interface BaseTask {
  id: string;
  type: "multiple_choice" | "fill_in_the_blank";
  question: string;
  description?: string;
  correctAnswer: string | string[];
}

export interface MultipleChoiceTask extends BaseTask {
  type: "multiple_choice";
  options: string[];
}

export interface FillInTheBlankTask extends BaseTask {
  type: "fill_in_the_blank";
  correctAnswer: string[];
}

export type TaskData =
  | MultipleChoiceTask
  | FillInTheBlankTask
  | ListeningTaskResponse;

export interface ListeningTaskResponse {
  type: "listening";
  audioUrl: string;
  transcript: string;
  questions: ListeningQuestion[];
  /** Speaker labels in order of appearance — populated when the
   *  audio was synthesised in multi-voice mode, empty otherwise. */
  speakers?: string[];
}
