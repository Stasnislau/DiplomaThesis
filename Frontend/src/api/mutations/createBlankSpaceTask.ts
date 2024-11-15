import { BaseResponse } from "@/types/responses/BaseResponse";
import { API_URL } from "../consts";
import { TaskData } from "@/types/responses/TaskResponse";

export interface createTaskRequest {
  language: string;
  level: string;
}

export async function createBlankSpaceTask(
  data: createTaskRequest
): Promise<TaskData> {
  const response = await fetch(`${API_URL}/api/bridge/writing/blank`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("An error occurred while creating the task");
  }

  const responseData = (await response.json()) as BaseResponse<TaskData>;
  console.log(responseData, "create task");

  console.log(responseData.payload);

  return responseData.payload;
}
