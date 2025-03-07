import { BaseResponse } from "@/types/responses/BaseResponse";
import {
  FillInTheBlankTask,
  MultipleChoiceTask,
} from "@/types/responses/TaskResponse";
import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";

export interface CreatePlacementTaskRequest {
  language: string;
  previousAnswer?: {
    isCorrect: boolean;
    questionNumber: number;
  };
}

export async function createPlacementTask(
  data: CreatePlacementTaskRequest
): Promise<MultipleChoiceTask | FillInTheBlankTask> {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/placement/task`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error("An error occurred while creating the placement task");
  }

  const responseData = (await response.json()) as BaseResponse<
    MultipleChoiceTask | FillInTheBlankTask
  >;
  return responseData.payload;
}
