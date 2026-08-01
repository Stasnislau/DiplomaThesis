import { AI_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export interface MaterialsErrorExample {
  type?: string;
  text?: string;
  suggestion?: string;
}

export interface LogMaterialsResultRequest {
  language?: string;
  level?: string;
  score: number;
  questionCount: number;
  correctCount: number;
  questionTypes?: string[];
  errorExamples?: MaterialsErrorExample[];
  documentKind?: string;
}

export const logMaterialsResult = async (
  body: LogMaterialsResultRequest,
): Promise<boolean> => {
  const response = await fetchWithAuth(
    `${AI_MICROSERVICE_URL}/materials/result`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return parseApiPayload<boolean>(
    response,
    "Failed to log materials result",
  );
};
