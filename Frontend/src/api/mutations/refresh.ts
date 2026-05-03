import { AUTH_MICROSERVICE_URL } from "../consts";
import Cookies from "js-cookie";
import { getRefreshToken } from "../../utils/getRefreshToken";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

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

  const payload = await parseApiPayload<RefreshResponse>(
    response,
    "Failed to refresh",
  );

  if (payload.refreshToken) {
    Cookies.set("refreshToken", payload.refreshToken, {
      secure: window.location.protocol === "https:",
      sameSite: "lax",
    });
  }
  if (payload.accessToken) {
    localStorage.setItem("accessToken", payload.accessToken);
  }
  return payload.accessToken;
};
