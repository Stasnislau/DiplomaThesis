import { AUTH_MICROSERVICE_URL } from "../consts";
import { getRefreshToken } from "@/utils/getRefreshToken";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export const logout = async () => {
  const refreshToken = getRefreshToken();
  const response = await fetchWithAuth(`${AUTH_MICROSERVICE_URL}/auth/logout`, {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });

  return parseApiPayload<string>(response, "Failed to logout");
};
