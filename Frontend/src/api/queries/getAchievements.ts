import { USER_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

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

  return parseApiPayload<Achievement[]>(
    response,
    "Failed to fetch achievements",
  );
}
