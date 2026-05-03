import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

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

  return parseApiPayload<ExplainAnswerResponse>(
    response,
    "An error occurred while explaining the answer",
  );
}
