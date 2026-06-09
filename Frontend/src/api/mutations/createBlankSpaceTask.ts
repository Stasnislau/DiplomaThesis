import { AI_MICROSERVICE_URL } from "../consts";
import { TaskData } from "@/types/responses/TaskResponse";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export interface createTaskRequest {
  language: string;
  level: string;
  topic?: string;
  keywords?: string[];
}

interface AdaptiveTaskEnvelope {
  task: TaskData;
  targetedWeaknesses: string[];
  derivedFromHistory: boolean;
}

export async function createBlankSpaceTask(
  input: createTaskRequest,
): Promise<TaskData> {
  const response = await fetchWithAuth(
    `${AI_MICROSERVICE_URL}/writing/adaptive`,
    {
      method: "POST",
      body: JSON.stringify({
        language: input.language,
        level: input.level,
        flavour: "fill_in_the_blank",
      }),
    },
  );

  const envelope = await parseApiPayload<AdaptiveTaskEnvelope>(
    response,
    "An error occurred while creating the task",
  );
  return envelope.task;
}
