import { AiToken } from "@/types/models/AiToken";
import { USER_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";

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

  if (!response.ok) {
    throw new Error("Failed to create AI token");
  }

  const data = await response.json();
  return data.payload;
};
