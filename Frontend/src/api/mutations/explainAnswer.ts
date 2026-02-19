import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { BaseResponse } from "@/types/responses/BaseResponse";
import { fetchWithAuth } from "../fetchWithAuth";

export interface ExplainAnswerRequest {
  language: string;
  level: string;
  task: string;
  correctAnswer: string;
  userAnswer: string;
}

/**
 * Response from the explain answer endpoint.
 * Note: Backend uses camelCase via alias_generator.
 */
export interface ExplainAnswerResponse {
  isCorrect: boolean;
  explanation: string;
  topicsToReview?: string[];
}

export async function explainAnswer(
  data: ExplainAnswerRequest,
): Promise<ExplainAnswerResponse> {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/writing/explainanswer`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    throw new Error("An error occurred while explaining the answer");
  }

  const responseData =
    (await response.json()) as BaseResponse<ExplainAnswerResponse>;

  if (!responseData.success) {
    const errorMessage =
      responseData.errors?.join(", ") || "Failed to explain answer";
    throw new Error(errorMessage);
  }

  return responseData.payload;
}
