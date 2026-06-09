import { AI_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export interface EvaluateEssayRequest {
  language: string;
  level: string;
  topic: string;
  essay: string;
  wordCountTarget: number;
  lessonId?: string;
}

export interface EssayEvaluation {
  score: number;
  passed: boolean;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  wordCount?: number;
  wordCountTarget?: number;
}

export async function evaluateEssay(
  input: EvaluateEssayRequest,
): Promise<EssayEvaluation> {
  const response = await fetchWithAuth(
    `${AI_MICROSERVICE_URL}/writing/essay/evaluate`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return parseApiPayload<EssayEvaluation>(
    response,
    "Failed to evaluate the essay",
  );
}
