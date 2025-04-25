import { USER_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";

export interface AddUserLanguageRequest {
  languageId: string;
  level: string;
}

export async function addUserLanguage(data: AddUserLanguageRequest): Promise<boolean> {
  const response = await fetchWithAuth(`${USER_MICROSERVICE_URL}/addUserLanguage`, {
    method: "POST",
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error("Failed to add language level");
  }

  return result.payload;
} 