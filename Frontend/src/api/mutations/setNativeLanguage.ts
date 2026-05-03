import { USER_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export async function setNativeLanguage(languageId: string): Promise<boolean> {
  const response = await fetchWithAuth(
    `${USER_MICROSERVICE_URL}/setNativeLanguage`,
    {
      method: "POST",
      body: JSON.stringify({ languageId }),
    }
  );

  return parseApiPayload<boolean>(
    response,
    "An error occurred while setting the native language",
  );
}
