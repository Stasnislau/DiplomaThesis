import { AUTH_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiResponse } from "../parseApiResponse";

export async function updateUserRole(data: {
  id: string;
  role: "USER" | "ADMIN";
}): Promise<boolean> {
  const response = await fetchWithAuth(`${AUTH_MICROSERVICE_URL}/auth/updateRole`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

  await parseApiResponse(response, "Failed to update user role");
  return true;
}
