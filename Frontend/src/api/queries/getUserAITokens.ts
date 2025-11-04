import { AiToken } from "@/types/models/AiToken";
import { fetchWithAuth } from "../fetchWithAuth";
import { USER_MICROSERVICE_URL } from "../consts";
import { BaseResponse } from "@/types/responses/BaseResponse";
export const getUserAITokens = async (): Promise<AiToken[]> => {
  const response = await fetchWithAuth(`${USER_MICROSERVICE_URL}/ai-tokens`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch AI tokens");
  }

  const data = (await response.json()) as BaseResponse<AiToken[]>;
  if (!data.success) {
    throw new Error("Failed to fetch AI tokens");
  }

  return data.payload;
};
