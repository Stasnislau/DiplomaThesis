import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { ListeningTaskResponse } from "@/types/responses/TaskResponse";
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

  const data = await response.json();

  if (!response.ok || data.success === false) {
    const errorMessage =
      data?.payload?.message ||
      data?.detail ||
      "Failed to create listening task";
    throw new Error(errorMessage);
  }

  if ("payload" in data) {
    return data.payload as ListeningTaskResponse;
  }

  return data as ListeningTaskResponse;
}
