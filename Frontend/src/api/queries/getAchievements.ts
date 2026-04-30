import { BaseResponse } from "@/types/responses/BaseResponse";
import { USER_MICROSERVICE_URL } from "../consts";
import { extractApiError } from "../extractApiError";
import { fetchWithAuth } from "../fetchWithAuth";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  maxProgress: number;
  progress: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
}

export async function getAchievements(): Promise<Achievement[]> {
  const response = await fetchWithAuth(
    `${USER_MICROSERVICE_URL}/achievements`,
    {
      method: "GET",
    },
  );

  const data = (await response.json()) as BaseResponse<Achievement[]>;

  if (!data.success) {
    throw new Error(extractApiError(data, "Failed to fetch achievements"));
  }

  return data.payload;
}
