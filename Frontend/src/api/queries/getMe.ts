import { fetchWithAuth } from "@/api/fetchWithAuth";
import { parseApiPayload } from "@/api/parseApiResponse";
import { USER_MICROSERVICE_URL } from "@/api/consts";
import { User } from "@/types/models/User";

export async function getMe(): Promise<User> {
  const url = new URL(`${USER_MICROSERVICE_URL}/me`);

  const response = await fetchWithAuth(url, {
    method: "GET",
  });

  return parseApiPayload<User>(response, "Failed to fetch user data");
}
