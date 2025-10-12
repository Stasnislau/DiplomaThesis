import { BaseResponse } from "@/types/responses/BaseResponse";
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

  const data = (await response.json()) as BaseResponse<ListeningTaskResponse>;
  if (!data.success) {
    throw new Error(
      (data.payload as unknown as Error).message || "Failed to create listening task"
    );
  }

  return data.payload;
}
