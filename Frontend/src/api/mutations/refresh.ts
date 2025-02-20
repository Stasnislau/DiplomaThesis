import { AUTH_MICROSERVICE_URL } from "../consts";
import { BaseResponse } from "../../types/responses/BaseResponse";
import Cookies from "js-cookie";
import { getAccessToken } from "../../utils/getAccessToken";
import { getRefreshToken } from "../../utils/getRefreshToken";
import { fetchWithAuth } from "../fetchWithAuth";
interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

export const refresh = async () => {
  const refreshToken = getRefreshToken();

  const response = await fetchWithAuth(
    `${AUTH_MICROSERVICE_URL}/auth/refresh`,
    {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }
  );

  const data = (await response.json()) as BaseResponse<RefreshResponse>;

  if (!data.success) {
    throw new Error((data.payload as unknown as string) || "Failed to refresh");
  }
  if (data.payload.refreshToken) {
    Cookies.set("refreshToken", data.payload.refreshToken);
  }
  if (data.payload.accessToken) {
    localStorage.setItem("accessToken", data.payload.accessToken);
  }
  return data.payload.accessToken;
};
