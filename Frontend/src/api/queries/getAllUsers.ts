import { fetchWithAuth } from "@/api/fetchWithAuth";
import { BaseResponse } from "@/types/responses/BaseResponse";
import { USER_MICROSERVICE_URL } from "@/api/consts";
import { User } from "@/types/models/User";

export async function getAllUsers(): Promise<User[]> {
  const url = new URL(`${USER_MICROSERVICE_URL}/users`);

  const response = await fetchWithAuth(url, {
    method: "GET",
  });

  const data = (await response.json()) as BaseResponse<User[]>;
  if (!data.success) {
    throw new Error("Failed to fetch user data");
  }

  return data.payload;
}
