import { BaseResponse } from "@/types/responses/BaseResponse";
import { TaskData } from "@/types/responses/TaskResponse";
import { BRIDGE_MICROSERVICE_URL } from "../consts";

export interface createTaskRequest {
  language: string;
  level: string;
}

export async function createBlankSpaceTask(
  data: createTaskRequest
): Promise<TaskData> {
  const response = await fetch(`${BRIDGE_MICROSERVICE_URL}/writing/blank`, {
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
