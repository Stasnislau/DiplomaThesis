import { fetchWithAuth } from "../fetchWithAuth";
import { USER_MICROSERVICE_URL } from "../consts";
import { BaseResponse } from "@/types/responses/BaseResponse";

export const deleteUserAIToken = async (tokenId: string): Promise<void> => {
  const response = await fetchWithAuth(
    `${USER_MICROSERVICE_URL}/ai-tokens/${tokenId}`,
    {
      method: "DELETE",
    }
  );

  const data = (await response.json()) as BaseResponse<void>;
  if (!data.success) {
    throw new Error("Failed to delete AI token");
  }

  return data.payload;
};
