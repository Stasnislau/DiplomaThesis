export interface TaskData {
  task: string;
  correct_answer: string;
  type: "multiple_choice" | "fill_in_the_blank";
  options?: string[];
}

export interface TaskData {
  id: string;
  type: "multiple_choice" | "fill_in_the_blank";
  question: string;
  description?: string;
  options?: string[];
  correctAnswer: string;
}
