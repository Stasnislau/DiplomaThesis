export interface EvaluationResult {
  level: string;
  confidence: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

export interface PlacementAnswer {
  isCorrect: boolean;
  questionNumber: number;
  userAnswer: string;
}
