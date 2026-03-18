import { AUTH_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";

export async function updateUserRole(data: {
  id: string;
  role: "USER" | "ADMIN";
}): Promise<boolean> {
  const response = await fetchWithAuth(`${AUTH_MICROSERVICE_URL}/auth/updateRole`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.payload?.message || "Failed to update user role");
  }

  return true;
}
