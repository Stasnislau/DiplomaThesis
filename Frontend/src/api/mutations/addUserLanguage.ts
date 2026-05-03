import { USER_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export interface AddUserLanguageRequest {
  languageId: string;
  level: string;
}

export async function addUserLanguage(data: AddUserLanguageRequest): Promise<boolean> {
  const response = await fetchWithAuth(`${USER_MICROSERVICE_URL}/addUserLanguage`, {
    method: "POST",
    body: JSON.stringify(data),
  });

  return parseApiPayload<boolean>(response, "Failed to add language level");
}
