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
}

export type TaskData = MultipleChoiceTask | FillInTheBlankTask | ListeningTaskResponse;

export interface ListeningTaskResponse {
  type: "listening";
  audioUrl: string;
  transcript: string;
  questions: (MultipleChoiceTask | FillInTheBlankTask)[];
}
