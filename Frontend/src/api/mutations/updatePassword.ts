import { AUTH_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";

export interface UpdatePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export async function updatePassword(
  data: UpdatePasswordRequest
): Promise<boolean> {
  const response = await fetchWithAuth(
    `${AUTH_MICROSERVICE_URL}/auth/updatePassword`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.payload.message || "Failed to update password");
  }

  return result.payload;
}
