import { USER_MICROSERVICE_URL } from "../consts";
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
    const errors = result.payload?.errors as string[] | undefined;
    const message = result.payload?.message as string | undefined;
    throw new Error(
      errors?.join("\n") || message || "Failed to update user"
    );
  }

  return result.payload;
}
