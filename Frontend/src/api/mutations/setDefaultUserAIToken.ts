import { AiToken } from "@/types/models/AiToken";
import { USER_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";

/**
 * Sets a specific AI token as default for the user.
 * This unsets any other default tokens.
 */
export const setDefaultUserAIToken = async (id: string): Promise<AiToken> => {
  const response = await fetchWithAuth(
    `${USER_MICROSERVICE_URL}/ai-tokens/${id}/default`,
    {
      method: "PATCH",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to set default AI token");
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.payload?.message || "Failed to set default token");
  }
  return data.payload;
};
