import { API_URL } from "../consts";
import { TaskData } from "@/types/responses/TaskResponse";
import { createTaskRequest } from "./createBlankSpaceTask";
import { BaseResponse } from "@/types/responses/BaseResponse";

export async function createMultipleChoiceTask(
  data: createTaskRequest
): Promise<TaskData> {
  const response = await fetch(`${API_URL}/api/bridge/writing/multiplechoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    console.log(response);
    throw new Error("An error occurred while creating the task");
  }

  const responseData = (await response.json()) as BaseResponse<TaskData>;

  console.log(responseData.payload);

  return responseData.payload;
}
