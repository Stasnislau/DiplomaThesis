import { DIRECT_BRIDGE_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { ListeningTaskResponse } from "@/types/responses/TaskResponse";

export interface CreateListeningTaskRequest {
  language: string;
  level: string;
}

export async function createListeningTask(
  input: CreateListeningTaskRequest
): Promise<ListeningTaskResponse> {
  const response = await fetchWithAuth(
    `${DIRECT_BRIDGE_MICROSERVICE_URL}/tasks/listening`,
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );

  const data = (await response.json()) as ListeningTaskResponse;
  if (!data) {
    throw new Error("Failed to create listening task");
  }

  return data;
}
