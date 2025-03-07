import { BaseResponse } from "@/types/responses/BaseResponse";
import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
export interface ExplainAnswerRequest {
  language: string;
  level: string;
  task: string;
  correctAnswer: string;
  userAnswer: string;
}

export interface ExplainAnswerResponse {
  is_correct: boolean;
  explanation: string;
  topics_to_review?: string[];
}

export async function explainAnswer(
  data: ExplainAnswerRequest
): Promise<ExplainAnswerResponse> {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/writing/explainanswer`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    console.log(response);
    throw new Error("An error occurred while explaining the answer");
  }

  const responseData =
    (await response.json()) as BaseResponse<ExplainAnswerResponse>;
  console.log(responseData, "explain answer");

  return responseData.payload;
}
