import { AI_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export interface ListeningErrorExample {
  type?: string;
  text?: string;
  suggestion?: string;
}

export interface LogListeningResultRequest {
  language: string;
  level: string;
  score: number;
  questionCount: number;
  correctCount: number;
  questionTypes?: string[];
  errorExamples?: ListeningErrorExample[];
  targetedWeaknesses?: string[];
}

export const logListeningResult = async (
  body: LogListeningResultRequest,
): Promise<boolean> => {
  const response = await fetchWithAuth(
    `${AI_MICROSERVICE_URL}/tasks/listening/result`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return parseApiPayload<boolean>(
    response,
    "Failed to log listening result",
  );
};
