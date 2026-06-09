import { AI_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export interface GenerateEssayRequest {
  language: string;
  level: string;
  topic?: string;
  keywords?: string[];
}

export interface EssayTask {
  id: string;
  type: "essay";
  topic: string;
  instructions: string[];
  rubricHints: string[];
  wordCountTarget: number;
}

export async function generateEssayTask(
  input: GenerateEssayRequest,
): Promise<EssayTask> {
  const response = await fetchWithAuth(
    `${AI_MICROSERVICE_URL}/writing/essay/generate`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return parseApiPayload<EssayTask>(
    response,
    "Failed to generate the essay prompt",
  );
}
