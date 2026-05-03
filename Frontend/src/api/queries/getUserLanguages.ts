import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";
import { USER_MICROSERVICE_URL } from "../consts";
import { UserLanguage } from "@/types/models/Language";

export async function getUserLanguages(
  userId: string
): Promise<UserLanguage[]> {
  const url = new URL(`${USER_MICROSERVICE_URL}/languages`);
  url.searchParams.set("userId", userId);
  const response = await fetchWithAuth(url.toString(), {
    method: "GET",
  });

  return parseApiPayload<UserLanguage[]>(
    response,
    "Failed to fetch available languages",
  );
}
