import { BaseResponse } from "@/types/responses/BaseResponse";
import { USER_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { UserMaterial } from "../mutations/saveMaterial";

export const getUserMaterials = async (): Promise<UserMaterial[]> => {
  const response = await fetchWithAuth(`${USER_MICROSERVICE_URL}/materials`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user materials");
  }

  const data = (await response.json()) as BaseResponse<UserMaterial[]>;
  if (!data.success) {
    throw new Error(data?.errors?.[0] || "Failed to fetch user materials");
  }

  return data.payload;
};

