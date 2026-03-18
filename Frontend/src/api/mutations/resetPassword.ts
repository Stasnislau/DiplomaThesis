import { AUTH_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";

export async function resetPassword(email: string): Promise<boolean> {
  const response = await fetchWithAuth(
    `${AUTH_MICROSERVICE_URL}/auth/resetPassword`,
    {
      method: "POST",
      body: JSON.stringify({ email }),
    }
  );

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.payload?.message || "Failed to reset password");
  }

  return true;
}
