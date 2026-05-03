import { USER_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

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

  return parseApiPayload<UserMaterial>(response, "Failed to save material");
};

