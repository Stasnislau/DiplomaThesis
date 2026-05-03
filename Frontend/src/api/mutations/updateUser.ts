import { USER_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export interface UpdateUserRequest {
  name: string;
  surname: string;
  email?: string;
}

export async function updateUser(data: UpdateUserRequest): Promise<boolean> {
  const response = await fetchWithAuth(`${USER_MICROSERVICE_URL}/updateUser`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

  return parseApiPayload<boolean>(response, "Failed to update user");
}
