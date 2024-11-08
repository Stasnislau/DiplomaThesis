export interface TaskData {
  task: string;
  correct_answer: string;
  type: "multiple_choice" | "fill_in_the_blank";
  options?: string[];
}
