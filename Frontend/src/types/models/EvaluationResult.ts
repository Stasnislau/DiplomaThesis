export interface EvaluationResult {
  level: string;
  confidence: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}
