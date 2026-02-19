import { BRIDGE_MICROSERVICE_URL } from "@/api/consts";
import { BaseResponse } from "@/types/responses/BaseResponse";
import { fetchWithAuth } from "@/api/fetchWithAuth";
import { useQuery } from "@tanstack/react-query";

export interface Lesson {
  id: string;
  title: string;
  topic: string;
  description: string;
  status: "LOCKED" | "UNLOCKED" | "COMPLETED";
  type:
    | "theory"
    | "vocabulary"
    | "grammar"
    | "practice"
    | "listening"
    | "speaking";
  keywords: string[];
  durationMinutes: number;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  level: string;
  theme: string;
  lessons: Lesson[];
  progress: number;
}

export interface LearningPath {
  language: string;
  userLevel: string;
  modules: Module[];
}

export const useLearningPath = (language: string, level: string) => {
  return useQuery({
    queryKey: ["learning-path", language, level],
    queryFn: async () => {
      const url = new URL(`${BRIDGE_MICROSERVICE_URL}/learning-path`);
      url.searchParams.append("language", language);
      url.searchParams.append("level", level);

      const response = await fetchWithAuth(url.toString(), {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch learning path");
      }

      const data = (await response.json()) as BaseResponse<LearningPath>;
      return data.payload;
    },
    enabled: !!language && !!level,
  });
};
