import { AUTH_MICROSERVICE_URL } from "../consts";
import { BaseResponse } from "../../types/responses/BaseResponse";
import { getRefreshToken } from "@/utils/getRefreshToken";
import { fetchWithAuth } from "../fetchWithAuth";
export const logout = async () => {
  const refreshToken = getRefreshToken();
  const response = await fetchWithAuth(`${AUTH_MICROSERVICE_URL}/auth/logout`, {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });

  const data = (await response.json()) as BaseResponse<string>;

  if (!data.success) {
    throw new Error((data.payload as unknown as string) || "Failed to logout");
  }

  return data.payload;
};
