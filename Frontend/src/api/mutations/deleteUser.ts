import { AUTH_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";

export async function deleteUser(id: string): Promise<boolean> {
  const response = await fetchWithAuth(
    `${AUTH_MICROSERVICE_URL}/auth/deleteUser/${id}`,
    {
      method: "DELETE",
    }
  );

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.payload?.message || "Failed to delete user");
  }

  return true;
}
