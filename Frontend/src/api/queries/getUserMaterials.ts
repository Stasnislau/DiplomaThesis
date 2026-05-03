import { USER_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";
import { UserMaterial } from "../mutations/saveMaterial";

export const getUserMaterials = async (): Promise<UserMaterial[]> => {
  const response = await fetchWithAuth(`${USER_MICROSERVICE_URL}/materials`, {
    method: "GET",
  });

  return parseApiPayload<UserMaterial[]>(
    response,
    "Failed to fetch user materials",
  );
};

