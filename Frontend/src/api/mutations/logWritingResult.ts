import { BRIDGE_MICROSERVICE_URL } from "../consts";
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

/**
 * Tell Bridge whether the user beat the writing task that was just
 * generated. Bridge writes a TaskHistoryEntry whose score is 100 if
 * correct or 0 if not — the next /writing/adaptive call sees those
 * outcomes and decides what to drill (or stop drilling).
 */
export async function logWritingResult(
  input: LogWritingResultRequest,
): Promise<void> {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/writing/result`,
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
