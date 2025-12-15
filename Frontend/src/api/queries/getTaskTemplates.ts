import { fetchWithAuth } from "../fetchWithAuth";
import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { BaseResponse } from "@/types/responses/BaseResponse";
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

  if (!response.ok) {
    throw new Error("Failed to fetch task templates");
  }

  const data = (await response.json()) as BaseResponse<TaskTemplate[]>;
  if (!data.success || !data.payload) {
    throw new Error("Failed to fetch task templates");
  }

  return data.payload;
};
