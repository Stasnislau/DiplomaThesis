import { AiToken } from "@/types/models/AiToken";
import { fetchWithAuth } from "../fetchWithAuth";
import { USER_MICROSERVICE_URL } from "../consts";
import { parseApiPayload } from "../parseApiResponse";

export const getUserAITokens = async (): Promise<AiToken[]> => {
  const response = await fetchWithAuth(`${USER_MICROSERVICE_URL}/ai-tokens`, {
    method: "GET",
  });

  return parseApiPayload<AiToken[]>(response, "Failed to fetch AI tokens");
};
