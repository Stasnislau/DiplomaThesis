import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { ListeningTaskResponse } from "@/types/responses/TaskResponse";
import { BaseResponse } from "@/types/responses/BaseResponse";

export interface CreateListeningTaskRequest {
  language: string;
  level: string;
}

export async function createListeningTask(
  input: CreateListeningTaskRequest
): Promise<ListeningTaskResponse> {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/tasks/listening`,
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );

  const data = await response.json();

  if (!response.ok || (data.success === false)) {
    const errorMessage = data?.payload?.message || data?.detail || "Failed to create listening task";
    throw new Error(errorMessage);
  }

  // If the backend wrapper is BaseResponse, we return payload.
  // If the backend returns raw ListeningTaskResponse (Bridge usually did this historically), we check.
  // Bridge historically returned raw JSON. But my recent material controller uses wrapper.
  // Listening controller might still return raw JSON or wrapper.
  // Let's assume raw for now if it doesn't have 'payload' property, or payload if it does.
  
  if ('payload' in data) {
      return data.payload as ListeningTaskResponse;
  }

  return data as ListeningTaskResponse;
}
