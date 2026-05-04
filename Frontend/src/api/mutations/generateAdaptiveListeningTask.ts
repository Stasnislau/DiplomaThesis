import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { ListeningTaskResponse } from "@/types/responses/TaskResponse";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export interface AdaptiveListeningRequest {
  language: string;
  level: string;
}

export interface AdaptiveListeningResponse {
  task: ListeningTaskResponse;
  targetedWeaknesses: string[];
  derivedFromHistory: boolean;
}

/**
 * Listening passage biased toward the user's recent weaknesses
 * (placement misses, speaking error categories). Falls back to the
 * regular variety picker when there's no signal.
 */
export async function generateAdaptiveListeningTask(
  input: AdaptiveListeningRequest,
): Promise<AdaptiveListeningResponse> {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/tasks/listening/adaptive`,
    {
      method: "POST",
      body: JSON.stringify({
        language: input.language,
        level: input.level,
      }),
    },
  );
  return parseApiPayload<AdaptiveListeningResponse>(
    response,
    "Failed to generate adaptive listening task",
  );
}
