import { AiToken } from "@/types/models/AiToken";
import { USER_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

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

  return parseApiPayload<AiToken>(response, "Failed to set default AI token");
};
