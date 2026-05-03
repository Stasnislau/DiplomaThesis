import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { TaskData } from "@/types/responses/TaskResponse";
import { createTaskRequest } from "./createBlankSpaceTask";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

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

  return parseApiPayload<TaskData>(
    response,
    "An error occurred while creating the task",
  );
}
