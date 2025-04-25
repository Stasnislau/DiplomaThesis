import { BaseResponse } from "@/types/responses/BaseResponse";
import { TaskData } from "@/types/responses/TaskResponse";
import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";

export interface createTaskRequest {
  language: string;
  level: string;
}

export async function createBlankSpaceTask(
  input: createTaskRequest
): Promise<TaskData> {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/writing/blank`,
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );

  const data = (await response.json()) as BaseResponse<TaskData>;
  if (!data.success) {
    throw new Error("An error occurred while creating the task");
  }

  return data.payload;
}
