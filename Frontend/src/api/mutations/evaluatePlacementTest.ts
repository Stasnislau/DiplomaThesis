import { BaseResponse } from "@/types/responses/BaseResponse";
import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";

export interface EvaluationResult {
  level: string;
  confidence: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

export interface EvaluatePlacementTestRequest {
  answers: any[];
  language: string;
}

export async function evaluatePlacementTest(
  input: EvaluatePlacementTestRequest
): Promise<EvaluationResult> {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/placement/evaluate`,
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );

  const data = (await response.json()) as BaseResponse<EvaluationResult>;
  if (!data.success) {
    throw new Error("Failed to evaluate placement test");
  }

  return data.payload;
}
