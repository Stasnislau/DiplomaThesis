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
  data: EvaluatePlacementTestRequest
): Promise<EvaluationResult> {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/placement/evaluate`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to evaluate placement test");
  }

  const responseData = (await response.json()) as BaseResponse<EvaluationResult>;
  return responseData.payload;
} 