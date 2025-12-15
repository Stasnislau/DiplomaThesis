import { BaseResponse } from "@/types/responses/BaseResponse";
import { USER_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";

interface AnalyzedType {
  type: string;
  example: string;
}

export interface SaveMaterialRequest {
  filename: string;
  analyzedTypes: AnalyzedType[];
}

export interface UserMaterial {
  id: string;
  userId: string;
  filename: string;
  analyzedTypes: AnalyzedType[];
  createdAt: string;
}

export const saveMaterial = async (input: SaveMaterialRequest): Promise<UserMaterial> => {
  const response = await fetchWithAuth(`${USER_MICROSERVICE_URL}/materials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const data = (await response.json()) as BaseResponse<UserMaterial>;
  if (!data.success) {
    throw new Error(data?.errors?.[0] || "Failed to save material");
  }

  return data.payload;
};

