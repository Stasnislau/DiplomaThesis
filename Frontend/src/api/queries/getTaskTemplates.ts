import { fetchWithAuth } from "../fetchWithAuth";
import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { parseApiPayload } from "../parseApiResponse";
import { TaskTemplate } from "@/types/models/TaskTemplate";

export const getTaskTemplates = async (
  query: string,
  limit = 20
): Promise<TaskTemplate[]> => {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
  });

  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/materials/templates?${params.toString()}`,
    {
      method: "GET",
    }
  );

  return parseApiPayload<TaskTemplate[]>(
    response,
    "Failed to fetch task templates",
  );
};
