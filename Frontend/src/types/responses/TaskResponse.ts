export interface TaskData {
  id: string;
  type: "multiple_choice" | "fill_in_the_blank";
  question: string;
  description?: string;
}

export interface MultipleChoiceTask extends TaskData {
  type: "multiple_choice";
  options: string[];
  correctAnswer: string;
}

export interface FillInTheBlankTask extends TaskData {
  type: "fill_in_the_blank";
  correctAnswer: string;
}
