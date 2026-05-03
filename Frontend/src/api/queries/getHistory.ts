import { BaseResponse } from "@/types/responses/BaseResponse";
import { USER_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";

export type TaskHistoryType =
  | "placement"
  | "speaking"
  | "listening"
  | "writing"
  | "materials"
  | "lesson";

export interface TaskHistoryEntry {
  id: string;
  userId: string;
  taskType: TaskHistoryType | string;
  title: string;
  score: number | null;
  language: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface GetHistoryParams {
  type?: TaskHistoryType;
  limit?: number;
}

export const getHistory = async (
  params: GetHistoryParams = {},
): Promise<TaskHistoryEntry[]> => {
  const url = new URL(`${USER_MICROSERVICE_URL}/history`);
  if (params.type) url.searchParams.set("type", params.type);
  if (params.limit) url.searchParams.set("limit", String(params.limit));

  const response = await fetchWithAuth(url.toString(), { method: "GET" });
  if (!response.ok) {
    throw new Error("Failed to fetch history");
  }
  const data = (await response.json()) as BaseResponse<TaskHistoryEntry[]>;
  if (!data.success) {
    throw new Error(data?.errors?.[0] || "Failed to fetch history");
  }
  return data.payload;
};
