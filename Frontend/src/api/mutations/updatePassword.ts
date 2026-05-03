import { AUTH_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

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

  return parseApiPayload<boolean>(response, "Failed to update password");
}
