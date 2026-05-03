import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { ListeningTaskResponse } from "@/types/responses/TaskResponse";
import { asApiError } from "../extractApiError";
import { fetchWithAuth } from "../fetchWithAuth";

export interface CreateListeningTaskRequest {
  language: string;
  level: string;
}

export async function createListeningTask(
  input: CreateListeningTaskRequest,
): Promise<ListeningTaskResponse> {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/tasks/listening`,
    {
      method: "POST",
      body: JSON.stringify(input),
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
