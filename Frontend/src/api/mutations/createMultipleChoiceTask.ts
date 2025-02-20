import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { TaskData } from "@/types/responses/TaskResponse";
import { createTaskRequest } from "./createBlankSpaceTask";
import { BaseResponse } from "@/types/responses/BaseResponse";
import { fetchWithAuth } from "../fetchWithAuth";
export async function createMultipleChoiceTask(
  data: createTaskRequest
): Promise<TaskData> {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/writing/multiplechoice`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    console.log(response);
    throw new Error("An error occurred while creating the task");
  }

  const responseData = (await response.json()) as BaseResponse<TaskData>;

  console.log(responseData.payload);

  return responseData.payload;
}
