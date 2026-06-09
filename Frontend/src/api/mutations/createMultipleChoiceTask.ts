import { AI_MICROSERVICE_URL } from "../consts";
import { TaskData } from "@/types/responses/TaskResponse";
import { createTaskRequest } from "./createBlankSpaceTask";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

interface AdaptiveTaskEnvelope {
  task: TaskData;
  targetedWeaknesses: string[];
  derivedFromHistory: boolean;
}

export async function createMultipleChoiceTask(
  input: createTaskRequest
): Promise<TaskData> {
  const response = await fetchWithAuth(
    `${AI_MICROSERVICE_URL}/writing/adaptive`,
    {
      method: "POST",
      body: JSON.stringify({
        language: input.language,
        level: input.level,
        flavour: "multiple_choice",
      }),
    }
  );

  const envelope = await parseApiPayload<AdaptiveTaskEnvelope>(
    response,
    "An error occurred while creating the task",
  );
  return envelope.task;
}
