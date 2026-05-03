import { AUTH_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiResponse } from "../parseApiResponse";

export async function resetPassword(email: string): Promise<boolean> {
  const response = await fetchWithAuth(
    `${AUTH_MICROSERVICE_URL}/auth/resetPassword`,
    {
      method: "POST",
      body: JSON.stringify({ email }),
    }
  );

  await parseApiResponse(response, "Failed to reset password");
  return true;
}
