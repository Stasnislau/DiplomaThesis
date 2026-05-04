import { BRIDGE_MICROSERVICE_URL } from "../consts";
import {
  FillInTheBlankTask,
  MultipleChoiceTask,
} from "@/types/responses/TaskResponse";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export interface AdaptiveTaskRequest {
  language: string;
  level: string;
  flavour?: "multiple_choice" | "fill_in_the_blank";
}

export interface AdaptiveTaskResponse {
  task: MultipleChoiceTask | FillInTheBlankTask;
  targetedWeaknesses: string[];
  derivedFromHistory: boolean;
}

/**
 * Ask Bridge for a writing task biased toward the user's recent
 * weaknesses (placement misses, low-score topics, speaking errors).
 * If history is empty Bridge falls back to the regular variety
 * picker — the call is always safe.
 */
export async function generateAdaptiveTask(
  input: AdaptiveTaskRequest,
): Promise<AdaptiveTaskResponse> {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/writing/adaptive`,
    {
      method: "POST",
      body: JSON.stringify({
        language: input.language,
        level: input.level,
        flavour: input.flavour ?? "fill_in_the_blank",
      }),
    },
  );
  return parseApiPayload<AdaptiveTaskResponse>(
    response,
    "Failed to generate adaptive task",
  );
}
