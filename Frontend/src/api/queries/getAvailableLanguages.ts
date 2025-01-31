import { BaseResponse } from "@/types/responses/BaseResponse";
import { fetchWithAuth } from "../fetchWithAuth";
import { Language } from "../hooks/useAvailableLanguages";
import { USER_MICROSERVICE_URL } from "../consts";

export async function getAvailableLanguages(): Promise<Language[]> {
  const response = await fetchWithAuth(`${USER_MICROSERVICE_URL}/languages`, {
    method: "GET",
  });

  const data = (await response.json()) as BaseResponse<Language[]>;
  if (!data.success) {
    throw new Error("Failed to fetch available languages");
  }

  return data.payload;
}
