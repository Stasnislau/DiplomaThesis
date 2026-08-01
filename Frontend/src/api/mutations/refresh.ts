import { AUTH_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

interface RefreshResponse {
  accessToken: string;
}

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
