export interface Answer {
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  taskType: string;
  question: string;
  questionNumber: number;
}

export interface PlacementAnswer {
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  questionNumber: number;
} 