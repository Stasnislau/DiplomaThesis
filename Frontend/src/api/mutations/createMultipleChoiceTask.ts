import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { TaskData } from "@/types/responses/TaskResponse";
import { createTaskRequest } from "./createBlankSpaceTask";
import { BaseResponse } from "@/types/responses/BaseResponse";
import { fetchWithAuth } from "../fetchWithAuth";
export async function createMultipleChoiceTask(
  input: createTaskRequest
): Promise<TaskData> {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/writing/multiplechoice`,
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
