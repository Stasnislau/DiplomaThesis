import { AUTH_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiResponse } from "../parseApiResponse";

export async function deleteUser(id: string): Promise<boolean> {
  const response = await fetchWithAuth(
    `${AUTH_MICROSERVICE_URL}/auth/deleteUser/${id}`,
    {
      method: "DELETE",
    }
  );

  await parseApiResponse(response, "Failed to delete user");
  return true;
}
