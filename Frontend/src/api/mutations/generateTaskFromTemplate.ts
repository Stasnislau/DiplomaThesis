import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { TaskData } from "@/types/responses/TaskResponse";
import { fetchWithAuth } from "../fetchWithAuth";

export interface GenerateTaskFromTemplateRequest {
  templateId?: string;
  templateText?: string;
  language?: string;
  level?: string;
}

// ... (existing imports)

export interface GeneratedTaskResponse {
  template_id?: string | null;
  template_text?: string | null;
  task: TaskData;
}

export const generateTaskFromTemplate = async (
  payload: GenerateTaskFromTemplateRequest,
): Promise<GeneratedTaskResponse> => {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/materials/templates/generate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        templateId: payload.templateId,
        templateText: payload.templateText,
        language: payload.language,
        level: payload.level,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to generate task");
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error("Failed to generate task");
  }

  return data.payload as GeneratedTaskResponse;
};
