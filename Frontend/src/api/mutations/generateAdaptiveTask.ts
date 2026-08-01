import { AI_MICROSERVICE_URL } from "../consts";
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

export async function generateAdaptiveTask(
  input: AdaptiveTaskRequest,
): Promise<AdaptiveTaskResponse> {
  const response = await fetchWithAuth(
    `${AI_MICROSERVICE_URL}/writing/adaptive`,
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
