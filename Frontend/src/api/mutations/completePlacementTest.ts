import { USER_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiResponse } from "../parseApiResponse";

export interface CompletePlacementTestRequest {
  languageId: string;
  level: string;
  score: number;
  feedback: unknown;
}

export const completePlacementTest = async (
  input: CompletePlacementTestRequest,
): Promise<boolean> => {
  const response = await fetchWithAuth(
    `${USER_MICROSERVICE_URL}/placement-test/complete`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  await parseApiResponse(response, "Failed to complete placement test");
  return true;
};
