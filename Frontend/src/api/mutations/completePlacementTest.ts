import { BaseResponse } from "../../types/responses/BaseResponse";
import { USER_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";

export interface CompletePlacementTestRequest {
  languageId: string;
  level: string;
  score: number;
  feedback: any;
}

export const completePlacementTest = async (
  input: CompletePlacementTestRequest,
): Promise<boolean> => {
  const response = await fetchWithAuth(
    `${USER_MICROSERVICE_URL}/placement-test/complete`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  const data = (await response.json()) as BaseResponse<any>;

  if (!data.success) {
    throw new Error(
      data.errors?.join(", ") || "Failed to complete placement test",
    );
  }

  return true;
};
