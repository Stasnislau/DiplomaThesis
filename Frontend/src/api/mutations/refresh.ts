import { AUTH_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

interface RefreshResponse {
  accessToken: string;
}

/**
 * Ask Auth for a new access token. The refresh token rides along in
 * the `refreshToken` httpOnly cookie set at login — the body is empty
 * by design. fetchWithAuth uses `credentials: "include"` so the
 * cookie is sent across origins (gateway → caddy → browser).
 */
export const refresh = async () => {
  const response = await fetchWithAuth(
    `${AUTH_MICROSERVICE_URL}/auth/refresh`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );

  const payload = await parseApiPayload<RefreshResponse>(
    response,
    "Failed to refresh",
  );

  if (payload.accessToken) {
    localStorage.setItem("accessToken", payload.accessToken);
  }
  return payload.accessToken;
};
