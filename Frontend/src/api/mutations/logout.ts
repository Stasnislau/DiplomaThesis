import { AUTH_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export const logout = async () => {
  const response = await fetchWithAuth(`${AUTH_MICROSERVICE_URL}/auth/logout`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  return parseApiPayload<string>(response, "Failed to logout");
};
