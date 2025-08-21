import { BaseResponse } from "@/types/responses/BaseResponse";
import { fetchWithAuth } from "../fetchWithAuth";
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

  const data = (await response.json()) as BaseResponse<UserLanguage[]>;
  if (!data.success) {
    throw new Error("Failed to fetch available languages");
  }

  return data.payload;
}
