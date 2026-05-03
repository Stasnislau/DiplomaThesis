import { fetchWithAuth } from "../fetchWithAuth";
import { USER_MICROSERVICE_URL } from "../consts";
import { parseApiResponse } from "../parseApiResponse";

export const deleteUserAIToken = async (tokenId: string): Promise<void> => {
  const response = await fetchWithAuth(
    `${USER_MICROSERVICE_URL}/ai-tokens/${tokenId}`,
    {
      method: "DELETE",
    }
  );

  await parseApiResponse(response, "Failed to delete AI token");
};
