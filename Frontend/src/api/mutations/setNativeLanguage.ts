import { BaseResponse } from "@/types/responses/BaseResponse";
import { USER_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";

export async function setNativeLanguage(languageId: string): Promise<boolean> {
  const response = await fetchWithAuth(
    `${USER_MICROSERVICE_URL}/setNativeLanguage`,
    {
      method: "POST",
      body: JSON.stringify({ languageId }),
    }
  );

  const data = (await response.json()) as BaseResponse<boolean>;
  if (!data.success) {
    throw new Error("An error occurred while setting the native language");
  }

  return data.payload;
}
