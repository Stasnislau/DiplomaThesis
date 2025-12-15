export interface TaskTemplate {
  id: string;
  template: string;
  task_type?: string;
  answer_type?: string;
  example?: string;
  source?: string;
  chunk_index?: number | null;
}

