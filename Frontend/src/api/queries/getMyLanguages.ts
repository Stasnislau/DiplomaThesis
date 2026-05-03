import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";
import { USER_MICROSERVICE_URL } from "../consts";
import { UserLanguage } from "@/types/models/Language";

export async function getMyLanguages(): Promise<UserLanguage[]> {
  const url = new URL(`${USER_MICROSERVICE_URL}/languages`);
  const response = await fetchWithAuth(url.toString(), {
    method: "GET",
  });

  return parseApiPayload<UserLanguage[]>(
    response,
    "Failed to fetch available languages",
  );
}
