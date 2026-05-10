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
    `${BRIDGE_MICROSERVICE_URL}/tasks/listening`,
    {
      method: "POST",
      // Wire shape uses snake_case `question_types`; the request DTO
      // on the backend has alias_generator=to_camel + populate_by_name,
      // so either form is accepted, but snake_case keeps the wire
      // self-documenting.
      body: JSON.stringify({
        language: input.language,
        level: input.level,
        question_types: input.questionTypes,
      }),
    },
  );

  // The listening endpoint historically returned either a wrapped
  // BaseResponse or the raw task object on success. Keep the
  // dual-shape handling but funnel failures through asApiError so
  // a structured `code` survives all the way to the UI.
  const data = await response.json();

  if (!response.ok || data?.success === false) {
    throw asApiError(data, "Failed to create listening task");
  }

  if (data && typeof data === "object" && "payload" in data) {
    return data.payload as ListeningTaskResponse;
  }

  return data as ListeningTaskResponse;
}
