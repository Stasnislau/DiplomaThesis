import { AiToken } from "@/types/models/AiToken";
import { USER_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export interface CreateUserAITokenRequest {
  token: string;
  aiProviderId: string;
  isDefault?: boolean;
}

export const createUserAIToken = async (
  input: CreateUserAITokenRequest,
): Promise<AiToken> => {
  const response = await fetchWithAuth(`${USER_MICROSERVICE_URL}/ai-tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseApiPayload<AiToken>(response, "Failed to create AI token");
};
