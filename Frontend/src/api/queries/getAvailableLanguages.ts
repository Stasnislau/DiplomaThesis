import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";
import { Language } from "../hooks/useAvailableLanguages";
import { USER_MICROSERVICE_URL } from "../consts";

export async function getAvailableLanguages(): Promise<Language[]> {
  const response = await fetchWithAuth(`${USER_MICROSERVICE_URL}/languages`, {
    method: "GET",
  });

  return parseApiPayload<Language[]>(
    response,
    "Failed to fetch available languages",
  );
}
