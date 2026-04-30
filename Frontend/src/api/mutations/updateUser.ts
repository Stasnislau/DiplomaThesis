import { USER_MICROSERVICE_URL } from "../consts";
import { extractApiError } from "../extractApiError";
import { fetchWithAuth } from "../fetchWithAuth";

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

  const result = await response.json();

  if (!result.success) {
    throw new Error(extractApiError(result, "Failed to update user"));
  }

  return result.payload;
}
