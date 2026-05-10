import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { ListeningTaskResponse } from "@/types/responses/TaskResponse";
import type { ListeningQuestionType } from "@/types/responses/ListeningResponse";
import { asApiError } from "../extractApiError";
import { fetchWithAuth } from "../fetchWithAuth";

export interface CreateListeningTaskRequest {
  language: string;
  level: string;
  /**
   * Subset of canonical question types the user wants in this set.
   * Omit / leave empty to get the historic default mix
   * (multiple_choice + fill_in_the_blank).
   */
  questionTypes?: ListeningQuestionType[];
}

export async function createListeningTask(
  input: CreateListeningTaskRequest,
): Promise<ListeningTaskResponse> {
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

  // The adaptive listening endpoint returns a BaseResponse-wrapped
  // envelope: { task: ListeningTaskResponse, targetedWeaknesses, derivedFromHistory }.
  // Unwrap through the standard payload path, then extract .task.
  const data = await response.json();

  if (!response.ok || data?.success === false) {
    throw asApiError(data, "Failed to create listening task");
  }

  // BaseResponse envelope: { success, payload: { task, ... } }
  const payload = data && typeof data === "object" && "payload" in data
    ? data.payload
    : data;

  // Adaptive envelope: { task, targetedWeaknesses, derivedFromHistory }
  if (payload && typeof payload === "object" && "task" in payload) {
    return payload.task as ListeningTaskResponse;
  }

  return payload as ListeningTaskResponse;
}
