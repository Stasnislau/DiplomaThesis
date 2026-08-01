import { AI_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiResponse } from "../parseApiResponse";

export interface LogWritingResultRequest {
  language: string;
  level: string;
  flavour: "multiple_choice" | "fill_in_the_blank";
  isCorrect: boolean;
  topic?: string | null;
  targetedWeaknesses?: string[];
  questionPreview?: string;
}

export async function logWritingResult(
  input: LogWritingResultRequest,
): Promise<void> {
  const response = await fetchWithAuth(
    `${AI_MICROSERVICE_URL}/writing/result`,
    {
      method: "POST",
      body: JSON.stringify({
        language: input.language,
        level: input.level,
        flavour: input.flavour,
        isCorrect: input.isCorrect,
        topic: input.topic ?? null,
        targetedWeaknesses: input.targetedWeaknesses ?? [],
        questionPreview: input.questionPreview ?? "",
      }),
    },
  );
  await parseApiResponse(response, "Failed to log writing result");
}
