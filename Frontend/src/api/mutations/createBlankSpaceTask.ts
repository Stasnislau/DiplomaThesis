import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { TaskData } from "@/types/responses/TaskResponse";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export interface createTaskRequest {
  language: string;
  level: string;
  topic?: string;
  keywords?: string[];
}

export async function createBlankSpaceTask(
  input: createTaskRequest,
): Promise<TaskData> {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/writing/blank`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return parseApiPayload<TaskData>(
    response,
    "An error occurred while creating the task",
  );
}
