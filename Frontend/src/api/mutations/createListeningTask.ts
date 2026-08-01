import { AI_MICROSERVICE_URL } from "../consts";
import { ListeningTaskResponse } from "@/types/responses/TaskResponse";
import type { ListeningQuestionType } from "@/types/responses/ListeningResponse";
import { asApiError } from "../extractApiError";
import { fetchWithAuth } from "../fetchWithAuth";

export interface CreateListeningTaskRequest {
  language: string;
  level: string;
  questionTypes?: ListeningQuestionType[];
}

export async function createListeningTask(
  input: CreateListeningTaskRequest,
): Promise<ListeningTaskResponse> {
  const response = await fetchWithAuth(
    `${AI_MICROSERVICE_URL}/tasks/listening/adaptive`,
    {
      method: "POST",
      body: JSON.stringify({
        language: input.language,
        level: input.level,
      }),
    },
  );

  const data = await response.json();

  if (!response.ok || data?.success === false) {
    throw asApiError(data, "Failed to create listening task");
  }

  const payload = data && typeof data === "object" && "payload" in data
    ? data.payload
    : data;

  if (payload && typeof payload === "object" && "task" in payload) {
    return payload.task as ListeningTaskResponse;
  }

  return payload as ListeningTaskResponse;
}
